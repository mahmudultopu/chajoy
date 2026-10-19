"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import type { CardProduct } from "@/components/product/types";

export function FeaturedMenu({ tabs, branchName }: { tabs: { id: string; label: string; items: CardProduct[] }[]; branchName: string | null }) {
  const [tab, setTab] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = rail.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    rail.current?.scrollTo({ left: 0 });
    update();
  }, [tab]);
  const scrollBy = (dir: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section id="discover" className="scroll-mt-24 pt-20 sm:pt-28" aria-labelledby="discover-title">
      <div className="container-x flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-3">{branchName ? `Prices at ${branchName}` : "Menu prices · choose a branch for availability"}</p>
          <h2 id="discover-title" className="font-display text-4xl font-semibold leading-[1.02] tracking-tight text-forest-900 sm:text-5xl lg:text-6xl">
            <em className="font-medium text-matcha-600">Discover</em> our menu
          </h2>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Menu categories">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === current?.id}
              aria-controls="featured-panel"
              onClick={() => setTab(t.id)}
              className={clsx(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                t.id === current?.id ? "border-forest-900 bg-forest-900 text-cream-50" : "border-forest-900/15 bg-white text-forest-900 hover:border-forest-900/40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-10">
        <div
          id="featured-panel"
          role="tabpanel"
          ref={rail}
          onScroll={update}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-6 sm:px-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))] [&::-webkit-scrollbar]:hidden"
        >
          {current?.items.map((p, i) => (
            <div key={p.id} className="w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-[290px]">
              <ProductCard p={p} priority={i < 2} branchName={branchName} />
            </div>
          ))}
          <Link
            href={current && current.id !== "featured" ? `/menu/${current.id}` : "/menu"}
            className="group flex w-[60vw] max-w-[240px] shrink-0 snap-start flex-col items-start justify-end rounded-4xl bg-forest-900 p-6 text-cream-50 sm:w-[240px]"
          >
            <span className="font-display text-3xl font-semibold leading-tight">
              See {current && current.id !== "featured" ? `all ${current.label.toLowerCase()}` : "the full menu"}
            </span>
            <span className="mt-4 grid size-11 place-items-center rounded-full bg-matcha-400 text-forest-950 transition group-hover:translate-x-1">
              <ArrowRight className="size-5" />
            </span>
          </Link>
        </div>
        <div className="container-x hidden justify-end gap-2 sm:flex">
          <button onClick={() => scrollBy(-1)} disabled={edges.start} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-forest-900/10 transition hover:bg-forest-900 hover:text-cream-50 disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-forest-900" aria-label="Previous items">
            <ArrowLeft className="size-5" />
          </button>
          <button onClick={() => scrollBy(1)} disabled={edges.end} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-forest-900/10 transition hover:bg-forest-900 hover:text-cream-50 disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-forest-900" aria-label="Next items">
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
