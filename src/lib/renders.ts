import { RENDER_PRESETS } from "@/components/three/render-presets";

// Studio renders produced by `npm run images:render` (3D illustrations).

export function renderFor(slug: string, flavour?: "original" | "matcha" | null): string | null {
  if (!RENDER_PRESETS[slug]) return null;
  if (flavour === "matcha" && slug.endsWith("-sundae")) return `/images/renders/${slug}--matcha.webp`;
  return `/images/renders/${slug}.webp`;
}

export function renderBg(slug: string): string | null {
  return RENDER_PRESETS[slug]?.bg[1] ?? null;
}
