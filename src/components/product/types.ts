import type { MenuProduct } from "@/lib/services/catalog";
import { describeOptions } from "@/lib/options";

export type CardProduct = {
  id: number;
  slug: string;
  name: string;
  nameZh: string | null;
  category: string;
  accent: string | null;
  isFeatured: boolean;
  availability: MenuProduct["availability"];
  image: { url: string; alt: string } | null;
  altImage: { url: string } | null;
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
  const flavourImg = p.images.find((i) => i.variantKey === "flavour:matcha");
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameZh: p.nameZh,
    category: p.category.name,
    accent: p.category.accent,
    isFeatured: p.isFeatured,
    availability: p.availability,
    image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
    altImage: flavourImg ? { url: flavourImg.url } : null,
    variants: p.variants.map((v) => ({ id: v.id, sizeCode: v.sizeCode, label: v.label, pricePaisa: v.pricePaisa, available: v.available })),
    defaultOptionsLabel: defaults,
  };
}
