// Studio render compositions: each product on a bright backdrop with the
// fruit and toppings it's made with (Alldae-style product photography).
// Used by /render/[slug] and scripts/render-products.ts to produce the
// images in public/images/renders/. They are illustrations, not photos.

export type PropKind =
  | "lemon"
  | "lime"
  | "strawberry"
  | "peach"
  | "guava"
  | "coconut"
  | "blueberries"
  | "oreo"
  | "jasmine"
  | "leaf"
  | "matcha"
  | "chocolate"
  | "sugar"
  | "pearls"
  | "ice"
  | "cone";

export type PropSpec = { kind: PropKind; p: [number, number, number]; r?: [number, number, number]; s?: number };

export type RenderPreset = {
  /** backdrop gradient, top → bottom */
  bg: [string, string];
  props: PropSpec[];
  size?: "S" | "M" | "L";
  /** product rotation around Y */
  turn?: number;
};

const citrusPair = (k: "lemon" | "lime"): PropSpec[] => [
  { kind: k, p: [-1.15, -0.98, 0.5], r: [-1.25, 0, 0.3], s: 1 },
  { kind: k, p: [1.2, -0.62, 0.15], r: [0.2, 0.6, 1.35], s: 0.95 },
];
const leaves: PropSpec[] = [
  { kind: "leaf", p: [1.05, 0.35, -0.4], r: [0.2, -0.6, -0.9], s: 1.5 },
  { kind: "leaf", p: [1.35, -0.1, -0.5], r: [-0.1, -0.3, -1.6], s: 1.2 },
];

export const RENDER_PRESETS: Record<string, RenderPreset> = {
  // ---- milk tea
  "boba-milk-tea": {
    bg: ["#f7d9b0", "#e9a96b"],
    props: [{ kind: "pearls", p: [0.2, -1.3, 0.55], s: 1.25 }, { kind: "sugar", p: [-1.2, -1.3, 0.3] }, { kind: "sugar", p: [1.2, -1.3, 0.1], r: [0, 0.8, 0] }],
  },
  "classic-milk-tea": {
    bg: ["#f6e6d6", "#e2c3a6"],
    props: [{ kind: "ice", p: [-1.1, -0.95, 0.45], r: [0.3, 0.5, 0.1], s: 1.2 }, { kind: "ice", p: [1.1, -1.02, 0.2], r: [0.5, 1.1, 0.4], s: 1 }, { kind: "sugar", p: [0.9, -1.18, 0.75] }, ...leaves],
  },
  "coconut-jelly-milk-tea": {
    bg: ["#d8efe6", "#9fd3c2"],
    props: [{ kind: "coconut", p: [-1.15, -1.0, 0.35], r: [0.5, 0, -0.25] }, { kind: "coconut", p: [1.2, -1.02, 0.1], r: [0.3, 0, 0.35], s: 0.9 }, ...leaves],
  },
  "strawberry-bobo-milk-tea": {
    bg: ["#ffd9e1", "#f39aae"],
    props: [{ kind: "strawberry", p: [-1.15, -1.3 + 0.27 * 0.55, 0.4], r: [0.2, 0.5, 1.45], s: 0.55 }, { kind: "strawberry", p: [1.15, -1.3 + 0.27 * 0.5, 0.2], r: [0.2, 0.5, 1.45], s: 0.5 }, { kind: "pearls", p: [0.1, -1.16, 0.75], s: 0.7 }],
  },

  // ---- fruit tea
  "lemon-green-tea": { bg: ["#eef6b5", "#c9de5b"], props: [...citrusPair("lime"), ...leaves], size: "L" },
  "fresh-iced-lemon-water": {
    bg: ["#e2f6e9", "#a9dcbf"],
    props: [...citrusPair("lime"), { kind: "ice", p: [0.4, -1.0, 0.85], r: [0.4, 0.3, 0.2], s: 1 }],
    size: "L",
  },
  "jasmine-green-tea": {
    bg: ["#fff1c2", "#f5c85a"],
    props: [{ kind: "jasmine", p: [-1.05, -1.05, 0.5], r: [0.2, 0, 0.1], s: 1.6 }, { kind: "jasmine", p: [-0.7, -1.1, 0.75], s: 1.3 }, { kind: "jasmine", p: [1.1, -1.08, 0.4], s: 1.5 }, ...leaves],
    size: "L",
  },
  "lemon-black-tea": { bg: ["#ffe2b3", "#f59a3e"], props: [...citrusPair("lemon"), { kind: "ice", p: [0.5, -1.0, 0.85], r: [0.3, 0.5, 0.2], s: 0.9 }], size: "L" },
  "guava-iced-lemon-green-tea": {
    bg: ["#ffdcd2", "#f48a76"],
    props: [{ kind: "guava", p: [-1.15, -1.0, 0.4], r: [0.55, 0, -0.2] }, { kind: "lime", p: [1.2, -0.66, 0.15], r: [0.2, 0.6, 1.35], s: 0.95 }, ...leaves],
    size: "L",
  },
  "shaken-peach-black-tea": {
    bg: ["#ffe1c9", "#f6a26b"],
    props: [{ kind: "peach", p: [-1.15, -0.95, 0.4] }, { kind: "peach", p: [1.15, -1.0, 0.2], r: [0, 2, 0.3], s: 0.9 }, ...leaves],
    size: "L",
  },
  "blueberry-fruit-granule-green-tea": {
    bg: ["#e4ddfa", "#a99be6"],
    props: [{ kind: "blueberries", p: [-1.0, -1.28, 0.45], s: 1.3 }, { kind: "blueberries", p: [1.05, -1.28, 0.3], s: 1.1 }, ...leaves],
    size: "L",
  },
  "strawberry-and-lemon-tea": {
    bg: ["#ffd6d3", "#f27a73"],
    props: [{ kind: "strawberry", p: [-1.15, -1.3 + 0.27 * 0.55, 0.4], r: [0.2, 0.5, 1.45], s: 0.55 }, { kind: "lime", p: [1.2, -0.66, 0.15], r: [0.2, 0.6, 1.35], s: 0.95 }, { kind: "strawberry", p: [0.75, -1.3 + 0.27 * 0.42, 0.8], r: [0.2, 0.5, 1.45], s: 0.42 }],
    size: "L",
  },
  "jasmine-peach-green-tea": {
    bg: ["#ffe9cf", "#f8b46f"],
    props: [{ kind: "peach", p: [-1.15, -0.95, 0.4] }, { kind: "jasmine", p: [1.05, -1.08, 0.5], s: 1.6 }, { kind: "jasmine", p: [0.75, -1.1, 0.8], s: 1.3 }, ...leaves],
    size: "L",
  },

  // ---- milkshakes
  "strawberry-shake-milkshake": {
    bg: ["#ffdde6", "#f590a9"],
    props: [{ kind: "strawberry", p: [-1.1, -1.3 + 0.27 * 0.55, 0.45], r: [0.2, 0.5, 1.45], s: 0.55 }, { kind: "strawberry", p: [1.1, -1.3 + 0.27 * 0.5, 0.2], r: [0.2, 0.5, 1.45], s: 0.5 }, { kind: "strawberry", p: [0.65, -1.3 + 0.27 * 0.4, 0.8], r: [-0.3, 1.2, 1.5], s: 0.4 }],
  },
  "matcha-oreo-shake-milkshake": {
    bg: ["#e6f3cf", "#a9cf6a"],
    props: [{ kind: "oreo", p: [-1.1, -1.12, 0.45], r: [1.4, 0, 0.3], s: 1.3 }, { kind: "oreo", p: [-0.75, -1.25, 0.8], r: [0.1, 0, 0], s: 1.2 }, { kind: "matcha", p: [1.1, -1.32, 0.3], s: 1 }],
  },
  "chocolate-oreo-shaking-milkshake": {
    bg: ["#f1ddc8", "#c48f62"],
    props: [{ kind: "oreo", p: [-1.1, -1.12, 0.45], r: [1.4, 0, 0.3], s: 1.3 }, { kind: "oreo", p: [-0.75, -1.25, 0.8], s: 1.2 }, { kind: "chocolate", p: [1.0, -1.32, 0.4], s: 1.2 }],
  },
  "peach-shake-milkshake": { bg: ["#ffe6d7", "#f6aa86"], props: [{ kind: "peach", p: [-1.15, -0.95, 0.4] }, { kind: "peach", p: [1.15, -1.0, 0.2], r: [0, 2, 0.3], s: 0.85 }] },
  "blueberry-shake-milkshake": { bg: ["#e7e0fb", "#ad9de6"], props: [{ kind: "blueberries", p: [-1.0, -1.28, 0.45], s: 1.3 }, { kind: "blueberries", p: [1.05, -1.28, 0.3], s: 1.1 }] },
  "guava-shake-milkshake": { bg: ["#ffe1dc", "#f59a8b"], props: [{ kind: "guava", p: [-1.15, -1.0, 0.4], r: [0.55, 0, -0.2] }, { kind: "guava", p: [1.15, -1.05, 0.25], r: [0.4, 0, 0.3], s: 0.85 }] },

  // ---- ice cream & sundaes
  "ice-cream": { bg: ["#eef7da", "#bcdc84"], props: [{ kind: "matcha", p: [0.15, -1.3, 0.9], s: 0.7 }] },
  "strawberry-sundae": { bg: ["#ffe0e4", "#f497a6"], props: [{ kind: "strawberry", p: [-1.15, -1.3 + 0.27 * 0.55, 0.4], r: [0.2, 0.5, 1.45], s: 0.55 }, { kind: "strawberry", p: [1.1, -1.3 + 0.27 * 0.5, 0.25], r: [0.2, 0.5, 1.45], s: 0.5 }] },
  "blueberry-sundae": { bg: ["#e5dffa", "#a597e2"], props: [{ kind: "blueberries", p: [-1.0, -1.28, 0.45], s: 1.3 }, { kind: "blueberries", p: [1.05, -1.28, 0.3], s: 1.1 }] },
  "peach-sundae": { bg: ["#ffe8d6", "#f7ad7e"], props: [{ kind: "peach", p: [-1.15, -0.95, 0.4] }, { kind: "peach", p: [1.15, -1.0, 0.2], r: [0, 2, 0.3], s: 0.85 }] },
  "brown-sugar-boba-sundae": { bg: ["#f6dfc0", "#d9a26a"], props: [{ kind: "pearls", p: [0.1, -1.16, 0.55], s: 1.2 }, { kind: "sugar", p: [1.15, -1.18, 0.3] }] },
  "chocolate-oreo-crumb-sundae": {
    bg: ["#efdcca", "#c39470"],
    props: [{ kind: "oreo", p: [-1.1, -1.12, 0.45], r: [1.4, 0, 0.3], s: 1.3 }, { kind: "chocolate", p: [1.0, -1.32, 0.4], s: 1.2 }],
  },
  "guava-crispy-cone-crumb-sundae": {
    bg: ["#ffe2d9", "#f39c88"],
    props: [{ kind: "guava", p: [-1.15, -1.0, 0.4], r: [0.55, 0, -0.2] }, { kind: "cone", p: [1.35, -0.4, -0.5], r: [0.2, 0, -0.5], s: 0.55 }],
  },
};

/** Ingredient "bubbles" for the homepage (rendered on transparent backgrounds). */
export const BUBBLE_PRESETS: Record<string, PropSpec[]> = {
  "bubble-boba": [{ kind: "pearls", p: [0, -1.3, 0], s: 1.7 }],
  "bubble-ice": [
    { kind: "ice", p: [-0.32, -1.07, 0.1], r: [0.2, 0.6, 0.1], s: 1.9 },
    { kind: "ice", p: [0.4, -0.9, -0.3], r: [0.7, 1.1, 0.5], s: 1.6 },
  ],
  "bubble-matcha": [{ kind: "matcha", p: [0, -1.3, 0], s: 1.9 }],
  "bubble-citrus": [
    { kind: "lemon", p: [-0.3, -0.86, -0.1], r: [0.15, 0.3, 0.05], s: 1.6 },
    { kind: "lime", p: [0.45, -1.02, 0.35], r: [0.1, -0.5, -0.1], s: 1.25 },
  ],
  "bubble-sugar": [{ kind: "sugar", p: [0, -1.3, 0], s: 2.2 }],
};

/** Wide banner compositions (hero, promo): rendered on their own horizontal gradient, products on the right. */
export type CompositionItem = {
  slug: string; // product whose visual to use (from data/catalogue.json)
  x: number;
  z?: number;
  scale?: number;
  turn?: number;
  size?: "S" | "M" | "L";
  flavour?: "original" | "matcha";
  /** for the ice cream: which single cone to show */
  serve?: "original" | "matcha" | "twist";
};
export type Composition = { width: number; height: number; bg: [string, string]; items: CompositionItem[]; props: PropSpec[]; cameraZ?: number; lookX?: number };

export const COMPOSITIONS: Record<string, Composition> = {
  hero: {
    width: 2400,
    height: 1000,
    bg: ["#cfe7b4", "#fde34f"],
    cameraZ: 9.6,
    lookX: 0,
    items: [
      { slug: "boba-milk-tea", x: 1.55, z: 0.3, scale: 1.08, turn: -0.4 },
      { slug: "ice-cream", x: 3.45, z: -0.9, serve: "twist", scale: 0.9 },
    ],
    props: [
      { kind: "pearls", p: [1.7, -1.3, 1.35], s: 1.3 },
      { kind: "lime", p: [-0.15, -1.17, 0.9], r: [-1.3, 0, 0.2] },
      { kind: "lemon", p: [0.1, -0.96, -0.2], r: [0.1, 0.5, 0.05], s: 1.1 },
      { kind: "leaf", p: [0.05, -0.05, -0.9], r: [0.3, 0.4, 0.8], s: 1.7 },
      { kind: "ice", p: [3.05, -1.12, 0.9], r: [0.4, 0.6, 0.2], s: 1.2 },
      { kind: "sugar", p: [4.4, -1.3, 0.4] },
    ],
  },
  "banner-matcha": {
    width: 2200,
    height: 1000,
    bg: ["#fde2c6", "#f7bfcd"],
    cameraZ: 9.8,
    items: [
      { slug: "matcha-oreo-shake-milkshake", x: 0.7, z: 0, turn: -0.3, scale: 0.98 },
      { slug: "strawberry-sundae", x: 2.65, z: -0.4, flavour: "matcha", scale: 0.95 },
    ],
    props: [
      { kind: "oreo", p: [-0.65, -1.12, 0.6], r: [1.4, 0, 0.3], s: 1.3 },
      { kind: "oreo", p: [-0.25, -1.25, 1.05], s: 1.2 },
      { kind: "matcha", p: [1.75, -1.3, 1.1], s: 0.8 },
      { kind: "leaf", p: [3.9, -0.35, -0.8], r: [0.2, -0.6, -0.9], s: 1.6 },
      { kind: "leaf", p: [-0.8, 0.2, -0.9], r: [0.3, 0.4, 0.8], s: 1.4 },
    ],
  },
};
