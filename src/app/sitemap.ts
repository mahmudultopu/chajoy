/** sitemap.xml with products, categories, branches and pages. */

import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listBranches } from "@/lib/services/branches";
import { listCategories } from "@/lib/services/catalog";
import { siteUrl } from "@/lib/site";

// Built per request so it always reflects the database (and never runs DB code at build time).
export const dynamic = "force-dynamic";

/** Builds the sitemap from the database. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, branches, pages] = await Promise.all([
    db.select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt, isAddon: schema.products.isAddon, status: schema.products.status }).from(schema.products),
    listCategories(),
    listBranches(),
    db.select().from(schema.contentPages).where(eq(schema.contentPages.status, "published")),
  ]);
  const u = (p: string) => `${siteUrl}${p}`;
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/menu"), changeFrequency: "daily", priority: 0.9 },
    { url: u("/branches"), changeFrequency: "weekly", priority: 0.8 },
    { url: u("/offers"), changeFrequency: "daily", priority: 0.6 },
    { url: u("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: u("/contact"), changeFrequency: "monthly", priority: 0.4 },
    ...categories.filter((c) => !c.isAddonCategory).map((c) => ({ url: u(`/menu/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.filter((p) => !p.isAddon && p.status !== "inactive").map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...branches.map((b) => ({ url: u(`/branches/${b.slug}`), lastModified: b.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...pages.map((p) => ({ url: u(`/policies/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
