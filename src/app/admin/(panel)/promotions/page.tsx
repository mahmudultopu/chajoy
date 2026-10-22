/** Admin: promotions. */

import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { Badge } from "@/components/admin/Badge";
import { formatBDT } from "@/lib/money";

/** Page title and search-engine settings. */
export const metadata = { title: "Promotions" };

/** Lists promotions and a form to add one. */
export default async function Promotions() {
  await requireAdminPage("promotions.manage");
  const promos = await db.query.promotions.findMany({ with: { rules: true }, orderBy: desc(schema.promotions.startsAt) });
  const now = new Date();
  const d = (x: Date) => x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-forest-900">Promotions</h1>
        <Link href="/admin/promotions/new" className="btn-primary py-2.5">
          New promotion
        </Link>
      </div>
      {promos.length === 0 ? (
        <p className="card p-6 text-sm text-forest-900/60">No promotions yet. Only real, approved offers should be added — they appear on the site while active and inside their dates.</p>
      ) : (
        <div className="grid gap-3">
          {promos.map((p) => {
            const r = p.rules[0];
            const live = p.isActive && p.startsAt <= now && p.endsAt >= now;
            return (
              <Link key={p.id} href={`/admin/promotions/${p.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-5 hover:shadow-lift">
                <div>
                  <p className="font-semibold text-forest-900">{p.title}</p>
                  <p className="text-sm text-forest-900/60">
                    {d(p.startsAt)} – {d(p.endsAt)}
                    {r ? ` · ${r.kind === "percent" ? `${r.value / 100}%` : formatBDT(r.value)} off${r.code ? ` · code ${r.code}` : " · automatic"} · used ${r.usedCount}` : ""}
                  </p>
                </div>
                <Badge tone={live ? "green" : p.isActive ? "yellow" : "grey"}>{live ? "live" : p.isActive ? (p.endsAt < now ? "expired" : "scheduled") : "off"}</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
