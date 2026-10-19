import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { ProductOptionConfig, ProductVisual } from "@/lib/db/schema";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/services/settings";
import { POLICY_DRAFTS } from "@/lib/policy-drafts";

type CatalogueFile = {
  verifiedFrom: { id: string; label: string; url: string }[];
  cupSizes: Record<"S" | "M" | "L", { label: string; volumeMl: number }>;
  categories: { slug: string; name: string; menuName: string; sortOrder: number; accent: string; description: string; isAddonCategory?: boolean }[];
  products: {
    slug: string;
    name: string;
    nameZh: string;
    category: string;
    featured?: boolean;
    addon?: boolean;
    description: string;
    variants: { size: "S" | "M" | "L" | "ONE"; label?: string; price: number }[];
    options: { temperatures?: ("cold" | "hot")[]; flavours?: ("original" | "matcha")[]; sugar?: boolean; ice?: boolean; toppings?: boolean };
    images: string[];
    visual?: ProductVisual;
  }[];
};

type BranchesFile = {
  branches: {
    slug: string;
    name: string;
    area: string;
    addressLine: string | null;
    addressSource: string;
    addressVerified: boolean;
    approxPin: { latitude: number; longitude: number; basis: string };
    photo: string;
  }[];
};

const read = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), "utf8")) as T;

const SIZE_ORDER = { S: 1, M: 2, L: 3, ONE: 0 } as const;

/**
 * Load the verified catalogue and branch list. Safe to re-run: existing rows
 * are matched by slug; admin edits to prices, branch settings and content are
 * kept unless `force` is set.
 */
export async function seed({ force = false, log = console.log }: { force?: boolean; log?: (s: string) => void } = {}) {
  const cat = read<CatalogueFile>("data/catalogue.json");
  const br = read<BranchesFile>("data/branches.json");
  const menuSource = cat.verifiedFrom.find((s) => s.id === "menu-2026")!;

  // ---- categories
  const catIds = new Map<string, number>();
  for (const c of cat.categories) {
    const [row] = await db
      .insert(schema.productCategories)
      .values({ slug: c.slug, name: c.name, menuName: c.menuName, description: c.description, accent: c.accent, sortOrder: c.sortOrder, isAddonCategory: !!c.isAddonCategory })
      .onConflictDoUpdate({
        target: schema.productCategories.slug,
        set: force ? { name: c.name, menuName: c.menuName, description: c.description, accent: c.accent, sortOrder: c.sortOrder } : { menuName: c.menuName },
      })
      .returning();
    catIds.set(c.slug, row.id);
  }

  // ---- products
  let created = 0;
  let sort = 0;
  const productIds: number[] = [];
  for (const p of cat.products) {
    sort += 10;
    const optionConfig: ProductOptionConfig = {
      ...(p.options.temperatures ? { temperatures: p.options.temperatures } : {}),
      ...(p.options.flavours ? { flavours: p.options.flavours } : {}),
      ...(p.options.sugar ? { sugar: true } : {}),
      ...(p.options.ice ? { ice: true } : {}),
      ...(p.options.toppings ? { toppings: true } : {}),
    };
    const values = {
      slug: p.slug,
      name: p.name,
      nameZh: p.nameZh,
      categoryId: catIds.get(p.category)!,
      description: p.description,
      status: "active" as const,
      isAddon: !!p.addon,
      isFeatured: !!p.featured,
      sortOrder: sort,
      optionConfig,
      model3d: p.visual ? { kind: "procedural" as const, visual: p.visual } : null,
      verification: {
        status: "verified" as const,
        source: `${menuSource.label} — ${menuSource.url}`,
        notes: "Name, sizes and prices from the official menu. Ingredients/allergens not published.",
      },
    };
    const [existing] = await db.select().from(schema.products).where(eq(schema.products.slug, p.slug));
    let productId: number;
    if (!existing) {
      const [row] = await db.insert(schema.products).values(values).returning();
      productId = row.id;
      created++;
    } else {
      productId = existing.id;
      if (force) await db.update(schema.products).set({ ...values, updatedAt: new Date() }).where(eq(schema.products.id, productId));
      else if (!existing.model3d && values.model3d) await db.update(schema.products).set({ model3d: values.model3d }).where(eq(schema.products.id, productId));
    }
    productIds.push(productId);

    for (const v of p.variants) {
      const label = v.label ?? (v.size === "ONE" ? "Regular" : `${cat.cupSizes[v.size].label} · ${cat.cupSizes[v.size].volumeMl} ml`);
      const volumeMl = v.size === "ONE" ? null : cat.cupSizes[v.size].volumeMl;
      const [ev] = await db
        .select()
        .from(schema.productVariants)
        .where(and(eq(schema.productVariants.productId, productId), eq(schema.productVariants.sizeCode, v.size)));
      if (!ev)
        await db.insert(schema.productVariants).values({ productId, sizeCode: v.size, label, volumeMl, pricePaisa: v.price * 100, sortOrder: SIZE_ORDER[v.size] });
      else if (force)
        await db.update(schema.productVariants).set({ label, volumeMl, pricePaisa: v.price * 100, isActive: true, updatedAt: new Date() }).where(eq(schema.productVariants.id, ev.id));
    }

    // Official menu images are re-synced every run; uploaded photos are never touched.
    await db.delete(schema.productImages).where(and(eq(schema.productImages.productId, productId), eq(schema.productImages.sourceType, "official_menu")));
    await db.insert(schema.productImages).values(
      p.images.map((file, i) => {
        const flavour = file.endsWith("--matcha") ? "matcha" : file.endsWith("--original") ? "original" : null;
        return {
          productId,
          url: `/images/products/${file}.webp`,
          alt: `${p.name}${flavour ? ` (${flavour === "matcha" ? "matcha" : "original flavour"})` : ""} — photo from the official CHAJOY menu`,
          sortOrder: 100 + i, // after any uploaded originals
          variantKey: flavour ? `flavour:${flavour}` : null,
          sourceType: "official_menu" as const,
          sourceUrl: menuSource.url,
          sourceNote: `Cropped from the official CHAJOY menu board (data/source/menu-crops.json: ${file})`,
          usageRights: "CHAJOY's own published menu artwork — confirm usage with the owner",
          isLowRes: true,
        };
      }),
    );
  }

  // ---- branches
  const branchIds: number[] = [];
  for (const b of br.branches) {
    const [existing] = await db.select().from(schema.branches).where(eq(schema.branches.slug, b.slug));
    const verified = {
      name: b.name,
      area: b.area,
      addressLine: b.addressLine,
      addressVerified: b.addressVerified,
      photoUrl: b.photo,
    };
    if (!existing) {
      const [row] = await db
        .insert(schema.branches)
        .values({
          slug: b.slug,
          ...verified,
          city: "Dhaka",
          latitude: b.approxPin.latitude,
          longitude: b.approxPin.longitude,
          locationPrecision: "approximate",
          locationSource: `Approximate: ${b.approxPin.basis}. © OpenStreetMap contributors (ODbL). Exact pin not yet confirmed by CHAJOY.`,
          verification: {
            status: "needs_verification",
            source: "https://chajoybd.odoo.com/our-franchises",
            notes: `${b.addressSource}. Needs: exact pin, phone, opening hours, delivery area and fee.`,
          },
        })
        .returning();
      branchIds.push(row.id);
    } else {
      branchIds.push(existing.id);
      if (force) await db.update(schema.branches).set({ ...verified, updatedAt: new Date() }).where(eq(schema.branches.id, existing.id));
    }
  }

  // ---- branch menus: the same chain menu board is displayed at branches, so
  // every product starts available everywhere (flagged for confirmation).
  for (const branchId of branchIds) {
    for (const productId of productIds) {
      await db
        .insert(schema.branchProducts)
        .values({ branchId, productId, isAvailable: true, note: "Seeded from chain menu — confirm per branch" })
        .onConflictDoNothing();
    }
  }

  // ---- settings & policy drafts (never overwrite owner edits)
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    await db.insert(schema.siteSettings).values({ key, value: DEFAULT_SETTINGS[key] }).onConflictDoNothing();
  }
  for (const page of POLICY_DRAFTS) {
    await db.insert(schema.contentPages).values({ ...page, status: "draft" }).onConflictDoNothing();
  }

  log(`✓ catalogue: ${cat.products.length} products (${created} new) in ${cat.categories.length} categories`);
  log(`✓ branches: ${br.branches.length} (operational details left empty until CHAJOY confirms them)`);
  log(`✓ settings and policy drafts present`);
}
