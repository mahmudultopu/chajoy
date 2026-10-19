"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { LoaderCircle, Plus } from "lucide-react";
import { formatBDT } from "@/lib/money";
import { useStore } from "@/components/store/StoreProvider";
import type { CardProduct } from "./types";
import { tint } from "@/lib/color";

export function ProductCard({ p, priority, branchName }: { p: CardProduct; priority?: boolean; branchName?: string | null }) {
  const { addItem, busy } = useStore();
  const [variantId, setVariantId] = useState(p.variants.find((v) => v.available)?.id ?? p.variants[0]?.id);
  const [adding, setAdding] = useState(false);
  const v = p.variants.find((x) => x.id === variantId) ?? p.variants[0];
  const canAdd = p.availability === "available" || p.availability === "no_branch";
  const alt = p.altImage;

  const quickAdd = async () => {
    if (!v) return;
    setAdding(true);
    const label = [p.name, p.variants.length > 1 ? v.sizeCode : null, p.defaultOptionsLabel].filter(Boolean).join(" · ");
    await addItem({ productId: p.id, variantId: v.id, quantity: 1, options: {}, label });
    setAdding(false);
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-4xl bg-white shadow-soft ring-1 ring-forest-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative block aspect-[4/5] overflow-hidden" style={{ background: tint(p.accent) }}>
        <span aria-hidden className="absolute left-1/2 top-[56%] size-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-2xl" />
        {p.image && (
          <Image
            src={p.image.url}
            alt={p.image.alt}
            fill
            priority={priority}
            sizes="(min-width:1280px) 280px, (min-width:768px) 30vw, 46vw"
            className={clsx("menu-photo object-contain p-[9%] transition duration-500 group-hover:scale-[1.06] group-hover:-rotate-2", alt && "group-hover:opacity-0")}
          />
        )}
        {alt && (
          <Image src={alt.url} alt="" fill sizes="(min-width:1280px) 280px, 46vw" className="menu-photo object-contain p-[9%] opacity-0 transition duration-500 group-hover:scale-[1.06] group-hover:opacity-100" />
        )}
        {p.isFeatured && <span className="absolute left-3 top-3 rounded-full bg-lemon-400 px-2.5 py-1 text-[11px] font-bold text-forest-950">On the menu board</span>}
        {p.availability === "unavailable_at_branch" && (
          <span className="absolute inset-x-3 bottom-3 rounded-2xl bg-forest-950/80 px-3 py-2 text-center text-xs font-semibold text-cream-50 backdrop-blur">
            Currently unavailable{branchName ? ` at ${branchName.replace(/^CHAJOY\s+/, "")}` : " at this branch"}
          </span>
        )}
        {p.availability === "unavailable" && (
          <span className="absolute inset-x-3 bottom-3 rounded-2xl bg-forest-950/80 px-3 py-2 text-center text-xs font-semibold text-cream-50">Temporarily unavailable</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-matcha-700">{p.category}</p>
          <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-forest-900">
            <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">
              {p.name}
            </Link>
          </h3>
          {p.nameZh && <p className="text-xs text-forest-900/45">{p.nameZh}</p>}
        </div>
        <div className="relative z-10 mt-auto flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-full bg-lemon-300/70 p-1" role="radiogroup" aria-label={`${p.name} size`}>
            {p.variants.length > 1 ? (
              p.variants.map((x) => (
                <button
                  key={x.id}
                  role="radio"
                  aria-checked={x.id === v?.id}
                  onClick={() => setVariantId(x.id)}
                  className={clsx(
                    "flex-1 rounded-full px-2 py-1.5 text-xs font-bold tabular-nums transition",
                    x.id === v?.id ? "bg-white text-forest-950 shadow-sm" : "text-forest-950/70 hover:text-forest-950",
                    !x.available && p.availability !== "no_branch" && "line-through opacity-50",
                  )}
                >
                  {x.sizeCode} · {formatBDT(x.pricePaisa)}
                </button>
              ))
            ) : (
              <span className="flex-1 px-3 py-1.5 text-xs font-bold text-forest-950">
                {v?.sizeCode && v.sizeCode !== "ONE" ? `${v.sizeCode} · ` : ""}
                {v ? formatBDT(v.pricePaisa) : "—"}
              </span>
            )}
          </div>
          <button
            onClick={quickAdd}
            disabled={!canAdd || busy || adding || (!v?.available && p.availability !== "no_branch")}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-forest-900 text-cream-50 transition hover:bg-matcha-600 disabled:bg-forest-900/25"
            aria-label={`Quick add ${p.name}${p.variants.length > 1 && v ? `, ${v.label}` : ""}`}
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
    <div className="overflow-hidden rounded-4xl bg-white ring-1 ring-forest-900/5">
      <div className="skeleton aspect-[4/5] rounded-none" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-9 w-full rounded-full" />
      </div>
    </div>
  );
}
