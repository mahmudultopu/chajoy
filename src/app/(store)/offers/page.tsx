import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { livePromotions } from "@/lib/services/promotions";
import { listBranches } from "@/lib/services/branches";
import { formatBDT } from "@/lib/money";

export const metadata: Metadata = { title: "Offers", description: "Current CHAJOY offers and promotions.", alternates: { canonical: "/offers" } };

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

export default async function OffersPage() {
  const [promos, branches] = await Promise.all([livePromotions(), listBranches()]);
  const branchName = (id: number) => branches.find((b) => b.id === id)?.name ?? "a branch";
  return (
    <div className="container-x py-12 sm:py-16">
      <p className="eyebrow">Offers</p>
      <h1 className="mt-2 font-display text-5xl tracking-tight text-forest-900 sm:text-6xl">
        Little extras, <em className="font-medium text-matcha-600">on us.</em>
      </h1>
      {promos.length === 0 ? (
        <div className="mt-10 max-w-xl rounded-4xl bg-white p-8 ring-1 ring-forest-900/5">
          <p className="font-display text-2xl text-forest-900">No offers running right now</p>
          <p className="mt-2 text-forest-900/65">When CHAJOY runs a promotion it will appear here with its terms and dates. Follow us on social media to hear first.</p>
          <Link href="/menu" className="btn-primary mt-6">
            Browse the menu
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {promos.map((p) => (
            <article key={p.id} className="rounded-4xl bg-lemon-300/60 p-7 ring-1 ring-forest-900/5">
              <Tag className="size-5" />
              <h2 className="mt-3 font-display text-3xl text-forest-900">{p.title}</h2>
              {p.description && <p className="mt-2 text-forest-900/75">{p.description}</p>}
              <ul className="mt-4 space-y-2 text-sm">
                {p.rules.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-white/70 p-3">
                    <strong>{r.kind === "percent" ? `${r.value / 100}% off` : `${formatBDT(r.value)} off`}</strong>
                    {r.maxDiscountPaisa ? ` (up to ${formatBDT(r.maxDiscountPaisa)})` : ""}
                    {r.minSubtotalPaisa ? ` on orders of ${formatBDT(r.minSubtotalPaisa)} or more` : ""}
                    {r.fulfilment !== "any" ? ` · ${r.fulfilment} orders only` : ""}
                    {r.branchIds?.length ? ` · at ${r.branchIds.map(branchName).join(", ")}` : ""}
                    {r.code ? (
                      <>
                        {" "}
                        · code <code className="rounded-md bg-forest-900 px-1.5 py-0.5 text-cream-50">{r.code}</code>
                      </>
                    ) : (
                      " · applied automatically at checkout"
                    )}
                    {r.usageLimit ? ` · limited to ${r.usageLimit} orders` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-forest-900/65">
                Valid {date(p.startsAt)} – {date(p.endsAt)}. {p.terms}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
