import type { MenuProduct } from "@/lib/services/catalog";
import { describeOptions } from "@/lib/options";
import { renderBg, renderFor } from "@/lib/renders";

export type CardProduct = {
  id: number;
  slug: string;
  name: string;
  nameZh: string | null;
  category: string;
  accent: string | null;
  isFeatured: boolean;
  availability: MenuProduct["availability"];
  /** studio render (3D illustration) — preferred card image */
  render: string | null;
  renderAlt: string | null;
  renderBg: string | null;
  /** official CHAJOY photo, used when there's no render */
  image: { url: string; alt: string } | null;
  variants: { id: number; sizeCode: string; label: string; pricePaisa: number; available: boolean }[];
  defaultOptionsLabel: string;
};

/** Trim a catalogue product to what a card needs (keeps client payloads small). */
export function toCardProduct(p: MenuProduct): CardProduct {
  const c = p.optionConfig;
  const defaults = describeOptions(
    {
      temperature: c.temperatures?.[0],
      flavour: c.flavours?.[0],
      sugar: c.sugar ? 100 : undefined,
      ice: c.ice ? "normal" : undefined,
    },
    () => undefined,
  );
  const render = renderFor(p.slug);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameZh: p.nameZh,
    category: p.category.name,
    accent: p.category.accent,
    isFeatured: p.isFeatured,
    availability: p.availability,
    render,
    renderAlt: p.slug.endsWith("-sundae") ? renderFor(p.slug, "matcha") : null,
    renderBg: renderBg(p.slug),
    image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
    variants: p.variants.map((v) => ({ id: v.id, sizeCode: v.sizeCode, label: v.label, pricePaisa: v.pricePaisa, available: v.available })),
    defaultOptionsLabel: defaults,
  };
}
