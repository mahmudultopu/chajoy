/** Admin: list of branches. */

import Link from "next/link";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { requireAdminPage, can } from "@/lib/auth/admin";
import { toPublicBranch } from "@/lib/services/branches";
import { hasAnyHours } from "@/lib/hours";
import { Badge } from "@/components/admin/Badge";

/** Page title and search-engine settings. */
export const metadata = { title: "Branches" };

/** Lists branches; branch staff go straight to their own branch. */
export default async function BranchesAdmin() {
  const admin = await requireAdminPage("inventory.manage");
  if (admin.branchScope) redirect(`/admin/branches/${admin.branchScope}`);
  const branches = await db.select().from(schema.branches).orderBy(schema.branches.name);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-forest-900">Branches</h1>
        {can(admin, "branches.manage") && (
          <Link href="/admin/branches/new" className="btn-primary py-2.5">
            New branch
          </Link>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => {
          const pub = toPublicBranch(b);
          return (
            <Link key={b.id} href={`/admin/branches/${b.id}`} className="card block p-5 transition hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-xl text-forest-900">{b.name}</p>
                {!b.isActive && <Badge tone="red">inactive</Badge>}
              </div>
              <p className="mt-1 text-sm text-forest-900/60">{b.addressLine ?? `${b.area} · no street address`}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={b.locationPrecision === "exact" ? "green" : "yellow"}>pin {b.locationPrecision}</Badge>
                <Badge tone={hasAnyHours(b.openingHours) ? "green" : "yellow"}>{hasAnyHours(b.openingHours) ? "hours set" : "no hours"}</Badge>
                <Badge tone={b.phone ? "green" : "yellow"}>{b.phone ? "phone set" : "no phone"}</Badge>
                <Badge tone={b.acceptsOnlineOrders ? "green" : "grey"}>{b.acceptsOnlineOrders ? "online orders on" : "online orders off"}</Badge>
                {pub.deliveryEnabled && <Badge tone="green">delivery</Badge>}
                {b.isSampleConfig && <Badge tone="yellow">sample settings</Badge>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
