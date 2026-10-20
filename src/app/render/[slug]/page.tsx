import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import type { ProductVisual } from "@/lib/db/schema";
import { COMPOSITIONS } from "@/components/three/render-presets";
import { RenderClient } from "./RenderClient";

// Internal page used by scripts/render-products.ts to produce studio images.
// Visuals come straight from data/catalogue.json. Not available in production
// unless RENDER_PAGES=1.
export const metadata = { robots: { index: false, follow: false } };

export default async function RenderPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ w?: string; flavour?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.RENDER_PAGES !== "1") notFound();
  const { slug } = await params;
  const sp = await searchParams;
  const cat = JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "data/catalogue.json"), "utf8")) as { products: { slug: string; visual?: ProductVisual }[] };
  const visuals: Record<string, ProductVisual> = Object.fromEntries(cat.products.filter((p) => p.visual).map((p) => [p.slug, p.visual!]));
  let visual: ProductVisual | null = null;
  if (!slug.startsWith("bubble-") && !COMPOSITIONS[slug]) {
    visual = visuals[slug] ?? null;
    if (!visual) notFound();
  }
  const w = Math.min(2400, Number(sp.w) || 1200);
  return <RenderClient slug={slug} visual={visual} visuals={visuals} width={w} flavour={sp.flavour === "matcha" ? "matcha" : "original"} />;
}
