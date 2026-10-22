import { RENDER_PRESETS } from "@/components/three/render-presets";

// Official CHAJOY menu photos with the menu-board background removed
// (public/images/cutouts, made by scripts/cutouts/rmbg.mjs). The pixels are the
// original photos; only the background is gone, so they can sit on colour.
const CUTOUTS = new Set([
  "blueberry-fruit-granule-green-tea",
  "blueberry-shake-milkshake",
  "blueberry-sundae--matcha",
  "blueberry-sundae--original",
  "blueberry-sundae",
  "boba-milk-tea",
  "brown-sugar-boba-sundae--matcha",
  "brown-sugar-boba-sundae--original",
  "brown-sugar-boba-sundae",
  "chocolate-oreo-crumb-sundae--matcha",
  "chocolate-oreo-crumb-sundae--original",
  "chocolate-oreo-crumb-sundae",
  "chocolate-oreo-shaking-milkshake",
  "classic-milk-tea",
  "coconut-jelly-milk-tea",
  "fresh-iced-lemon-water",
  "guava-crispy-cone-crumb-sundae--matcha",
  "guava-crispy-cone-crumb-sundae--original",
  "guava-crispy-cone-crumb-sundae",
  "guava-iced-lemon-green-tea",
  "guava-shake-milkshake",
  "ice-cream",
  "jasmine-green-tea",
  "jasmine-peach-green-tea",
  "lemon-black-tea",
  "lemon-green-tea",
  "matcha-oreo-shake-milkshake",
  "peach-shake-milkshake",
  "peach-sundae--matcha",
  "peach-sundae--original",
  "peach-sundae",
  "shaken-peach-black-tea",
  "strawberry-and-lemon-tea",
  "strawberry-bobo-milk-tea",
  "strawberry-shake-milkshake",
  "strawberry-sundae--matcha",
  "strawberry-sundae--original",
  "strawberry-sundae",
  "topping-brown-pearl",
  "topping-coconut-jelly",
  "topping-crispy-crushed-cone",
  "topping-crystal-ball",
  "topping-pudding",
]);

// Sharper cut-outs taken from CHAJOY's official high-resolution posters
// (facebook.com/ChaJoy-Bangladesh). Preferred over the menu-board crops.
const HQ = new Set(["boba-milk-tea", "chocolate-oreo-crumb-sundae--original", "strawberry-sundae--matcha"]);

export function cutoutFor(name: string): string | null {
  if (HQ.has(name)) return `/images/cutouts/hq/${name}.webp`;
  return CUTOUTS.has(name) ? `/images/cutouts/${name}.webp` : null;
}

/** Cut-out version of an official product photo URL, or null if there isn't one. */
export function cutoutOf(url: string | null | undefined): string | null {
  const m = url?.match(/^\/images\/products\/([a-z0-9-]+)\.webp$/);
  return m ? cutoutFor(m[1]) : null;
}

const FALLBACK: [string, string] = ["#fdf3c4", "#f9dc5c"];

/** Colour backdrop (top, bottom) for a product, in the reference's saturated pastel style. */
export function backdropFor(slug: string): [string, string] {
  return RENDER_PRESETS[slug]?.bg ?? FALLBACK;
}
