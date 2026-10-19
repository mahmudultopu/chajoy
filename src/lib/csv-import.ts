import Papa from "papaparse";
import { and, eq } from "drizzle-orm";
import { db, schema, type Tx } from "@/lib/db";
import { parseTakaInput, paisaToDecimalString } from "@/lib/money";
import { isInBangladesh } from "@/lib/geo";
import { DAYS, validateHours } from "@/lib/hours";
import type { OpeningHours } from "@/lib/db/schema";

// CSV import for products, branches and branch inventory.
// Every import is validated in full first; if any row has an error nothing is
// written. Apply runs in a single transaction.

export type ImportKind = "products" | "branches" | "inventory";
export type RowError = { row: number; message: string };
export type ImportReport = { kind: ImportKind; rows: number; errors: RowError[]; created: number; updated: number; applied: boolean };

export const TEMPLATES: Record<ImportKind, string[]> = {
  products: ["slug", "name", "name_zh", "category", "size", "size_label", "volume_ml", "price_bdt", "status", "featured", "description"],
  branches: ["slug", "name", "area", "address_line", "city", "latitude", "longitude", "location_precision", "phone", "opening_hours", "is_active"],
  inventory: ["branch_slug", "product_slug", "size", "available", "price_bdt", "track_stock", "stock_qty"],
};

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const yes = (v: string) => ["1", "true", "yes", "y"].includes(v.trim().toLowerCase());
const isBool = (v: string) => ["", "1", "0", "true", "false", "yes", "no", "y", "n"].includes(v.trim().toLowerCase());

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase() });
  return { headers: res.meta.fields ?? [], rows: res.data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "").trim()]))) };
}

/** "mon=10:00-23:00; tue=closed" -> OpeningHours */
export function parseHoursSpec(spec: string): OpeningHours | null | "invalid" {
  if (!spec.trim()) return null;
  const out: OpeningHours = {};
  for (const part of spec.split(/[;|]/).map((s) => s.trim()).filter(Boolean)) {
    const m = /^(sun|mon|tue|wed|thu|fri|sat)\s*=\s*(closed|(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}))$/i.exec(part);
    if (!m) return "invalid";
    const d = m[1].toLowerCase() as (typeof DAYS)[number];
    out[d] = m[2].toLowerCase() === "closed" ? [] : [[m[3].padStart(5, "0"), m[4].padStart(5, "0")]];
  }
  return validateHours(out) ? out : "invalid";
}

export async function runImport(kind: ImportKind, text: string, opts: { apply: boolean }): Promise<ImportReport> {
  const { headers, rows } = parseCsv(text);
  const report: ImportReport = { kind, rows: rows.length, errors: [], created: 0, updated: 0, applied: false };
  const required = kind === "products" ? ["slug", "name", "category", "size", "price_bdt"] : kind === "branches" ? ["slug", "name", "area"] : ["branch_slug", "product_slug", "size"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) {
    report.errors.push({ row: 1, message: `Missing column(s): ${missing.join(", ")}. Expected: ${TEMPLATES[kind].join(",")}` });
    return report;
  }
  if (!rows.length) {
    report.errors.push({ row: 1, message: "The file has no data rows." });
    return report;
  }
  if (rows.length > 5000) {
    report.errors.push({ row: 1, message: "Import at most 5,000 rows at a time." });
    return report;
  }

  const plan: ((tx: Tx) => Promise<void>)[] = [];
  const categories = await db.select().from(schema.productCategories);
  const products = await db.select().from(schema.products);
  const variants = await db.select().from(schema.productVariants);
  const branches = await db.select().from(schema.branches);

  rows.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const err = (m: string) => report.errors.push({ row: rowNo, message: m });

    if (kind === "products") {
      if (!slugRe.test(r.slug)) return err(`slug "${r.slug}" must be lowercase letters, numbers and dashes`);
      if (!r.name || r.name.length > 120) return err("name is required (max 120 chars)");
      const cat = categories.find((c) => c.slug === r.category);
      if (!cat) return err(`unknown category "${r.category}" (use one of: ${categories.map((c) => c.slug).join(", ")})`);
      const size = r.size.toUpperCase();
      if (!/^(S|M|L|ONE|[A-Z0-9]{1,6})$/.test(size)) return err(`invalid size "${r.size}"`);
      const price = parseTakaInput(r.price_bdt);
      if (price === null || price <= 0) return err(`invalid price_bdt "${r.price_bdt}"`);
      const status = (r.status || "active").toLowerCase();
      if (!["active", "inactive", "unavailable"].includes(status)) return err(`status must be active, inactive or unavailable`);
      if (r.featured && !isBool(r.featured)) return err("featured must be yes/no");
      const volume = r.volume_ml ? Number(r.volume_ml) : null;
      if (volume !== null && (!Number.isInteger(volume) || volume <= 0)) return err("volume_ml must be a whole number");
      const existing = products.find((p) => p.slug === r.slug);
      const existingVar = existing ? variants.find((v) => v.productId === existing.id && v.sizeCode === size) : undefined;
      if (existing) report.updated++;
      else report.created++;
      plan.push(async (tx) => {
        let pid = existing?.id;
        const fields = {
          name: r.name,
          nameZh: r.name_zh || null,
          categoryId: cat.id,
          status: status as "active" | "inactive" | "unavailable",
          ...(r.featured ? { isFeatured: yes(r.featured) } : {}),
          ...(r.description ? { description: r.description } : {}),
          updatedAt: new Date(),
        };
        if (pid) await tx.update(schema.products).set(fields).where(eq(schema.products.id, pid));
        else {
          const [found] = await tx.select().from(schema.products).where(eq(schema.products.slug, r.slug));
          if (found) {
            pid = found.id;
            await tx.update(schema.products).set(fields).where(eq(schema.products.id, pid));
          } else {
            pid = (await tx.insert(schema.products).values({ slug: r.slug, ...fields, isAddon: cat.isAddonCategory, verification: { status: "needs_verification", source: "CSV import" } }).returning())[0].id;
            const bs = await tx.select({ id: schema.branches.id }).from(schema.branches);
            if (bs.length) await tx.insert(schema.branchProducts).values(bs.map((b) => ({ branchId: b.id, productId: pid!, isAvailable: false }))).onConflictDoNothing();
          }
        }
        const label = r.size_label || (size === "ONE" ? "Regular" : size);
        if (existingVar) await tx.update(schema.productVariants).set({ pricePaisa: price, label, volumeMl: volume, isActive: true, updatedAt: new Date() }).where(eq(schema.productVariants.id, existingVar.id));
        else
          await tx
            .insert(schema.productVariants)
            .values({ productId: pid!, sizeCode: size, label, volumeMl: volume, pricePaisa: price })
            .onConflictDoUpdate({ target: [schema.productVariants.productId, schema.productVariants.sizeCode], set: { pricePaisa: price, label, volumeMl: volume, isActive: true } });
      });
    }

    if (kind === "branches") {
      if (!slugRe.test(r.slug)) return err(`slug "${r.slug}" must be lowercase letters, numbers and dashes`);
      if (!r.name || !r.area) return err("name and area are required");
      const lat = r.latitude ? Number(r.latitude) : null;
      const lng = r.longitude ? Number(r.longitude) : null;
      if ((lat === null) !== (lng === null)) return err("give both latitude and longitude, or neither");
      if (lat !== null && lng !== null && (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInBangladesh({ lat, lng }))) return err("latitude/longitude must be a point in Bangladesh");
      const precision = (r.location_precision || (lat !== null ? "approximate" : "unknown")).toLowerCase();
      if (!["exact", "approximate", "unknown"].includes(precision)) return err("location_precision must be exact, approximate or unknown");
      const hours = parseHoursSpec(r.opening_hours ?? "");
      if (hours === "invalid") return err(`opening_hours "${r.opening_hours}" — use e.g. "mon=10:00-23:00; fri=closed"`);
      if (r.is_active && !isBool(r.is_active)) return err("is_active must be yes/no");
      const existing = branches.find((b) => b.slug === r.slug);
      if (existing) report.updated++;
      else report.created++;
      plan.push(async (tx) => {
        const fields = {
          name: r.name,
          area: r.area,
          addressLine: r.address_line || null,
          city: r.city || "Dhaka",
          latitude: lat,
          longitude: lng,
          locationPrecision: precision as "exact" | "approximate" | "unknown",
          phone: r.phone || null,
          ...(hours ? { openingHours: hours } : {}),
          ...(r.is_active ? { isActive: yes(r.is_active) } : {}),
          updatedAt: new Date(),
        };
        if (existing) await tx.update(schema.branches).set(fields).where(eq(schema.branches.id, existing.id));
        else {
          const [b] = await tx.insert(schema.branches).values({ slug: r.slug, ...fields }).returning();
          const ps = await tx.select({ id: schema.products.id }).from(schema.products);
          if (ps.length) await tx.insert(schema.branchProducts).values(ps.map((p) => ({ branchId: b.id, productId: p.id, isAvailable: false }))).onConflictDoNothing();
        }
      });
    }

    if (kind === "inventory") {
      const b = branches.find((x) => x.slug === r.branch_slug);
      if (!b) return err(`unknown branch_slug "${r.branch_slug}"`);
      const p = products.find((x) => x.slug === r.product_slug);
      if (!p) return err(`unknown product_slug "${r.product_slug}"`);
      const size = r.size.toUpperCase();
      const v = variants.find((x) => x.productId === p.id && x.sizeCode === size);
      if (!v) return err(`${p.slug} has no size "${r.size}"`);
      for (const k of ["available", "track_stock"] as const) if (r[k] && !isBool(r[k])) return err(`${k} must be yes/no`);
      const price = r.price_bdt ? parseTakaInput(r.price_bdt) : null;
      if (r.price_bdt && (price === null || price <= 0)) return err(`invalid price_bdt "${r.price_bdt}"`);
      const qty = r.stock_qty ? Number(r.stock_qty) : null;
      if (qty !== null && (!Number.isInteger(qty) || qty < 0)) return err("stock_qty must be a whole number ≥ 0");
      report.updated++;
      plan.push(async (tx) => {
        if (r.available)
          await tx
            .insert(schema.branchProducts)
            .values({ branchId: b.id, productId: p.id, isAvailable: yes(r.available) })
            .onConflictDoUpdate({ target: [schema.branchProducts.branchId, schema.branchProducts.productId], set: { isAvailable: yes(r.available), updatedAt: new Date() } });
        const inv = { pricePaisa: price, trackStock: r.track_stock ? yes(r.track_stock) : false, stockQty: qty };
        await tx
          .insert(schema.branchInventory)
          .values({ branchId: b.id, variantId: v.id, ...inv })
          .onConflictDoUpdate({ target: [schema.branchInventory.branchId, schema.branchInventory.variantId], set: { ...inv, updatedAt: new Date() } });
      });
    }
  });

  if (report.errors.length || !opts.apply) return report;
  await db.transaction(async (tx) => {
    for (const step of plan) await step(tx);
  });
  report.applied = true;
  return report;
}

// ------------------------------------------------------------------ export

const csv = (rows: (string | number | null | undefined)[][]) => Papa.unparse(rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c)))));

export async function exportCsv(kind: ImportKind): Promise<string> {
  if (kind === "products") {
    const rows = await db
      .select({ p: schema.products, v: schema.productVariants, c: schema.productCategories })
      .from(schema.productVariants)
      .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
      .innerJoin(schema.productCategories, eq(schema.productCategories.id, schema.products.categoryId))
      .orderBy(schema.products.sortOrder, schema.productVariants.sortOrder);
    return csv([TEMPLATES.products, ...rows.map(({ p, v, c }) => [p.slug, p.name, p.nameZh, c.slug, v.sizeCode, v.label, v.volumeMl, paisaToDecimalString(v.pricePaisa), p.status, p.isFeatured ? "yes" : "no", p.description])]);
  }
  if (kind === "branches") {
    const rows = await db.select().from(schema.branches).orderBy(schema.branches.name);
    const hours = (h: OpeningHours | null) => (h ? DAYS.filter((d) => h[d]).map((d) => `${d}=${h[d]!.length ? `${h[d]![0][0]}-${h[d]![0][1]}` : "closed"}`).join("; ") : "");
    return csv([TEMPLATES.branches, ...rows.map((b) => [b.slug, b.name, b.area, b.addressLine, b.city, b.latitude, b.longitude, b.locationPrecision, b.phone, hours(b.openingHours), b.isActive ? "yes" : "no"])]);
  }
  const rows = await db
    .select({ b: schema.branches, p: schema.products, v: schema.productVariants, bp: schema.branchProducts, inv: schema.branchInventory })
    .from(schema.branchProducts)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.branchProducts.branchId))
    .innerJoin(schema.products, eq(schema.products.id, schema.branchProducts.productId))
    .innerJoin(schema.productVariants, eq(schema.productVariants.productId, schema.products.id))
    .leftJoin(schema.branchInventory, and(eq(schema.branchInventory.branchId, schema.branches.id), eq(schema.branchInventory.variantId, schema.productVariants.id)))
    .orderBy(schema.branches.name, schema.products.sortOrder);
  return csv([
    TEMPLATES.inventory,
    ...rows.map(({ b, p, v, bp, inv }) => [b.slug, p.slug, v.sizeCode, bp.isAvailable ? "yes" : "no", inv?.pricePaisa ? paisaToDecimalString(inv.pricePaisa) : "", inv?.trackStock ? "yes" : "no", inv?.stockQty ?? ""]),
  ]);
}
