/** Menu search dialog (opened with the search icon, / or Ctrl+K). */

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { clsx } from "clsx";
import { Dialog } from "@/components/ui/Dialog";
import { useStore } from "./StoreProvider";

type Suggestion = { slug: string; name: string; nameZh: string | null; category: string; image: string | null; price: string; multiplePrices: boolean; availability: string };

const POPULAR = ["Boba", "Matcha", "Sundae", "Peach", "Lemon", "Milkshake"];

/** Shows live suggestions as the visitor types. */
export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 30);
  }, [searchOpen]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setItems([]);
      setTotal(0);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const d = await r.json();
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
        setActive(0);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const close = () => setSearchOpen(false);
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) go(`/products/${items[active].slug}`);
      else if (q.trim()) go(`/menu?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <Dialog open={searchOpen} onClose={close} title="Search the menu" hideTitle>
      <div className="px-5 pb-6 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-forest-900/45" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search drinks, ice cream, flavours…"
            className="input h-14 pl-12 text-base"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="search-results"
            aria-activedescendant={items[active] ? `sr-${items[active].slug}` : undefined}
            autoComplete="off"
          />
          {loading && <LoaderCircle className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-matcha-600" />}
        </div>

        {!q.trim() && (
          <div className="mt-5">
            <p className="eyebrow mb-2">Try</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button key={p} onClick={() => setQ(p)} className="chip hover:bg-matcha-100">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {q.trim() && !loading && items.length === 0 && (
          <div className="py-10 text-center">
            <p className="font-display text-lg text-forest-900">No matches for “{q.trim()}”</p>
            <p className="mt-1 text-sm text-forest-900/60">Try a flavour like “strawberry”, or browse the full menu.</p>
            <button onClick={() => go("/menu")} className="btn-ghost mt-4">
              Browse the menu
            </button>
          </div>
        )}

        {items.length > 0 && (
          <ul id="search-results" role="listbox" className="mt-4 flex flex-col gap-1">
            {items.map((it, i) => (
              <li key={it.slug} id={`sr-${it.slug}`} role="option" aria-selected={i === active}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(`/products/${it.slug}`)}
                  className={clsx("flex w-full items-center gap-3 rounded-2xl p-2 text-left", i === active ? "bg-matcha-100" : "hover:bg-white")}
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-matcha-50">
                    {it.image && <Image src={it.image} alt="" fill sizes="56px" className="menu-photo object-contain p-0.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-forest-900">{it.name}</span>
                    <span className="block text-xs text-forest-900/60">
                      {it.category}
                      {it.nameZh ? ` · ${it.nameZh}` : ""}
                      {it.availability === "unavailable_at_branch" ? " · not at your branch" : ""}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-forest-900">
                    {it.multiplePrices ? "from " : ""}
                    {it.price}
                  </span>
                </button>
              </li>
            ))}
            {total > items.length && (
              <li>
                <button onClick={() => go(`/menu?q=${encodeURIComponent(q.trim())}`)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white p-3 text-sm font-semibold text-forest-900 ring-1 ring-forest-900/10">
                  See all {total} results <ArrowRight className="size-4" />
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
