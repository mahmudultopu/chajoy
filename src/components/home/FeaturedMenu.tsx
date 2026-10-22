/** "Discover the menu" section on the homepage: category tabs over a product grid. */

"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import type { CardProduct } from "@/components/product/types";

/** Shows up to eight products for the selected tab, with a link to the full list. */
export function FeaturedMenu({ tabs, branchName }: { tabs: { id: string; label: string; items: CardProduct[] }[]; branchName: string | null }) {
  const [tab, setTab] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const shown = current?.items.slice(0, 8) ?? [];
  const more = current && current.id !== "featured" ? `/menu/${current.id}` : "/menu";

  return (
    <section id="discover" className="scroll-mt-24 bg-cream-100 py-24 sm:py-32" aria-labelledby="discover-title">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-matcha-600">{branchName ? `Prices at ${branchName}` : "Menu prices"}</p>
            <h2 id="discover-title" className="font-display text-[44px] leading-[1] tracking-[-0.02em] text-ink sm:text-[60px]">
              <em>Discover</em> the menu
            </h2>
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0" role="tablist" aria-label="Menu categories">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === current?.id}
                aria-controls="featured-panel"
                onClick={() => setTab(t.id)}
                className={clsx("shrink-0 rounded-full px-5 py-2.5 text-[14px] font-medium transition", t.id === current?.id ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div id="featured-panel" role="tabpanel" className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {shown.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 4} branchName={branchName} />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link href={more} className="inline-flex items-center gap-3 rounded-full border border-ink/15 px-7 py-4 text-[15px] font-semibold text-ink transition hover:bg-ink hover:text-white">
            {current && current.id !== "featured" ? `All ${current.label.toLowerCase()}` : "See the full menu"} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
