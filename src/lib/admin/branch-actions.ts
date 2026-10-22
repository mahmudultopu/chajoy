/**
 * Server actions for managing branches: details, opening hours, location,
 * fulfilment settings and the per-branch menu (availability and price overrides).
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import type { OpeningHours } from "@/lib/db/schema";
import { asActor, can } from "@/lib/auth/admin";
import { audit, diffFields } from "@/lib/audit";
import { DAYS, validateHours } from "@/lib/hours";
import { parseTakaInput } from "@/lib/money";
import { isInBangladesh } from "@/lib/geo";
import { HttpError } from "@/lib/errors";
import { run, bool, optNum, optStr, str } from "./run";
import type { ActionResult } from "@/components/admin/ui";

const money = (fd: FormData, k: string) => {
  const s = str(fd, k);
  if (!s) return null;
  const p = parseTakaInput(s);
  if (p === null) throw new HttpError(422, `${k}: enter an amount in taka, e.g. 60`);
  return p;
};

/**
 * Creates or updates a branch from the admin form after validating location, hours and delivery settings.
 */
export async function saveBranch(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("branches.manage", async (admin, ip) => {
    const id = Number(str(fd, "id")) || null;
    const lat = optNum(fd, "latitude");
    const lng = optNum(fd, "longitude");
    if ((lat === null) !== (lng === null)) throw new HttpError(422, "Enter both latitude and longitude, or neither.");
    if (lat !== null && lng !== null && !isInBangladesh({ lat, lng })) throw new HttpError(422, "That pin isn't in Bangladesh — check latitude/longitude.");

    const hours: OpeningHours = {};
    let anyHours = false;
    for (const d of DAYS) {
      if (bool(fd, `hours.${d}.closed`)) {
        hours[d] = [];
        continue;
      }
      const open = str(fd, `hours.${d}.open`);
      const close = str(fd, `hours.${d}.close`);
      if (open && close) {
        hours[d] = [[open, close]];
        anyHours = true;
      }
    }
    if (anyHours && !validateHours(hours)) throw new HttpError(422, "Opening hours must be HH:MM (24-hour) and open ≠ close.");

    const values = z
      .object({
        name: z.string().min(2).max(80),
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        area: z.string().min(2).max(60),
        addressLine: z.string().max(200).nullable(),
        city: z.string().min(2).max(60),
        phone: z.string().max(30).nullable(),
        locationPrecision: z.enum(["exact", "approximate", "unknown"]),
        locationSource: z.string().max(300).nullable(),
        closureNote: z.string().max(200).nullable(),
        deliveryRadiusKm: z.number().positive().max(30).nullable(),
        prepTimeMinutes: z.number().int().positive().max(240).nullable(),
        deliveryTimeMinutes: z.number().int().positive().max(300).nullable(),
      })
      .parse({
        name: str(fd, "name"),
        slug: str(fd, "slug"),
        area: str(fd, "area"),
        addressLine: optStr(fd, "addressLine"),
        city: str(fd, "city") || "Dhaka",
        phone: optStr(fd, "phone"),
        locationPrecision: lat === null ? "unknown" : str(fd, "locationPrecision") || "approximate",
        locationSource: optStr(fd, "locationSource"),
        closureNote: optStr(fd, "closureNote"),
        deliveryRadiusKm: optNum(fd, "deliveryRadiusKm"),
        prepTimeMinutes: optNum(fd, "prepTimeMinutes"),
        deliveryTimeMinutes: optNum(fd, "deliveryTimeMinutes"),
      });
    const deliveryFeePaisa = money(fd, "deliveryFee");
    const deliveryEnabled = bool(fd, "deliveryEnabled");
    if (deliveryEnabled && (deliveryFeePaisa === null || values.deliveryRadiusKm === null))
      throw new HttpError(422, "To offer delivery, set both a delivery fee and a delivery radius.");
    if (deliveryEnabled && values.locationPrecision !== "exact")
      throw new HttpError(422, "Delivery needs the branch's exact pin (set location precision to “exact” once confirmed).");
    const acceptsOnlineOrders = bool(fd, "acceptsOnlineOrders");
    if (acceptsOnlineOrders && !anyHours) throw new HttpError(422, "Publish opening hours before turning on online orders.");

    const row = {
      ...values,
      latitude: lat,
      longitude: lng,
      addressVerified: bool(fd, "addressVerified"),
      openingHours: anyHours ? hours : null,
      temporarilyClosed: bool(fd, "temporarilyClosed"),
      isActive: bool(fd, "isActive"),
      acceptsOnlineOrders,
      pickupEnabled: bool(fd, "pickupEnabled"),
      deliveryEnabled,
      deliveryFeePaisa,
      minOrderPaisa: money(fd, "minOrder"),
      deliveryAreas: str(fd, "deliveryAreas") ? str(fd, "deliveryAreas").split(",").map((s) => s.trim()).filter(Boolean) : null,
      // any edit by staff replaces sample values with real ones
      isSampleConfig: false,
      verification: { status: bool(fd, "verified") ? ("verified" as const) : ("needs_verification" as const), notes: optStr(fd, "verificationNotes") ?? undefined },
      updatedAt: new Date(),
    };
    if (id) {
      const [prev] = await db.select().from(schema.branches).where(eq(schema.branches.id, id));
      if (!prev) throw new HttpError(404, "Branch not found.");
      await db.update(schema.branches).set(row).where(eq(schema.branches.id, id));
      await audit(asActor(admin), { action: "branch.update", entityType: "branch", entityId: id, summary: `Updated ${row.name}`, diff: diffFields(prev as never, row as never), ip });
      revalidatePath("/", "layout");
      return "Branch saved.";
    }
    const [created] = await db.insert(schema.branches).values(row).returning();
    const products = await db.select({ id: schema.products.id }).from(schema.products);
    if (products.length) await db.insert(schema.branchProducts).values(products.map((p) => ({ branchId: created.id, productId: p.id, isAvailable: false }))).onConflictDoNothing();
    await audit(asActor(admin), { action: "branch.create", entityType: "branch", entityId: created.id, summary: `Created ${created.name}`, ip });
    revalidatePath("/", "layout");
    redirect(`/admin/branches/${created.id}?created=1`);
  });
}

/**
 * The branch menu matrix: availability per product, and per size an optional
 * price override and stock. Branch staff may change availability and stock
 * for their own branch; prices need the branches permission.
 */
export async function saveBranchMenu(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("inventory.manage", async (admin, ip) => {
    const branchId = Number(str(fd, "branchId"));
    if (admin.branchScope && admin.branchScope !== branchId) throw new HttpError(403, "You can only manage your own branch.");
    const canPrice = can(admin, "branches.manage");
    const [branch] = await db.select().from(schema.branches).where(eq(schema.branches.id, branchId));
    if (!branch) throw new HttpError(404, "Branch not found.");
    const productIds = [...new Set(fd.getAll("product").map(Number))];
    const variantIds = [...new Set(fd.getAll("variant").map(Number))];
    let changed = 0;
    await db.transaction(async (tx) => {
      for (const pid of productIds) {
        const available = bool(fd, `p.${pid}.available`);
        const [cur] = await tx.select().from(schema.branchProducts).where(and(eq(schema.branchProducts.branchId, branchId), eq(schema.branchProducts.productId, pid)));
        if (!cur || cur.isAvailable !== available) {
          changed++;
          await tx
            .insert(schema.branchProducts)
            .values({ branchId, productId: pid, isAvailable: available })
            .onConflictDoUpdate({ target: [schema.branchProducts.branchId, schema.branchProducts.productId], set: { isAvailable: available, note: null, updatedAt: new Date() } });
        }
      }
      for (const vid of variantIds) {
        const [cur] = await tx.select().from(schema.branchInventory).where(and(eq(schema.branchInventory.branchId, branchId), eq(schema.branchInventory.variantId, vid)));
        const priceIn = str(fd, `v.${vid}.price`);
        const pricePaisa = priceIn ? parseTakaInput(priceIn) : null;
        if (priceIn && pricePaisa === null) throw new HttpError(422, `Invalid price "${priceIn}".`);
        const trackStock = bool(fd, `v.${vid}.track`);
        const qtyIn = str(fd, `v.${vid}.qty`);
        const stockQty = qtyIn === "" ? null : Math.max(0, Math.trunc(Number(qtyIn)));
        if (qtyIn !== "" && !Number.isFinite(Number(qtyIn))) throw new HttpError(422, "Stock must be a whole number.");
        const next = {
          pricePaisa: canPrice ? pricePaisa : (cur?.pricePaisa ?? null),
          trackStock,
          stockQty: trackStock ? (stockQty ?? 0) : stockQty,
        };
        if (!cur && next.pricePaisa === null && !next.trackStock && next.stockQty === null) continue;
        if (cur && cur.pricePaisa === next.pricePaisa && cur.trackStock === next.trackStock && cur.stockQty === next.stockQty) continue;
        changed++;
        await tx
          .insert(schema.branchInventory)
          .values({ branchId, variantId: vid, ...next })
          .onConflictDoUpdate({ target: [schema.branchInventory.branchId, schema.branchInventory.variantId], set: { ...next, updatedAt: new Date() } });
      }
      await audit(asActor(admin), { action: "branch.menu", entityType: "branch", entityId: branchId, summary: `${branch.name}: ${changed} menu/stock change(s)`, ip }, tx);
    });
    revalidatePath("/", "layout");
    return changed ? `Saved ${changed} change(s) for ${branch.name}.` : "No changes.";
  });
}
