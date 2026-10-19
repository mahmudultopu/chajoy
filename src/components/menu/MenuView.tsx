import Link from "next/link";
import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { toCardProduct } from "@/components/product/types";
import { MenuFilters } from "./MenuFilters";
import { BranchButton } from "./BranchButton";
import { listCategories, loadCatalog, searchMenu, sortCapabilities, type MenuQuery } from "@/lib/services/catalog";
import { selectedBranch } from "@/lib/request";
import { parseTakaInput } from "@/lib/money";

export type MenuSearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function MenuView({ category, searchParams }: { category: string | null; searchParams: MenuSearchParams }) {
  const branch = await selectedBranch();
  const [all, categories, caps] = await Promise.all([loadCatalog(branch?.id ?? null), listCategories(), sortCapabilities()]);
  const sellableCats = categories.filter((c) => !c.isAddonCategory);
  const cat = category ? sellableCats.find((c) => c.slug === category) : null;

  const min = one(searchParams.min);
  const max = one(searchParams.max);
  const sortParam = one(searchParams.sort) as MenuQuery["sort"] | undefined;
  const allowedSorts = new Set(["featured", "price_asc", "price_desc", "name", ...(caps.popular ? ["popular"] : []), ...(caps.newest ? ["newest"] : [])]);
  const q = one(searchParams.q)?.slice(0, 60);
  const query: MenuQuery = {
    q,
    category: category ?? undefined,
    size: one(searchParams.size),
    minPaisa: min ? (parseTakaInput(min) ?? undefined) : undefined,
    maxPaisa: max ? (parseTakaInput(max) ?? undefined) : undefined,
    availableOnly: one(searchParams.available) === "1" && !!branch,
    sort: sortParam && allowedSorts.has(sortParam) ? sortParam : undefined,
    page: Math.max(1, Number(one(searchParams.page)) || 1),
    pageSize: 12,
  };
  const result = await searchMenu(all, query);

  const sortOptions = [
    { value: "", label: q ? "Best match" : "Recommended" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "name", label: "Name A–Z" },
    ...(caps.popular ? [{ value: "popular", label: "Most ordered" }] : []),
    ...(caps.newest ? [{ value: "newest", label: "Newest" }] : []),
  ];
  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    const s = one(v);
    if (s && k !== "page") nextParams.set(k, s);
  }
  nextParams.set("page", String(result.page + 1));
  const unavailableHere = branch ? result.items.filter((p) => p.availability === "unavailable_at_branch").length : 0;

  return (
    <div className="container-x pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-sm text-forest-900/55">
        <Link href="/" className="hover:text-forest-900">
          Home
        </Link>{" "}
        /{" "}
        {cat ? (
          <>
            <Link href="/menu" className="hover:text-forest-900">
              Menu
            </Link>{" "}
            / <span className="text-forest-900">{cat.name}</span>
          </>
        ) : (
          <span className="text-forest-900">Menu</span>
        )}
      </nav>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-5xl font-semibold leading-none tracking-tight text-forest-900 sm:text-6xl">
            {cat ? cat.name : (
              <>
                The CHAJOY <em className="font-medium text-matcha-600">menu</em>
              </>
            )}
          </h1>
          <p className="mt-3 max-w-xl text-forest-900/70">{cat?.description ?? "Milk teas, fruit teas, milkshakes, ice cream and sundaes — straight from our menu board."}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-forest-900/5">
          <MapPin className="size-4 text-matcha-600" />
          {branch ? (
            <span>
              Prices &amp; availability at <strong>{branch.name}</strong>
            </span>
          ) : (
            <span>Showing menu prices.</span>
          )}
          <BranchButton label={branch ? "Change" : "Choose branch"} />
        </div>
      </div>

      <div className="mt-8">
        <Suspense>
          <MenuFilters
            categories={sellableCats.map((c) => ({ slug: c.slug, name: c.name, count: all.filter((p) => !p.isAddon && p.category.slug === c.slug).length }))}
            activeCategory={category}
            sizes={[
              { code: "S", label: "Small · 370 ml" },
              { code: "M", label: "Medium · 500 ml" },
              { code: "L", label: "Large · 700 ml" },
            ]}
            sortOptions={sortOptions}
            branchSelected={!!branch}
          />
        </Suspense>
      </div>

      <p className="mt-6 text-sm text-forest-900/60" aria-live="polite">
        {result.total} item{result.total === 1 ? "" : "s"}
        {q ? ` for “${q}”` : ""}
        {unavailableHere ? ` · ${unavailableHere} currently unavailable at ${branch!.name}` : ""}
      </p>

      {result.items.length === 0 ? (
        <div className="mt-6 rounded-4xl bg-white p-10 text-center ring-1 ring-forest-900/5">
          <p className="font-display text-2xl font-semibold text-forest-900">Nothing matches that yet</p>
          <p className="mt-2 text-forest-900/65">Try another flavour, clear a filter, or browse everything on the menu.</p>
          <Link href="/menu" className="btn-primary mt-6">
            See the full menu
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {result.items.map((p, i) => (
            <ProductCard key={p.id} p={toCardProduct(p)} priority={i < 4} branchName={branch?.name ?? null} />
          ))}
        </div>
      )}

      {result.items.length < result.total && (
        <div className="mt-10 flex justify-center">
          <Link href={`?${nextParams}`} scroll={false} className="btn-ghost px-8">
            Load more ({result.total - result.items.length} left)
          </Link>
        </div>
      )}
      <p className="mt-10 text-xs text-forest-900/50">
        Product photos are taken from CHAJOY&apos;s official menu board. Ingredients and allergen details haven&apos;t been published yet — please ask the branch if you have an allergy.
      </p>
    </div>
  );
}
