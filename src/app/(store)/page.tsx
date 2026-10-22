import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { FeaturedMenu } from "@/components/home/FeaturedMenu";
import { Eyebrow, Gallery, Hero, MadeYourWay, MatchaSeries, Signatures, StoreBand, wrap, type MatchaItem, type Signature } from "@/components/home/HomeSections";
import { BranchFinder } from "@/components/branches/BranchFinder";
import { toCardProduct } from "@/components/product/types";
import { listCategories, loadCatalog } from "@/lib/services/catalog";
import { listBranches, rankBranches } from "@/lib/services/branches";
import { livePromotions } from "@/lib/services/promotions";
import { getSettings } from "@/lib/services/settings";
import { selectedBranch } from "@/lib/request";
import { formatBDT } from "@/lib/money";

export const metadata: Metadata = {
  title: { absolute: "CHAJOY BD — Ice Cream & Tea in Dhaka" },
  description:
    "Every sip brings joy. Order CHAJOY boba milk tea, fruit teas, milkshakes, matcha ice cream and sundaes, and find your nearest CHAJOY branch in Dhaka.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const branch = await selectedBranch();
  const [settings, catalog, categories, ranked, promos, branches] = await Promise.all([
    getSettings(),
    loadCatalog(branch?.id ?? null),
    listCategories(),
    rankBranches({ origin: null }),
    livePromotions(),
    listBranches(),
  ]);
  const sellable = catalog.filter((p) => !p.isAddon);
  const cats = categories.filter((c) => !c.isAddonCategory);

  const tabs = [
    { id: "featured", label: "Popular", items: [...sellable.filter((p) => p.isFeatured), ...sellable.filter((p) => !p.isFeatured)].slice(0, 8).map(toCardProduct) },
    ...cats.map((c) => ({ id: c.slug, label: c.name, items: sellable.filter((p) => p.category.slug === c.slug).map(toCardProduct) })),
  ].filter((t) => t.items.length);

  const bySlug = new Map(sellable.map((p) => [p.slug, p]));
  const from = (slug: string) => {
    const p = bySlug.get(slug);
    return p ? formatBDT(p.fromPricePaisa) : null;
  };

  const signatures: Signature[] = [
    { slug: "boba-milk-tea", note: "Brown sugar pearls", image: "/images/cutouts/hq/boba-milk-tea.webp", tint: ["#f6e7d3", "#e9c9a2"] as [string, string] },
    { slug: "chocolate-oreo-crumb-sundae", note: "Original or matcha", image: "/images/cutouts/hq/chocolate-oreo-crumb-sundae--original.webp", tint: ["#efe4dc", "#d8bba6"] as [string, string] },
    { slug: "strawberry-sundae", note: "Shown in matcha", image: "/images/cutouts/hq/strawberry-sundae--matcha.webp", tint: ["#eef4dc", "#cfe0a0"] as [string, string] },
  ].flatMap((s) => {
    const p = bySlug.get(s.slug);
    return p ? [{ ...s, name: p.name, nameZh: p.nameZh, price: formatBDT(p.fromPricePaisa) }] : [];
  });

  const toppings = catalog.filter((p) => p.isAddon).map((p) => ({ name: p.name, price: formatBDT(p.fromPricePaisa) }));

  const matcha: MatchaItem[] = [
    { slug: "ice-cream", name: "Matcha soft serve cone" },
    { slug: "strawberry-sundae", name: "Matcha Strawberry Sundae" },
    { slug: "brown-sugar-boba-sundae", name: "Matcha Brown Sugar Boba Sundae" },
    { slug: "matcha-oreo-shake-milkshake", name: "Matcha Oreo Shake" },
  ].flatMap((m) => {
    const price = from(m.slug);
    return price ? [{ name: m.name, price: m.slug === "matcha-oreo-shake-milkshake" ? `from ${price}` : price, href: `/products/${m.slug}` }] : [];
  });

  const fromPrice = sellable.length ? formatBDT(Math.min(...sellable.map((p) => p.fromPricePaisa))) : "";

  return (
    <>
      <Hero copy={settings.hero} stats={{ items: sellable.length, branches: branches.length, fromPrice }} />
      {signatures.length > 0 && <Signatures items={signatures} />}
      <FeaturedMenu tabs={tabs} branchName={branch?.name ?? null} />
      <StoreBand branches={branches.length} />
      <MadeYourWay toppings={toppings} />
      {matcha.length > 0 && <MatchaSeries items={matcha} />}

      <section id="branches" className="scroll-mt-24 bg-ivory py-24 sm:py-32" aria-labelledby="near-title">
        <div className={wrap}>
          <Eyebrow>Pickup &amp; delivery</Eyebrow>
          <h2 id="near-title" className="font-display text-[44px] leading-[1] tracking-[-0.02em] text-ink sm:text-[60px]">
            Find <em className="text-matcha-600">your nearest</em> CHAJOY
          </h2>
          <p className="mb-12 mt-5 max-w-xl text-[16px] text-ink/60">Share your location or search your area to see the nearest branch, whether it&apos;s open, and what it can make for you.</p>
          <BranchFinder initial={ranked} />
        </div>
      </section>

      {promos.length > 0 && (
        <section className="bg-white py-24" aria-labelledby="offers-title">
          <div className={wrap}>
            <Eyebrow>Offers</Eyebrow>
            <h2 id="offers-title" className="font-display text-[44px] leading-none tracking-[-0.02em] text-ink sm:text-[52px]">
              Little extras, <em className="text-matcha-600">on us</em>
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {promos.slice(0, 4).map((p) => (
                <article key={p.id} className="rounded-[24px] bg-ivory p-7 ring-1 ring-black/5">
                  <Tag className="size-5 text-matcha-600" />
                  <h3 className="mt-3 font-display text-2xl text-ink">{p.title}</h3>
                  {p.description && <p className="mt-1 text-ink/70">{p.description}</p>}
                  {p.rules.some((r) => r.code) && (
                    <p className="mt-3 text-sm">
                      Use code{" "}
                      {p.rules
                        .filter((r) => r.code)
                        .map((r) => (
                          <code key={r.id} className="rounded-lg bg-white px-2 py-1 font-bold">
                            {r.code}
                          </code>
                        ))}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-ink/55">
                    Valid until {p.endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}. {p.terms}
                  </p>
                </article>
              ))}
            </div>
            <Link href="/offers" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink underline underline-offset-4">
              All offers <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      )}

      <Gallery instagram={settings.social.instagram} facebook={settings.social.facebook} />
    </>
  );
}
