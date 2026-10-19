import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { FeaturedMenu } from "@/components/home/FeaturedMenu";
import { Showcase } from "@/components/home/Showcase";
import { CategoryTiles, Marquee, SectionHeading, SocialSection, StorySection } from "@/components/home/Sections";
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
    { id: "featured", label: "On the menu board", items: sellable.filter((p) => p.isFeatured).map(toCardProduct) },
    ...cats.map((c) => ({ id: c.slug, label: c.name, items: sellable.filter((p) => p.category.slug === c.slug).map(toCardProduct) })),
  ].filter((t) => t.items.length);

  const tiles = cats.map((c) => {
    const items = sellable.filter((p) => p.category.slug === c.slug);
    const hero = items.find((p) => p.isFeatured) ?? items[0];
    return {
      slug: c.slug,
      name: c.name,
      menuName: c.menuName,
      accent: c.accent,
      image: hero?.image?.url ?? null,
      count: items.length,
      fromPaisa: items.length ? Math.min(...items.map((p) => p.fromPricePaisa)) : 0,
    };
  });

  const boba = sellable.find((p) => p.slug === "boba-milk-tea");
  const showcase =
    boba && boba.model3d?.kind === "procedural"
      ? {
          id: boba.id,
          slug: boba.slug,
          name: boba.name,
          nameZh: boba.nameZh,
          description: boba.description,
          image: boba.image?.url ?? null,
          visual: boba.model3d.visual,
          temperatures: boba.optionConfig.temperatures ?? [],
          variants: boba.variants.map((v) => ({ id: v.id, sizeCode: v.sizeCode, label: v.label, volumeMl: v.volumeMl, pricePaisa: v.pricePaisa, available: v.available })),
          availability: boba.availability,
        }
      : null;

  return (
    <>
      <Hero
        copy={settings.hero}
        callout={boba ? { name: boba.name, slug: boba.slug, prices: boba.variants.map((v) => `${v.sizeCode} ${formatBDT(v.pricePaisa)}`).join("  ·  ") } : null}
      />
      <Marquee />
      <FeaturedMenu tabs={tabs} branchName={branch?.name ?? null} />
      <CategoryTiles tiles={tiles} />
      {showcase && <Showcase p={showcase} branchName={branch?.name ?? null} />}

      <section id="branches" className="container-x scroll-mt-20 py-20 sm:py-28" aria-labelledby="near-title">
        <div id="near-title" className="mb-10">
          <SectionHeading eyebrow="Find a branch" title="Your favourite CHAJOY," accent="closer to you.">
            Share your location or search your area to see the nearest branch, whether it&apos;s open, and what it can make for you.
          </SectionHeading>
        </div>
        <BranchFinder initial={ranked} />
      </section>

      {promos.length > 0 && (
        <section className="container-x pb-20" aria-labelledby="offers-title">
          <div id="offers-title">
            <SectionHeading eyebrow="Offers" title="Little extras," accent="on us." />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {promos.slice(0, 4).map((p) => (
              <article key={p.id} className="rounded-4xl bg-lemon-300/60 p-6 ring-1 ring-forest-900/5">
                <Tag className="size-5 text-forest-900" />
                <h3 className="mt-3 font-display text-2xl font-semibold text-forest-900">{p.title}</h3>
                {p.description && <p className="mt-1 text-forest-900/75">{p.description}</p>}
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
                <p className="mt-3 text-xs text-forest-900/60">
                  Valid until {p.endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}. {p.terms}
                </p>
              </article>
            ))}
          </div>
          <Link href="/offers" className="btn-ghost mt-6">
            All offers <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      <StorySection title={settings.story.title} paragraphs={settings.story.paragraphs} branchCount={branches.length} />
      <SocialSection instagram={settings.social.instagram} facebook={settings.social.facebook} />
    </>
  );
}
