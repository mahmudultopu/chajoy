/** A light wash of a category accent colour for card backgrounds. */
export function tint(accent: string | null, pct = 16) {
  return `color-mix(in oklab, ${accent ?? "#8db33a"} ${pct}%, #fffdf6)`;
}

/** Same wash as tint(), as a hex colour (for WebGL, which can't read CSS colour-mix). */
export function tintHex(accent: string | null, pct = 16) {
  const a = (accent ?? "#8db33a").replace("#", "");
  const base = [0xff, 0xfd, 0xf6];
  const c = [0, 2, 4].map((i, k) => Math.round(parseInt(a.slice(i, i + 2), 16) * (pct / 100) + base[k] * (1 - pct / 100)));
  return "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("");
}
