import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone, Store, Truck, TriangleAlert } from "lucide-react";
import { getBranchBySlug, toPublicBranch } from "@/lib/services/branches";
import { loadCatalog } from "@/lib/services/catalog";
import { getSettings } from "@/lib/services/settings";
import { DAYS, DAY_LABELS, formatHHMM, parseHHMM } from "@/lib/hours";
import { formatBDT } from "@/lib/money";
import { ProductCard } from "@/components/product/ProductCard";
import { toCardProduct } from "@/components/product/types";
import { BranchMiniMap } from "@/components/branches/BranchMiniMap";
import { OrderHereButton } from "@/components/branches/OrderHereButton";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBranchBySlug((await params).slug);
  if (!b) return { title: "Branch not found" };
  return {
    title: b.name,
    description: `${b.name}${b.addressLine ? ` — ${b.addressLine}, ${b.city}` : `, ${b.area}, ${b.city}`}. Menu, prices and ordering.`,
    alternates: { canonical: `/branches/${b.slug}` },
  };
}

export default async function BranchPage({ params }: Props) {
  const b = await getBranchBySlug((await params).slug);
  if (!b) notFound();
  const pub = toPublicBranch(b);
  const [menu, settings] = await Promise.all([loadCatalog(b.id), getSettings()]);
  const items = menu.filter((p) => !p.isAddon);
  const available = items.filter((p) => p.availability === "available");
  const unavailable = items.filter((p) => p.availability !== "available");
  const hasHours = pub.open.state !== "unknown";

  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <nav aria-label="Breadcrumb" className="text-sm text-forest-900/55">
        <Link href="/" className="hover:text-forest-900">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/branches" className="hover:text-forest-900">
          Branches
        </Link>{" "}
        / <span className="text-forest-900">{b.area}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="font-display text-5xl leading-none tracking-tight text-forest-900 sm:text-6xl">{b.name}</h1>
          {b.isSampleConfig && (
            <p className="mt-4 rounded-2xl bg-lemon-300/50 px-4 py-2 text-sm text-forest-900">Sample operating settings are active for testing — hours, delivery and fees below are not real.</p>
          )}
          <ul className="mt-6 space-y-4 text-forest-900/80">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-matcha-600" />
              <span>
                {b.addressLine ? (
                  <>
                    {b.addressLine}, {b.city}
                  </>
                ) : (
                  <>
                    {b.area}, {b.city} <span className="block text-sm text-forest-900/55">Street address not published yet.</span>
                  </>
                )}
                {b.locationPrecision !== "exact" && <span className="block text-sm text-forest-900/55">The map pin shows the area only; the exact location hasn&apos;t been confirmed.</span>}
              </span>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-matcha-600" />
              <div>
                <p className="font-semibold text-forest-900">{pub.openLabel}</p>
                {hasHours ? (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                    {DAYS.map((d) => (
                      <div key={d} className="contents">
                        <dt className="text-forest-900/60">{DAY_LABELS[d]}</dt>
                        <dd>{b.openingHours?.[d]?.length ? b.openingHours[d]!.map(([a, z]) => `${formatHHMM(parseHHMM(a)!)} – ${formatHHMM(parseHHMM(z)!)}`).join(", ") : "Closed"}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-forest-900/55">Please call before visiting.</p>
                )}
              </div>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-5 shrink-0 text-matcha-600" />
              {b.phone ? (
                <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-forest-900 hover:underline">
                  {b.phone}
                </a>
              ) : (
                <span>
                  <a href={settings.contact.phoneHref} className="font-semibold text-forest-900 hover:underline">
                    {settings.contact.phone}
                  </a>
                  <span className="block text-sm text-forest-900/55">CHAJOY central number (branch line not published)</span>
                </span>
              )}
            </li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">
              <Store className="size-3.5" /> {pub.acceptsOnlineOrders && pub.pickupEnabled ? "Online pickup orders" : "Pickup not online yet"}
            </span>
            <span className="chip">
              <Truck className="size-3.5" />{" "}
              {pub.acceptsOnlineOrders && pub.deliveryEnabled
                ? `Delivery within ${pub.deliveryRadiusKm} km · ${formatBDT(pub.deliveryFeePaisa!)}${pub.minOrderPaisa ? ` · min ${formatBDT(pub.minOrderPaisa)}` : ""}`
                : "No online delivery yet"}
            </span>
            {pub.deliveryTimeMinutes && pub.deliveryEnabled && <span className="chip">Typical delivery ~{pub.deliveryTimeMinutes} min</span>}
          </div>
          {!pub.acceptsOnlineOrders && (
            <p className="mt-4 flex gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-forest-900/75 ring-1 ring-forest-900/5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> This branch isn&apos;t taking online orders yet. You can still browse its menu and visit in person.
            </p>
          )}
          <div className="mt-6">
            <OrderHereButton branch={{ id: b.id, name: b.name, slug: b.slug, area: b.area }} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {b.photoUrl && (
            <div className="relative aspect-[4/5] overflow-hidden rounded-4xl ring-1 ring-forest-900/5">
              <Image src={b.photoUrl} alt={`${b.name} shopfront`} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" priority />
            </div>
          )}
          <div className="relative aspect-[4/5] overflow-hidden rounded-4xl ring-1 ring-forest-900/10">
            {b.latitude !== null && b.longitude !== null ? (
              <BranchMiniMap id={b.id} name={b.name} latitude={b.latitude} longitude={b.longitude} approximate={b.locationPrecision !== "exact"} radiusKm={pub.deliveryEnabled ? pub.deliveryRadiusKm : null} />
            ) : (
              <div className="grid h-full place-items-center bg-white p-6 text-center text-sm text-forest-900/60">Location not on the map yet.</div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="branch-menu">
        <h2 id="branch-menu" className="font-display text-3xl text-forest-900 sm:text-4xl">
          Menu at {b.area}
        </h2>
        <p className="mt-2 text-sm text-forest-900/60">
          {available.length} of {items.length} items available here
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {available.map((p) => (
            <ProductCard key={p.id} p={toCardProduct(p)} branchName={b.name} />
          ))}
        </div>
        {unavailable.length > 0 && (
          <>
            <h3 className="mt-12 font-display text-xl text-forest-900">Currently unavailable at this branch</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 opacity-80 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {unavailable.map((p) => (
                <ProductCard key={p.id} p={toCardProduct(p)} branchName={b.name} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
