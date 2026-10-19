"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import type { Model3d, ProductOptionConfig } from "@/lib/db/schema";
import { asActor } from "@/lib/auth/admin";
import { audit, diffFields } from "@/lib/audit";
import { parseTakaInput } from "@/lib/money";
import { saveImage } from "@/lib/storage";
import { HttpError } from "@/lib/errors";
import { run, bool, optStr, str } from "./run";
import { httpsUrl } from "@/lib/validation";
import type { ActionResult } from "@/components/admin/ui";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function revalidateStore(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/products/${slug}`);
}

export async function saveProduct(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products.manage", async (admin, ip) => {
    const id = Number(str(fd, "id")) || null;
    const base = z
      .object({
        name: z.string().min(2).max(120),
        slug: z.string().regex(slugRe, "Use lowercase letters, numbers and dashes"),
        nameZh: z.string().max(60).nullable(),
        sku: z.string().max(60).nullable(),
        categoryId: z.coerce.number().int().positive(),
        subcategory: z.string().max(60).nullable(),
        description: z.string().max(2000).nullable(),
        status: z.enum(["active", "inactive", "unavailable"]),
        sortOrder: z.coerce.number().int().min(0).max(100000),
        ingredients: z.string().max(2000).nullable(),
        allergens: z.string().max(1000).nullable(),
        preparationNotes: z.string().max(1000).nullable(),
        model3dUrl: httpsUrl.nullable(),
      })
      .parse({
        name: str(fd, "name"),
        slug: str(fd, "slug"),
        nameZh: optStr(fd, "nameZh"),
        sku: optStr(fd, "sku"),
        categoryId: str(fd, "categoryId"),
        subcategory: optStr(fd, "subcategory"),
        description: optStr(fd, "description"),
        status: str(fd, "status"),
        sortOrder: str(fd, "sortOrder") || "0",
        ingredients: optStr(fd, "ingredients"),
        allergens: optStr(fd, "allergens"),
        preparationNotes: optStr(fd, "preparationNotes"),
        model3dUrl: optStr(fd, "model3dUrl"),
      });
    const optionConfig: ProductOptionConfig = {
      ...(bool(fd, "opt_temperature") ? { temperatures: ["cold", "hot"] as ("cold" | "hot")[] } : {}),
      ...(bool(fd, "opt_flavour") ? { flavours: ["original", "matcha"] as ("original" | "matcha")[] } : {}),
      ...(bool(fd, "opt_sugar") ? { sugar: true } : {}),
      ...(bool(fd, "opt_ice") ? { ice: true } : {}),
      ...(bool(fd, "opt_toppings") ? { toppings: true } : {}),
    };
    const [clash] = await db.select({ id: schema.products.id }).from(schema.products).where(id ? and(eq(schema.products.slug, base.slug), ne(schema.products.id, id)) : eq(schema.products.slug, base.slug));
    if (clash) throw new HttpError(409, "Another product already uses that URL slug.");

    const existing = id ? (await db.select().from(schema.products).where(eq(schema.products.id, id)))[0] : null;
    let model3d: Model3d | null = existing?.model3d ?? null;
    if (base.model3dUrl) model3d = { kind: "glb", url: base.model3dUrl, official: bool(fd, "model3dOfficial") };
    else if (model3d?.kind === "glb") model3d = null;

    const values = {
      name: base.name,
      slug: base.slug,
      nameZh: base.nameZh,
      sku: base.sku,
      categoryId: base.categoryId,
      subcategory: base.subcategory,
      description: base.description,
      status: base.status,
      sortOrder: base.sortOrder,
      isFeatured: bool(fd, "isFeatured"),
      optionConfig,
      ingredients: base.ingredients,
      ingredientsVerified: !!base.ingredients && bool(fd, "ingredientsVerified"),
      allergens: base.allergens,
      allergensVerified: !!base.allergens && bool(fd, "allergensVerified"),
      preparationNotes: base.preparationNotes,
      model3d,
      verification: {
        status: bool(fd, "verified") ? ("verified" as const) : ("needs_verification" as const),
        source: optStr(fd, "verificationSource") ?? undefined,
        notes: optStr(fd, "verificationNotes") ?? undefined,
      },
      updatedAt: new Date(),
    };
    if (existing) {
      await db.update(schema.products).set(values).where(eq(schema.products.id, existing.id));
      await audit(asActor(admin), { action: "product.update", entityType: "product", entityId: existing.id, summary: `Updated ${values.name}`, diff: diffFields(existing as never, values as never), ip });
      revalidateStore(values.slug);
      return "Product saved.";
    }
    const isAddon = (await db.select().from(schema.productCategories).where(eq(schema.productCategories.id, values.categoryId)))[0]?.isAddonCategory ?? false;
    const [created] = await db.insert(schema.products).values({ ...values, isAddon }).returning();
    // New products start unavailable everywhere; enable them per branch on the next screen.
    const branches = await db.select({ id: schema.branches.id }).from(schema.branches);
    if (branches.length) await db.insert(schema.branchProducts).values(branches.map((b) => ({ branchId: b.id, productId: created.id, isAvailable: false }))).onConflictDoNothing();
    await audit(asActor(admin), { action: "product.create", entityType: "product", entityId: created.id, summary: `Created ${created.name}`, ip });
    revalidateStore();
    redirect(`/admin/products/${created.id}?created=1`);
  });
}

export async function saveVariants(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products.manage", async (admin, ip) => {
    const productId = Number(str(fd, "productId"));
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, productId));
    if (!product) throw new HttpError(404, "Product not found.");
    const rows = [...new Set(fd.getAll("row").map(String))];
    const seen = new Set<string>();
    const changes: string[] = [];
    for (const r of rows) {
      const del = bool(fd, `${r}.delete`);
      const vid = Number(str(fd, `${r}.id`)) || null;
      if (del && vid) {
        const used = await db.select({ id: schema.orderItems.id }).from(schema.orderItems).where(eq(schema.orderItems.variantId, vid)).limit(1);
        if (used.length) await db.update(schema.productVariants).set({ isActive: false }).where(eq(schema.productVariants.id, vid));
        else await db.delete(schema.productVariants).where(eq(schema.productVariants.id, vid));
        changes.push(`removed variant ${vid}`);
        continue;
      }
      const sizeCode = str(fd, `${r}.sizeCode`).toUpperCase();
      if (!sizeCode) continue;
      if (!/^(S|M|L|ONE|[A-Z0-9]{1,6})$/.test(sizeCode)) throw new HttpError(422, `Size code "${sizeCode}" is invalid.`);
      if (seen.has(sizeCode)) throw new HttpError(422, `Size ${sizeCode} is listed twice.`);
      seen.add(sizeCode);
      const price = parseTakaInput(str(fd, `${r}.price`));
      if (price === null || price <= 0) throw new HttpError(422, `Enter a price for size ${sizeCode}.`);
      const label = str(fd, `${r}.label`) || sizeCode;
      const volumeMl = Number(str(fd, `${r}.volumeMl`)) || null;
      const isActive = bool(fd, `${r}.isActive`);
      if (vid) {
        const [prev] = await db.select().from(schema.productVariants).where(and(eq(schema.productVariants.id, vid), eq(schema.productVariants.productId, productId)));
        if (!prev) continue;
        await db.update(schema.productVariants).set({ sizeCode, label, volumeMl, pricePaisa: price, isActive, updatedAt: new Date() }).where(eq(schema.productVariants.id, vid));
        if (prev.pricePaisa !== price) changes.push(`${sizeCode} price ${prev.pricePaisa / 100} → ${price / 100}`);
      } else {
        await db.insert(schema.productVariants).values({ productId, sizeCode, label, volumeMl, pricePaisa: price, isActive, sortOrder: { S: 1, M: 2, L: 3 }[sizeCode] ?? 0 });
        changes.push(`added ${sizeCode} at ${price / 100}`);
      }
    }
    await audit(asActor(admin), { action: "product.variants", entityType: "product", entityId: productId, summary: `${product.name}: ${changes.join("; ") || "variants saved"}`, ip });
    revalidateStore(product.slug);
    return "Sizes and prices saved.";
  });
}

export async function uploadProductImage(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products.manage", async (admin, ip) => {
    const productId = Number(str(fd, "productId"));
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, productId));
    if (!product) throw new HttpError(404, "Product not found.");
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new HttpError(422, "Choose an image file.");
    const sourceType = z.enum(["official_photo", "upload", "placeholder"]).parse(str(fd, "sourceType") || "upload");
    const saved = await saveImage(file, "products");
    const flavour = str(fd, "flavour");
    await db.insert(schema.productImages).values({
      productId,
      url: saved.url,
      alt: str(fd, "alt") || `${product.name}${sourceType === "placeholder" ? " — placeholder image" : ""}`,
      sortOrder: Number(str(fd, "sortOrder")) || 10,
      variantKey: flavour === "original" || flavour === "matcha" ? `flavour:${flavour}` : null,
      sourceType,
      sourceUrl: optStr(fd, "sourceUrl"),
      sourceNote: optStr(fd, "sourceNote"),
      usageRights: optStr(fd, "usageRights"),
      width: saved.width,
      height: saved.height,
      isLowRes: saved.width < 600,
    });
    await audit(asActor(admin), { action: "product.image_add", entityType: "product", entityId: productId, summary: `${product.name}: image uploaded (${sourceType})`, ip });
    revalidateStore(product.slug);
    return "Image uploaded.";
  });
}

export async function updateProductImage(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products.manage", async (admin, ip) => {
    const imageId = Number(str(fd, "imageId"));
    const [img] = await db.select().from(schema.productImages).where(eq(schema.productImages.id, imageId));
    if (!img) throw new HttpError(404, "Image not found.");
    if (bool(fd, "delete")) {
      await db.delete(schema.productImages).where(eq(schema.productImages.id, imageId));
      await audit(asActor(admin), { action: "product.image_delete", entityType: "product", entityId: img.productId, summary: `Image removed (${img.url})`, ip });
    } else {
      await db
        .update(schema.productImages)
        .set({ alt: str(fd, "alt") || img.alt, sortOrder: Number(str(fd, "sortOrder")) || img.sortOrder })
        .where(eq(schema.productImages.id, imageId));
    }
    revalidateStore();
    return bool(fd, "delete") ? "Image removed." : "Image updated.";
  });
}

export async function setProductBranches(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products.manage", async (admin, ip) => {
    const productId = Number(str(fd, "productId"));
    const enabled = new Set(fd.getAll("branch").map((x) => Number(x)));
    const branches = await db.select({ id: schema.branches.id, name: schema.branches.name }).from(schema.branches);
    for (const b of branches) {
      await db
        .insert(schema.branchProducts)
        .values({ branchId: b.id, productId, isAvailable: enabled.has(b.id) })
        .onConflictDoUpdate({ target: [schema.branchProducts.branchId, schema.branchProducts.productId], set: { isAvailable: enabled.has(b.id), updatedAt: new Date() } });
    }
    await audit(asActor(admin), { action: "product.branches", entityType: "product", entityId: productId, summary: `Available at ${branches.filter((b) => enabled.has(b.id)).map((b) => b.name).join(", ") || "no branches"}`, ip });
    revalidateStore();
    return "Branch availability saved.";
  });
}

export async function saveCategory(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products.manage", async (admin, ip) => {
    const id = Number(str(fd, "id")) || null;
    const v = z
      .object({
        name: z.string().min(2).max(60),
        slug: z.string().regex(slugRe),
        menuName: z.string().max(80).nullable(),
        description: z.string().max(500).nullable(),
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #8db33a"),
        sortOrder: z.coerce.number().int(),
      })
      .parse({ name: str(fd, "name"), slug: str(fd, "slug"), menuName: optStr(fd, "menuName"), description: optStr(fd, "description"), accent: str(fd, "accent") || "#8db33a", sortOrder: str(fd, "sortOrder") || "0" });
    if (id) await db.update(schema.productCategories).set({ ...v, isActive: bool(fd, "isActive"), updatedAt: new Date() }).where(eq(schema.productCategories.id, id));
    else await db.insert(schema.productCategories).values({ ...v, isActive: true, isAddonCategory: bool(fd, "isAddonCategory") });
    await audit(asActor(admin), { action: id ? "category.update" : "category.create", entityType: "category", entityId: id ?? v.slug, summary: `${id ? "Updated" : "Created"} category ${v.name}`, ip });
    revalidateStore();
    return "Category saved.";
  });
}

export async function bulkProductStatus(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products.manage", async (admin, ip) => {
    const ids = fd.getAll("id").map(Number).filter(Boolean);
    const status = z.enum(["active", "inactive", "unavailable"]).parse(str(fd, "status"));
    if (!ids.length) throw new HttpError(422, "Select at least one product.");
    await db.update(schema.products).set({ status, updatedAt: new Date() }).where(inArray(schema.products.id, ids));
    await audit(asActor(admin), { action: "product.bulk_status", entityType: "product", entityId: ids.join(","), summary: `Set ${ids.length} product(s) to ${status}`, ip });
    revalidateStore();
    return `${ids.length} product(s) set to ${status}.`;
  });
}
