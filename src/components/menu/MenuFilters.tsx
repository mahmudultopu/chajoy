"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";

export function MenuFilters({
  categories,
  activeCategory,
  sizes,
  sortOptions,
  branchSelected,
}: {
  categories: { slug: string; name: string; count: number }[];
  activeCategory: string | null;
  sizes: { code: string; label: string }[];
  sortOptions: { value: string; label: string }[];
  branchSelected: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // debounce search typing
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => set({ q: q.trim() || null }), 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const size = params.get("size");
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";
  const sort = params.get("sort") ?? "";
  const available = params.get("available") === "1";
  const qs = params.toString();
  const activeFilters = [size, min, max, available ? "1" : null].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden" aria-label="Categories">
        <Link
          href={`/menu${qs ? `?${qs}` : ""}`}
          className={clsx("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", !activeCategory ? "border-forest-900 bg-forest-900 text-cream-50" : "border-forest-900/15 bg-white text-forest-900")}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/menu/${c.slug}${qs ? `?${qs}` : ""}`}
            className={clsx("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", activeCategory === c.slug ? "border-forest-900 bg-forest-900 text-cream-50" : "border-forest-900/15 bg-white text-forest-900")}
            aria-current={activeCategory === c.slug ? "page" : undefined}
          >
            {c.name} <span className="opacity-50">{c.count}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-forest-900/45" />
          <label htmlFor="menu-q" className="sr-only">
            Search the menu
          </label>
          <input id="menu-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, flavour or 中文…" className="input pl-11" type="search" />
          {pending && <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-matcha-600" />}
        </div>
        <button onClick={() => setOpen((v) => !v)} className={clsx("btn-ghost", activeFilters && "border-forest-900")} aria-expanded={open}>
          <SlidersHorizontal className="size-4" /> Filters {activeFilters ? `(${activeFilters})` : ""}
        </button>
        <label htmlFor="menu-sort" className="sr-only">
          Sort
        </label>
        <select id="menu-sort" value={sort} onChange={(e) => set({ sort: e.target.value || null })} className="input w-auto py-2.5">
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div className="grid gap-5 rounded-4xl bg-white p-5 ring-1 ring-forest-900/5 sm:grid-cols-3">
          <fieldset>
            <legend className="label">Cup size</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s.code}
                  onClick={() => set({ size: size === s.code ? null : s.code })}
                  aria-pressed={size === s.code}
                  className={clsx("rounded-full border px-3.5 py-1.5 text-sm font-semibold", size === s.code ? "border-forest-900 bg-forest-900 text-cream-50" : "border-forest-900/15")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Price (৳)</legend>
            <div className="flex items-center gap-2">
              <input
                aria-label="Minimum price"
                inputMode="numeric"
                defaultValue={min}
                placeholder="Min"
                className="input py-2"
                onBlur={(e) => set({ min: e.target.value.replace(/\D/g, "") || null })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
              <span className="text-forest-900/40">–</span>
              <input
                aria-label="Maximum price"
                inputMode="numeric"
                defaultValue={max}
                placeholder="Max"
                className="input py-2"
                onBlur={(e) => set({ max: e.target.value.replace(/\D/g, "") || null })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Availability</legend>
            <label className={clsx("flex items-center gap-2 text-sm", !branchSelected && "opacity-50")}>
              <input type="checkbox" disabled={!branchSelected} checked={available} onChange={(e) => set({ available: e.target.checked ? "1" : null })} className="size-4 accent-forest-800" />
              Only items my branch can make now
            </label>
            {!branchSelected && <p className="mt-1 text-xs text-forest-900/55">Choose a branch to use this filter.</p>}
          </fieldset>
          {activeFilters > 0 && (
            <button onClick={() => set({ size: null, min: null, max: null, available: null })} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-900/70 hover:text-forest-900 sm:col-span-3">
              <X className="size-4" /> Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
