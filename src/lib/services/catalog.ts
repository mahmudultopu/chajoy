/**
 * Menu catalogue: loading products with branch-specific prices and
 * availability, categories, popularity and menu search.
 */

import { and, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Model3d, ProductOptionConfig } from "@/lib/db/schema";
import type { CatalogSnapshot, ProductSnapshot } from "@/lib/pricing";

export type MenuImage = { url: string; alt: string; isLowRes: boolean; variantKey: string | null; sourceType: string };

export type MenuVariant = {
  id: number;
  sizeCode: string;
  label: string;
  volumeMl: number | null;
  basePricePaisa: number;
  pricePaisa: number;
  available: boolean;
  stockNote: string | null;
};

export type Availability = "available" | "unavailable_at_branch" | "unavailable" | "no_branch";

export type MenuProduct = {
  id: number;
  slug: string;
  name: string;
  nameZh: string | null;
  description: string | null;
  category: { id: number; slug: string; name: string; accent: string | null };
  isFeatured: boolean;
  isAddon: boolean;
  status: "active" | "inactive" | "unavailable";
  sortOrder: number;
  images: MenuImage[];
  image: MenuImage | null;
  variants: MenuVariant[];
  fromPricePaisa: number;
  availability: Availability;
  /** listed at the selected branch (true when no branch is selected) */
  offeredAtBranch: boolean;
  optionConfig: ProductOptionConfig;
  model3d: Model3d | null;
  ingredients: string | null;
  allergens: string | null;
  preparationNotes: string | null;
  createdAt: Date;
};

/**
 * Load the whole catalogue priced for one branch (or menu prices when no
 * branch is chosen). The menu is small, so filtering happens in memory on
 * real database rows.
 */
export async function loadCatalog(branchId: number | null, opts: { includeInactive?: boolean } = {}): Promise<MenuProduct[]> {
  const rows = await db.query.products.findMany({
    where: opts.includeInactive ? undefined : ne(schema.products.status, "inactive"),
    with: {
      category: true,
      images: { orderBy: (i, { asc }) => [asc(i.sortOrder), asc(i.id)] },
      variants: { orderBy: (v, { asc }) => [asc(v.sortOrder), asc(v.pricePaisa)] },
    },
    orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.id)],
  });

  let bp = new Map<number, boolean>();
  let inv = new Map<number, typeof schema.branchInventory.$inferSelect>();
  if (branchId) {
    const [bps, invs] = await Promise.all([
      db.select().from(schema.branchProducts).where(eq(schema.branchProducts.branchId, branchId)),
      db.select().from(schema.branchInventory).where(eq(schema.branchInventory.branchId, branchId)),
    ]);
    bp = new Map(bps.map((r) => [r.productId, r.isAvailable]));
    inv = new Map(invs.map((r) => [r.variantId, r]));
  }

  return rows
    .filter((p) => opts.includeInactive || p.category.isActive)
    .map((p) => {
      const atBranch = branchId ? bp.get(p.id) === true : true;
      const variants: MenuVariant[] = p.variants
        .filter((v) => v.isActive)
        .map((v) => {
          const i = inv.get(v.id);
          const out = !!i?.trackStock && i.stockQty !== null && i.stockQty <= 0;
          const low = !!i?.trackStock && i.stockQty !== null && i.stockQty > 0 && i.stockQty <= i.lowStockThreshold;
          return {
            id: v.id,
            sizeCode: v.sizeCode,
            label: v.label,
            volumeMl: v.volumeMl,
            basePricePaisa: v.pricePaisa,
            pricePaisa: i?.pricePaisa ?? v.pricePaisa,
            available: p.status === "active" && atBranch && !out,
            stockNote: out ? "Out of stock" : low ? `Only ${i!.stockQty} left` : null,
          };
        });
      const images: MenuImage[] = p.images.map((i) => ({
        url: i.url,
        alt: i.alt,
        isLowRes: i.isLowRes,
        variantKey: i.variantKey,
        sourceType: i.sourceType,
      }));
      const availability: Availability =
        p.status !== "active" ? "unavailable" : !branchId ? "no_branch" : !atBranch ? "unavailable_at_branch" : variants.some((v) => v.available) ? "available" : "unavailable_at_branch";
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameZh: p.nameZh,
        description: p.description,
        category: { id: p.category.id, slug: p.category.slug, name: p.category.name, accent: p.category.accent },
        isFeatured: p.isFeatured,
        isAddon: p.isAddon,
        status: p.status,
        sortOrder: p.sortOrder,
        images,
        image: images.find((i) => !i.variantKey) ?? images[0] ?? null,
        variants,
        fromPricePaisa: variants.length ? Math.min(...variants.map((v) => v.pricePaisa)) : 0,
        availability,
        offeredAtBranch: atBranch,
        optionConfig: p.optionConfig,
        model3d: p.model3d ?? null,
        ingredients: p.ingredientsVerified ? p.ingredients : null,
        allergens: p.allergensVerified ? p.allergens : null,
        preparationNotes: p.preparationNotes,
        createdAt: p.createdAt,
      };
    });
}

/** Active menu categories in display order. */
export async function listCategories() {
  return db.query.productCategories.findMany({
    where: eq(schema.productCategories.isActive, true),
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
}

// ------------------------------------------------------------------ search

function norm(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Relevance score; 0 means "doesn't match every search word". */
export function matchScore(p: Pick<MenuProduct, "name" | "nameZh" | "description" | "category" | "ingredients">, q: string): number {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const name = norm(p.name);
  const fields = [name, p.nameZh ?? "", norm(p.category.name), norm(p.description ?? ""), norm(p.ingredients ?? "")];
  let score = 0;
  for (const w of words) {
    const stem = w.length > 3 ? w.replace(/(es|s)$/, "") : w;
    if (name.startsWith(w)) score += 10;
    else if (name.split(/\s+/).some((t) => t.startsWith(stem))) score += 6;
    else if (name.includes(stem) || fields[1].includes(w)) score += 4;
    else if (fields[2].includes(stem)) score += 3;
    else if (fields[3].includes(stem) || fields[4].includes(stem)) score += 1;
    else return 0;
  }
  return score;
}

export type MenuQuery = {
  q?: string;
  category?: string;
  size?: string;
  minPaisa?: number;
  maxPaisa?: number;
  availableOnly?: boolean;
  sort?: "featured" | "price_asc" | "price_desc" | "name" | "popular" | "newest";
  page?: number;
  pageSize?: number;
};

/** Units sold per product over the last `days` days, for "popular" sorting. */
export async function popularityMap(days = 90): Promise<Map<number, number>> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({ productId: schema.orderItems.productId, qty: sql<number>`sum(${schema.orderItems.quantity})::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(gte(schema.orders.createdAt, since), ne(schema.orders.status, "cancelled")))
    .groupBy(schema.orderItems.productId);
  return new Map(rows.filter((r) => r.productId !== null).map((r) => [r.productId as number, Number(r.qty)]));
}

/** Filters, sorts and paginates the menu for the menu page. */
export async function searchMenu(all: MenuProduct[], query: MenuQuery) {
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 12));
  const page = Math.max(1, query.page ?? 1);
  let list = all.filter((p) => !p.isAddon && p.status !== "inactive");
  if (query.category) list = list.filter((p) => p.category.slug === query.category);
  if (query.size) list = list.filter((p) => p.variants.some((v) => v.sizeCode === query.size));
  if (query.minPaisa !== undefined) list = list.filter((p) => p.variants.some((v) => v.pricePaisa >= query.minPaisa!));
  if (query.maxPaisa !== undefined) list = list.filter((p) => p.variants.some((v) => v.pricePaisa <= query.maxPaisa!));
  if (query.availableOnly) list = list.filter((p) => p.availability === "available");

  const scored = list.map((p) => ({ p, s: query.q ? matchScore(p, query.q) : 1 })).filter((x) => x.s > 0);
  const sort = query.sort ?? (query.q ? undefined : "featured");
  let pop: Map<number, number> | null = null;
  if (sort === "popular") pop = await popularityMap();
  scored.sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return a.p.fromPricePaisa - b.p.fromPricePaisa || a.p.name.localeCompare(b.p.name);
      case "price_desc":
        return b.p.fromPricePaisa - a.p.fromPricePaisa || a.p.name.localeCompare(b.p.name);
      case "name":
        return a.p.name.localeCompare(b.p.name);
      case "popular":
        return (pop!.get(b.p.id) ?? 0) - (pop!.get(a.p.id) ?? 0) || a.p.sortOrder - b.p.sortOrder;
      case "newest":
        return b.p.createdAt.getTime() - a.p.createdAt.getTime() || a.p.sortOrder - b.p.sortOrder;
      case "featured":
        return Number(b.p.isFeatured) - Number(a.p.isFeatured) || a.p.sortOrder - b.p.sortOrder;
      default:
        return b.s - a.s || a.p.sortOrder - b.p.sortOrder;
    }
  });
  const total = scored.length;
  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items: scored.slice(0, page * pageSize).map((x) => x.p), // "load more" keeps earlier pages
  };
}

/** Sorting by popularity/newest is only offered when the data can support it. */
export async function sortCapabilities() {
  const [orders] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.orderItems);
  const [dates] = await db
    .select({ n: sql<number>`count(distinct date_trunc('day', ${schema.products.createdAt}))::int` })
    .from(schema.products);
  return { popular: Number(orders?.n ?? 0) > 0, newest: Number(dates?.n ?? 0) > 1 };
}

// ------------------------------------------------------------------ snapshots for pricing

export async function catalogSnapshot(branchId: number | null, productIds?: number[]): Promise<CatalogSnapshot> {
  const all = await loadCatalog(branchId, { includeInactive: true });
  const products = new Map<number, ProductSnapshot>();
  const toppings: CatalogSnapshot["toppings"] = new Map();
  const variantRows = await db
    .select()
    .from(schema.branchInventory)
    .where(branchId ? eq(schema.branchInventory.branchId, branchId) : sql`false`);
  const inv = new Map(variantRows.map((r) => [r.variantId, r]));
  const wanted = productIds ? new Set(productIds) : null;
  for (const p of all) {
    if (p.isAddon) {
      const v = p.variants[0];
      if (v) toppings.set(p.id, { name: p.name, pricePaisa: v.pricePaisa, available: p.status === "active" && (branchId ? v.available : true) });
      continue;
    }
    if (wanted && !wanted.has(p.id)) continue;
    products.set(p.id, {
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      isAddon: p.isAddon,
      optionConfig: p.optionConfig,
      availableAtBranch: p.offeredAtBranch,
      variants: new Map(
        p.variants.map((v) => {
          const i = inv.get(v.id);
          return [
            v.id,
            {
              id: v.id,
              sizeCode: v.sizeCode,
              label: v.label,
              pricePaisa: v.pricePaisa,
              isActive: true,
              trackStock: !!i?.trackStock,
              stockQty: i?.trackStock ? (i.stockQty ?? 0) : null,
            },
          ];
        }),
      ),
    });
  }
  // a product row can exist with all variants inactive; they're absent from the map and quote() reports them
  return { products, toppings };
}

/** Looks up product ids for a list of slugs. */
export async function productIdsBySlug(slugs: string[]) {
  if (!slugs.length) return [];
  return db.select({ id: schema.products.id, slug: schema.products.slug }).from(schema.products).where(inArray(schema.products.slug, slugs));
}
