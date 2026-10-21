"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, LoaderCircle, Plus } from "lucide-react";
import { formatBDT } from "@/lib/money";
import { useStore } from "@/components/store/StoreProvider";
import type { CardProduct } from "./types";

const SIZE_NAME: Record<string, string> = { S: "Small", M: "Medium", L: "Large" };

/**
 * Product card in the reference's style: full-bleed studio image, name, and
 * a yellow bar with the size picker and price.
 */
export function ProductCard({ p, priority, branchName }: { p: CardProduct; priority?: boolean; branchName?: string | null }) {
  const { addItem, busy } = useStore();
  const [variantId, setVariantId] = useState(p.variants.find((v) => v.available)?.id ?? p.variants[0]?.id);
  const [adding, setAdding] = useState(false);
  const v = p.variants.find((x) => x.id === variantId) ?? p.variants[0];
  const canAdd = (p.availability === "available" || p.availability === "no_branch") && (v?.available || p.availability === "no_branch");

  const quickAdd = async () => {
    if (!v) return;
    setAdding(true);
    const label = [p.name, p.variants.length > 1 ? v.sizeCode : null, p.defaultOptionsLabel].filter(Boolean).join(" · ");
    await addItem({ productId: p.id, variantId: v.id, quantity: 1, options: {}, label });
    setAdding(false);
  };

  const sizeText = (x: CardProduct["variants"][number]) => {
    if (x.sizeCode === "ONE") return x.label;
    const ml = x.label.split("·")[1]?.trim();
    return `${SIZE_NAME[x.sizeCode] ?? x.sizeCode}${ml ? ` (${ml})` : ""}`;
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-white transition duration-300 hover:shadow-lift">
      <Link
        href={`/products/${p.slug}`}
        className="relative block aspect-[1/0.92] overflow-hidden"
        style={{ background: `linear-gradient(180deg, ${p.backdrop[0]} 0%, ${p.backdrop[1]} 100%)` }}
        aria-label={p.name}
      >
        <span aria-hidden className="absolute bottom-[6%] left-1/2 h-[9%] w-[58%] -translate-x-1/2 rounded-[50%] bg-black/15 blur-md" />
        {p.image &&
          (p.image.cut ? (
            <>
              <Image
                src={p.image.url}
                alt={p.image.alt}
                fill
                priority={priority}
                sizes="(min-width:1280px) 290px, (min-width:768px) 30vw, 70vw"
                className={clsx("object-contain px-[8%] pb-[7%] pt-[9%] drop-shadow-[0_14px_18px_rgba(0,0,0,0.18)] transition duration-700 group-hover:scale-[1.06]", p.hoverImage && "group-hover:opacity-0")}
              />
              {p.hoverImage && (
                <Image src={p.hoverImage} alt="" fill sizes="(min-width:1280px) 290px, 70vw" className="object-contain px-[8%] pb-[7%] pt-[9%] opacity-0 drop-shadow-[0_14px_18px_rgba(0,0,0,0.18)] transition duration-700 group-hover:scale-[1.06] group-hover:opacity-100" />
              )}
            </>
          ) : (
            <Image src={p.image.url} alt={p.image.alt} fill sizes="290px" className="object-cover" />
          ))}
        {p.availability === "unavailable_at_branch" && (
          <span className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur">
            Currently unavailable{branchName ? ` at ${branchName.replace(/^CHAJOY\s+/, "")}` : " at this branch"}
          </span>
        )}
        {p.availability === "unavailable" && <span className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white">Temporarily unavailable</span>}
      </Link>

      <button
        onClick={quickAdd}
        disabled={!canAdd || busy || adding}
        className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/95 text-ink shadow-soft ring-1 ring-black/5 transition hover:bg-pill disabled:opacity-40"
        aria-label={`Add ${p.name}${p.variants.length > 1 && v ? `, ${v.label}` : ""} to cart`}
        title={canAdd ? `Add with default options (${p.defaultOptionsLabel || "regular"})` : "Not available"}
      >
        {adding ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-5" />}
      </button>

      <div className="flex flex-1 flex-col gap-3 px-3.5 pb-3.5 pt-3">
        <h3 className="text-[17px] font-semibold leading-snug text-ink">
          <Link href={`/products/${p.slug}`} className="hover:underline">
            {p.name}
          </Link>
        </h3>
        <div className="relative mt-auto flex items-center justify-between gap-2 rounded-[5px] bg-pill px-3 py-[7px] text-[13px] font-medium text-ink">
          {p.variants.length > 1 ? (
            <>
              <label className="sr-only" htmlFor={`size-${p.id}`}>
                Size for {p.name}
              </label>
              <select
                id={`size-${p.id}`}
                value={v?.id}
                onChange={(e) => setVariantId(Number(e.target.value))}
                className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pr-2 focus:outline-none"
              >
                {p.variants.map((x) => (
                  <option key={x.id} value={x.id}>
                    {sizeText(x)}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate">{v ? sizeText(v) : ""}</span>
          )}
          <span className="pointer-events-none flex shrink-0 items-center gap-1 text-[13px] font-bold tabular-nums">
            {v ? formatBDT(v.pricePaisa) : "—"}
            {p.variants.length > 1 && <ChevronDown className="size-3.5" />}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-3 p-3.5">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
