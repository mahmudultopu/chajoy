"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { LoaderCircle, Plus } from "lucide-react";
import { formatBDT } from "@/lib/money";
import { useStore } from "@/components/store/StoreProvider";
import type { CardProduct } from "./types";

/**
 * Product card: the official CHAJOY photo on a soft, lightly tinted stage
 * (light backgrounds keep cut-out edges invisible), size chips and quick add.
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

  const ml = (x: CardProduct["variants"][number]) => x.label.split("·")[1]?.trim();

  return (
    <article className="group relative flex h-full flex-col rounded-[24px] bg-white p-2 ring-1 ring-black/[0.06] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(16,41,26,0.35)]">
      <Link
        href={`/products/${p.slug}`}
        className="relative block aspect-[1/1.05] overflow-hidden rounded-[18px]"
        style={{ background: `radial-gradient(circle at 50% 42%, #ffffff 0%, ${p.backdrop[0]} 58%, ${p.backdrop[0]} 100%)` }}
        aria-label={p.name}
      >
        <span aria-hidden className="absolute bottom-[7%] left-1/2 h-[6%] w-[46%] -translate-x-1/2 rounded-[50%] bg-black/15 blur-md" />
        {p.image &&
          (p.image.cut ? (
            <>
              <Image
                src={p.image.url}
                alt={p.image.alt}
                fill
                priority={priority}
                quality={90}
                sizes="(min-width:1280px) 300px, (min-width:1024px) 24vw, 46vw"
                className={clsx("object-contain px-[14%] pb-[9%] pt-[10%] drop-shadow-[0_16px_18px_rgba(0,0,0,0.16)] transition duration-700 group-hover:scale-[1.05]", p.hoverImage && "group-hover:opacity-0")}
              />
              {p.hoverImage && (
                <Image src={p.hoverImage} alt="" fill quality={90} sizes="(min-width:1280px) 300px, 46vw" className="object-contain px-[14%] pb-[9%] pt-[10%] opacity-0 drop-shadow-[0_16px_18px_rgba(0,0,0,0.16)] transition duration-700 group-hover:scale-[1.05] group-hover:opacity-100" />
              )}
            </>
          ) : (
            <Image src={p.image.url} alt={p.image.alt} fill sizes="300px" className="object-cover" />
          ))}
        {p.hoverImage && <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-ink/70 backdrop-blur">Original · Matcha</span>}
        {p.availability === "unavailable_at_branch" && (
          <span className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur">
            Currently unavailable{branchName ? ` at ${branchName.replace(/^CHAJOY\s+/, "")}` : " at this branch"}
          </span>
        )}
        {p.availability === "unavailable" && <span className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white">Temporarily unavailable</span>}
      </Link>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/40">{p.category}</p>
        <h3 className="mt-1.5 font-display text-[21px] leading-tight text-ink">
          <Link href={`/products/${p.slug}`} className="hover:underline hover:decoration-1 hover:underline-offset-4">
            {p.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="min-w-0">
            <p className="font-display text-[22px] leading-none text-ink">{v ? formatBDT(v.pricePaisa) : "—"}</p>
            {p.variants.length > 1 ? (
              <div className="mt-2.5 flex flex-wrap gap-1" role="group" aria-label={`Size for ${p.name}`}>
                {p.variants.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => setVariantId(x.id)}
                    aria-pressed={x.id === v?.id}
                    title={x.label}
                    className={clsx("rounded-full px-2.5 py-1 text-[11px] font-semibold transition", x.id === v?.id ? "bg-ink text-white" : "bg-ivory text-ink/60 hover:text-ink")}
                  >
                    {x.sizeCode}
                    {ml(x) ? <span className="ml-1 hidden font-normal opacity-70 sm:inline">{ml(x)}</span> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2.5 text-[12px] text-ink/45">{v?.sizeCode === "ONE" ? v.label : v ? `${v.sizeCode}${ml(v) ? ` · ${ml(v)}` : ""}` : ""}</p>
            )}
          </div>
          <button
            onClick={quickAdd}
            disabled={!canAdd || busy || adding}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-matcha-600 disabled:opacity-30"
            aria-label={`Add ${p.name}${p.variants.length > 1 && v ? `, ${v.label}` : ""} to cart`}
            title={canAdd ? `Add with default options (${p.defaultOptionsLabel || "regular"})` : "Not available"}
          >
            {adding ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-5" />}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[24px] bg-white p-2 ring-1 ring-black/[0.06]">
      <div className="skeleton aspect-[1/1.05] rounded-[18px]" />
      <div className="space-y-3 p-3">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-8 w-1/2" />
      </div>
    </div>
  );
}
