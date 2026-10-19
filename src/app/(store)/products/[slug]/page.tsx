import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { loadCatalog } from "@/lib/services/catalog";
import { listBranches } from "@/lib/services/branches";
import { selectedBranch } from "@/lib/request";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductCard } from "@/components/product/ProductCard";
import { toCardProduct } from "@/components/product/types";
import { absoluteUrl } from "@/lib/site";
import { paisaToDecimalString } from "@/lib/money";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [p] = await db.select().from(schema.products).where(eq(schema.products.slug, slug));
  if (!p || p.isAddon || p.status === "inactive") return { title: "Not found" };
  const [img] = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, p.id)).orderBy(schema.productImages.sortOrder).limit(1);
  return {
    title: p.name,
    description: p.description ?? `${p.name} from CHAJOY.`,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { images: img ? [img.url] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const branch = await selectedBranch();
  const [catalog, branches] = await Promise.all([loadCatalog(branch?.id ?? null), listBranches()]);
  const p = catalog.find((x) => x.slug === slug && !x.isAddon);
  if (!p) notFound();

  const bps = await db.select().from(schema.branchProducts).where(eq(schema.branchProducts.productId, p.id));
  const availableAt = branches.filter((b) => bps.some((r) => r.branchId === b.id && r.isAvailable));
  const toppings = catalog
    .filter((x) => x.isAddon && x.status === "active")
    .map((t) => ({ id: t.id, name: t.name, pricePaisa: t.variants[0]?.pricePaisa ?? 0, image: t.image?.url ?? null, available: branch ? t.availability === "available" : true }));
  const related = catalog.filter((x) => !x.isAddon && x.id !== p.id && x.category.slug === p.category.slug && x.availability !== "unavailable").slice(0, 4);

  const prices = p.variants.map((v) => v.pricePaisa);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    alternateName: p.nameZh ?? undefined,
    description: p.description ?? undefined,
    image: p.images.map((i) => absoluteUrl(i.url)),
    category: p.category.name,
    brand: { "@type": "Brand", name: "CHAJOY" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      lowPrice: paisaToDecimalString(Math.min(...prices)),
      highPrice: paisaToDecimalString(Math.max(...prices)),
      offerCount: p.variants.length,
      availability: p.status === "active" && availableAt.length ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-x pb-16 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-forest-900/55">
        <Link href="/" className="hover:text-forest-900">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/menu" className="hover:text-forest-900">
          Menu
        </Link>{" "}
        /{" "}
        <Link href={`/menu/${p.category.slug}`} className="hover:text-forest-900">
          {p.category.name}
        </Link>{" "}
        / <span className="text-forest-900">{p.name}</span>
      </nav>

      <ProductDetail
        branchName={branch?.name ?? null}
        p={{
          id: p.id,
          name: p.name,
          nameZh: p.nameZh,
          description: p.description,
          category: p.category.name,
          accent: p.category.accent,
          availability: p.availability,
          optionConfig: p.optionConfig,
          visual: p.model3d?.kind === "procedural" ? p.model3d.visual : null,
          images: p.images.map((i) => ({ url: i.url, alt: i.alt, variantKey: i.variantKey, sourceType: i.sourceType, isLowRes: i.isLowRes })),
          variants: p.variants.map((v) => ({ id: v.id, sizeCode: v.sizeCode, label: v.label, volumeMl: v.volumeMl, pricePaisa: v.pricePaisa, available: v.available, stockNote: v.stockNote })),
          toppings,
        }}
      />

      <section className="mt-16" aria-labelledby="where-title">
        <h2 id="where-title" className="font-display text-2xl font-semibold text-forest-900">
          Where to find it
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {branches.map((b) => {
            const ok = availableAt.some((a) => a.id === b.id);
            return (
              <li key={b.id}>
                <Link href={`/branches/${b.slug}`} className={`chip ${ok ? "bg-matcha-100" : "opacity-60"}`}>
                  {b.name.replace(/^CHAJOY\s+/, "")} · {ok ? "on the menu" : "not available"}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="rel-title">
          <h2 id="rel-title" className="font-display text-3xl font-semibold text-forest-900">
            More {p.category.name.toLowerCase()}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={toCardProduct(r)} branchName={branch?.name ?? null} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
