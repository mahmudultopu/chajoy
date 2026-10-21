import type { MenuProduct } from "@/lib/services/catalog";
import { describeOptions } from "@/lib/options";
import { backdropFor, cutoutFor, cutoutOf } from "@/lib/cutouts";

export type CardProduct = {
  id: number;
  slug: string;
  name: string;
  nameZh: string | null;
  category: string;
  accent: string | null;
  isFeatured: boolean;
  availability: MenuProduct["availability"];
  /** official CHAJOY photo; `cut` = background removed so it can sit on the backdrop */
  image: { url: string; alt: string; cut: boolean } | null;
  /** second official photo shown on hover (e.g. the matcha version of a sundae) */
  hoverImage: string | null;
  backdrop: [string, string];
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
  // sundaes: lead with the single original cup, matcha on hover
  const single = p.slug.endsWith("-sundae") ? cutoutFor(`${p.slug}--original`) : null;
  const cut = single ?? cutoutOf(p.image?.url);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameZh: p.nameZh,
    category: p.category.name,
    accent: p.category.accent,
    isFeatured: p.isFeatured,
    availability: p.availability,
    image: p.image ? { url: cut ?? p.image.url, alt: p.image.alt, cut: !!cut } : null,
    hoverImage: single ? cutoutFor(`${p.slug}--matcha`) : null,
    backdrop: backdropFor(p.slug),
    variants: p.variants.map((v) => ({ id: v.id, sizeCode: v.sizeCode, label: v.label, pricePaisa: v.pricePaisa, available: v.available })),
    defaultOptionsLabel: defaults,
  };
}
