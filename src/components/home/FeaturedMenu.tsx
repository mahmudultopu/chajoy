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
    <section id="discover" className="scroll-mt-24 pt-20 sm:pt-24" aria-labelledby="discover-title">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <h2 id="discover-title" className="flex shrink-0 items-center gap-4 whitespace-nowrap font-display text-[38px] leading-none text-ink sm:text-[48px]">
          <span>
            <em>Discover</em> our menu
          </span>
          <span className="hidden h-px w-14 bg-ink sm:block" aria-hidden />
        </h2>
        <div className="flex min-w-0 items-center gap-3">
          <div className="-mx-4 min-w-0 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0" role="tablist" aria-label="Menu categories">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === current?.id}
                aria-controls="featured-panel"
                onClick={() => setTab(t.id)}
                className={clsx(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  t.id === current?.id ? "bg-pill text-ink" : "bg-[#f4f1ea] text-ink/75 hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button onClick={() => scrollBy(-1)} disabled={edges.start} className="grid size-10 place-items-center rounded-full ring-1 ring-black/15 transition hover:bg-pill disabled:opacity-35 disabled:hover:bg-transparent" aria-label="Previous items">
              <ArrowLeft className="size-4" />
            </button>
            <button onClick={() => scrollBy(1)} disabled={edges.end} className="grid size-10 place-items-center rounded-full ring-1 ring-black/15 transition hover:bg-pill disabled:opacity-35 disabled:hover:bg-transparent" aria-label="Next items">
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 w-full max-w-[1240px] px-4 text-sm text-ink/55 sm:px-6 lg:px-8">
        {branchName ? `Prices and availability at ${branchName}` : "Menu prices · choose a branch to see what it has today"}
      </p>

      <div
        id="featured-panel"
        role="tabpanel"
        ref={rail}
        onScroll={update}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 sm:px-6 lg:px-[max(2rem,calc((100vw-1240px)/2+2rem))] [&::-webkit-scrollbar]:hidden"
      >
        {current?.items.map((p, i) => (
          <div key={p.id} className="w-[72vw] max-w-[290px] shrink-0 snap-start sm:w-[280px]">
            <ProductCard p={p} priority={i < 2} branchName={branchName} />
          </div>
        ))}
        <Link
          href={current && current.id !== "featured" ? `/menu/${current.id}` : "/menu"}
          className="group flex w-[60vw] max-w-[240px] shrink-0 snap-start flex-col items-start justify-end rounded-2xl bg-pill p-6 text-ink sm:w-[240px]"
        >
          <span className="font-display text-3xl leading-tight">
            See {current && current.id !== "featured" ? `all ${current.label.toLowerCase()}` : "the full menu"}
          </span>
          <span className="mt-4 grid size-11 place-items-center rounded-full bg-white transition group-hover:translate-x-1">
            <ArrowRight className="size-5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
