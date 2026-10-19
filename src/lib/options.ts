import type { CartLineOptions, ProductOptionConfig } from "@/lib/db/schema";

export const SUGAR_LEVELS = [50, 75, 100] as const;
export const ICE_LEVELS = ["less", "normal"] as const;
// The menu doesn't cap toppings; each one can be added once. This is only a
// sanity bound against tampered requests.
export const MAX_TOPPINGS = 10;

export type OptionsResult = { ok: true; options: CartLineOptions } | { ok: false; error: string };

/**
 * Validate customer-chosen options against what the product allows and fill
 * defaults. Anything the product doesn't support is rejected, not ignored, so
 * a tampered request can't smuggle in a free topping.
 */
export function normalizeOptions(
  config: ProductOptionConfig,
  input: unknown,
  allowedToppingIds: ReadonlySet<number>,
): OptionsResult {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: CartLineOptions = {};

  if (config.temperatures?.length) {
    const t = raw.temperature ?? config.temperatures[0];
    if (!config.temperatures.includes(t as "cold" | "hot")) return { ok: false, error: "Choose cold or hot." };
    out.temperature = t as "cold" | "hot";
  } else if (raw.temperature !== undefined) {
    return { ok: false, error: "This item has no temperature choice." };
  }

  if (config.flavours?.length) {
    const f = raw.flavour ?? config.flavours[0];
    if (!config.flavours.includes(f as "original" | "matcha")) return { ok: false, error: "Choose a flavour." };
    out.flavour = f as "original" | "matcha";
  } else if (raw.flavour !== undefined) {
    return { ok: false, error: "This item has no flavour choice." };
  }

  if (config.sugar) {
    const s = raw.sugar ?? 100;
    if (!SUGAR_LEVELS.includes(s as 50 | 75 | 100)) return { ok: false, error: "Choose 50%, 75% or 100% sugar." };
    out.sugar = s as 50 | 75 | 100;
  } else if (raw.sugar !== undefined) {
    return { ok: false, error: "This item has no sugar choice." };
  }

  const isHot = out.temperature === "hot";
  if (config.ice && !isHot) {
    const i = raw.ice ?? "normal";
    if (!ICE_LEVELS.includes(i as "less" | "normal")) return { ok: false, error: "Choose less or normal ice." };
    out.ice = i as "less" | "normal";
  } else if (raw.ice !== undefined && !(config.ice && isHot)) {
    return { ok: false, error: "This item has no ice choice." };
  }

  const toppings = raw.toppings;
  if (toppings !== undefined && toppings !== null) {
    if (!Array.isArray(toppings)) return { ok: false, error: "Invalid toppings." };
    if (toppings.length && !config.toppings) return { ok: false, error: "Toppings aren't offered on this item." };
    const ids = [...new Set(toppings.map((x) => Number(x)))];
    if (ids.some((id) => !Number.isInteger(id) || !allowedToppingIds.has(id)))
      return { ok: false, error: "One of the toppings isn't available." };
    if (ids.length > MAX_TOPPINGS) return { ok: false, error: `Up to ${MAX_TOPPINGS} toppings per drink.` };
    if (ids.length) out.toppings = ids.sort((a, b) => a - b);
  }

  return { ok: true, options: out };
}

/** Stable key so the same drink with the same choices merges into one cart line. */
export function optionsKey(o: CartLineOptions): string {
  return [
    o.temperature ?? "",
    o.flavour ?? "",
    o.sugar ?? "",
    o.ice ?? "",
    (o.toppings ?? []).join("."),
  ].join("|");
}

export function describeOptions(o: CartLineOptions, toppingNames: (id: number) => string | undefined): string {
  const parts: string[] = [];
  if (o.temperature) parts.push(o.temperature === "hot" ? "Hot" : "Cold");
  if (o.flavour) parts.push(o.flavour === "matcha" ? "Matcha" : "Original flavour");
  if (o.sugar) parts.push(`${o.sugar}% sugar`);
  if (o.ice) parts.push(o.ice === "less" ? "Less ice" : "Normal ice");
  for (const id of o.toppings ?? []) parts.push(`+ ${toppingNames(id) ?? "Topping"}`);
  return parts.join(" · ");
}
