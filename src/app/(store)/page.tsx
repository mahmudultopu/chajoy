import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { FeaturedMenu } from "@/components/home/FeaturedMenu";
import { HeroBanner, JustRight, MatchaBanner, ToppingsWave, SocialStrip, VisitUs, wrap } from "@/components/home/HomeSections";
import { BranchFinder } from "@/components/branches/BranchFinder";
import { toCardProduct } from "@/components/product/types";
import { listCategories, loadCatalog } from "@/lib/services/catalog";
import { listBranches, rankBranches, toPublicBranch } from "@/lib/services/branches";
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

  const toppingPrices = catalog.filter((p) => p.isAddon).flatMap((p) => p.variants.map((v) => v.pricePaisa));
  const toppingPrice = toppingPrices.length && Math.min(...toppingPrices) === Math.max(...toppingPrices) ? formatBDT(toppingPrices[0]) : null;
  const matcha = sellable.filter((p) => /matcha/i.test(p.name) || p.optionConfig.flavours?.includes("matcha"));
  const matchaFrom = matcha.length ? Math.min(...matcha.map((p) => p.fromPricePaisa)) : null;
  const visit = branches.slice(0, 3).map((b) => {
    const pb = toPublicBranch(b);
    return { slug: pb.slug, name: pb.name, address: [pb.addressLine ?? pb.area, pb.city].filter(Boolean).join(", "), photo: pb.photoUrl, status: pb.openLabel };
  });

  return (
    <>
      <HeroBanner itemCount={sellable.length} copy={settings.hero} />
      <FeaturedMenu tabs={tabs} branchName={branch?.name ?? null} />
      {toppingPrice && <ToppingsWave price={toppingPrice} />}
      <JustRight />
      {matchaFrom !== null && <MatchaBanner fromPrice={formatBDT(matchaFrom)} />}

      <section id="branches" className={`${wrap} scroll-mt-24 pb-20 sm:pb-28`} aria-labelledby="near-title">
        <h2 id="near-title" className="mb-3 font-display text-[38px] leading-[1.05] text-ink sm:text-[48px]">
          Find <em>your nearest</em> chajoy
        </h2>
        <p className="mb-8 max-w-xl text-ink/70">Share your location or search your area to see the nearest branch, whether it&apos;s open, and what it can make for you.</p>
        <BranchFinder initial={ranked} />
      </section>

      {promos.length > 0 && (
        <section className={`${wrap} pb-20`} aria-labelledby="offers-title">
          <h2 id="offers-title" className="font-display text-[38px] leading-none text-ink sm:text-[46px]">
            Little extras, <em>on us</em>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {promos.slice(0, 4).map((p) => (
              <article key={p.id} className="rounded-2xl bg-pill/70 p-6">
                <Tag className="size-5 text-ink" />
                <h3 className="mt-3 font-display text-2xl text-ink">{p.title}</h3>
                {p.description && <p className="mt-1 text-ink/75">{p.description}</p>}
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
                <p className="mt-3 text-xs text-ink/60">
                  Valid until {p.endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}. {p.terms}
                </p>
              </article>
            ))}
          </div>
          <Link href="/offers" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink underline underline-offset-4">
            All offers <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      <SocialStrip instagram={settings.social.instagram} />
      <VisitUs branches={visit} />
    </>
  );
}
