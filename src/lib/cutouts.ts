/**
 * Product photography helpers.
 *
 * Product photos are CHAJOY's official menu photos with the menu-board
 * background removed (public/images/cutouts), so the storefront can place
 * them on soft colour stages. A few products also have sharper versions cut
 * from CHAJOY's own high-resolution posters (public/images/cutouts/hq).
 * See scripts/cutouts/README.md for how the files are produced.
 */

/** Names of every cut-out file in public/images/cutouts (without extension). */
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

/** Products that also have a sharper poster cut-out in public/images/cutouts/hq. */
const HQ = new Set(["boba-milk-tea", "chocolate-oreo-crumb-sundae--original", "strawberry-sundae--matcha"]);

/**
 * Returns the best cut-out for a photo name, preferring the poster version.
 * Names match the files in public/images/products, e.g. "peach-sundae--matcha".
 */
export function cutoutFor(name: string): string | null {
  // Poster cut-outs are sharper, so they win when both exist.
  if (HQ.has(name)) return `/images/cutouts/hq/${name}.webp`;
  // Otherwise fall back to the menu-photo cut-out, if there is one.
  return CUTOUTS.has(name) ? `/images/cutouts/${name}.webp` : null;
}

/**
 * Maps an official product photo URL (/images/products/<name>.webp) to its
 * cut-out. Admin-uploaded photos have no cut-out and return null.
 */
export function cutoutOf(url: string | null | undefined): string | null {
  const m = url?.match(/^\/images\/products\/([a-z0-9-]+)\.webp$/);
  return m ? cutoutFor(m[1]) : null;
}

/** Light colour stage (top, bottom) behind each product, picked to suit the drink. */
const BACKDROPS: Record<string, [string, string]> = {
  "boba-milk-tea": ["#f7d9b0", "#e9a96b"],
  "classic-milk-tea": ["#f6e6d6", "#e2c3a6"],
  "coconut-jelly-milk-tea": ["#d8efe6", "#9fd3c2"],
  "strawberry-bobo-milk-tea": ["#ffd9e1", "#f39aae"],
  "lemon-green-tea": ["#eef6b5", "#c9de5b"],
  "fresh-iced-lemon-water": ["#e2f6e9", "#a9dcbf"],
  "jasmine-green-tea": ["#fff1c2", "#f5c85a"],
  "lemon-black-tea": ["#ffe2b3", "#f59a3e"],
  "guava-iced-lemon-green-tea": ["#ffdcd2", "#f48a76"],
  "shaken-peach-black-tea": ["#ffe1c9", "#f6a26b"],
  "blueberry-fruit-granule-green-tea": ["#e4ddfa", "#a99be6"],
  "strawberry-and-lemon-tea": ["#ffd6d3", "#f27a73"],
  "jasmine-peach-green-tea": ["#ffe9cf", "#f8b46f"],
  "strawberry-shake-milkshake": ["#ffdde6", "#f590a9"],
  "matcha-oreo-shake-milkshake": ["#e6f3cf", "#a9cf6a"],
  "chocolate-oreo-shaking-milkshake": ["#f1ddc8", "#c48f62"],
  "peach-shake-milkshake": ["#ffe6d7", "#f6aa86"],
  "blueberry-shake-milkshake": ["#e7e0fb", "#ad9de6"],
  "guava-shake-milkshake": ["#ffe1dc", "#f59a8b"],
  "ice-cream": ["#eef7da", "#bcdc84"],
  "strawberry-sundae": ["#ffe0e4", "#f497a6"],
  "blueberry-sundae": ["#e5dffa", "#a597e2"],
  "peach-sundae": ["#ffe8d6", "#f7ad7e"],
  "brown-sugar-boba-sundae": ["#f6dfc0", "#d9a26a"],
  "chocolate-oreo-crumb-sundae": ["#efdcca", "#c39470"],
  "guava-crispy-cone-crumb-sundae": ["#ffe2d9", "#f39c88"],
};

/** Neutral cream stage for products without their own colours. */
const FALLBACK: [string, string] = ["#fbf3e4", "#f1dfc2"];

/** Colour stage for a product card or product page. */
export function backdropFor(slug: string): [string, string] {
  return BACKDROPS[slug] ?? FALLBACK;
}
