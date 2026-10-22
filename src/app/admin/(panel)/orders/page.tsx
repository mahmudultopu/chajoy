/** Admin: order list with filters. */

import Link from "next/link";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { requireAdminPage } from "@/lib/auth/admin";
import { listBranches } from "@/lib/services/branches";
import { formatBDT } from "@/lib/money";
import { statusLabel, paymentStatusLabel } from "@/lib/order-status";
import { Badge, statusTone } from "@/components/admin/Badge";
import { normalizeBdPhone } from "@/lib/validation";

/** Page title and search-engine settings. */
export const metadata = { title: "Orders" };

type SP = { status?: string; branch?: string; q?: string; from?: string; to?: string; page?: string };

/** Lists orders filtered by status, branch, date and search. */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdminPage("orders.view");
  const sp = await searchParams;
  const branches = await listBranches();
  const conds: SQL[] = [];
  if (admin.branchScope) conds.push(eq(schema.orders.branchId, admin.branchScope));
  else if (sp.branch) conds.push(eq(schema.orders.branchId, Number(sp.branch)));
  if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) conds.push(eq(schema.orders.status, sp.status as (typeof ORDER_STATUSES)[number]));
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) conds.push(gte(schema.orders.createdAt, new Date(`${sp.from}T00:00:00+06:00`)));
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) conds.push(lte(schema.orders.createdAt, new Date(`${sp.to}T23:59:59+06:00`)));
  const q = sp.q?.trim().slice(0, 60);
  if (q) {
    const phone = normalizeBdPhone(q);
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(schema.orders.orderNumber, like), ilike(schema.orders.customerName, like), phone ? eq(schema.orders.customerPhone, phone) : ilike(schema.orders.customerPhone, like))!);
  }
  const page = Math.max(1, Number(sp.page) || 1);
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ o: schema.orders, branch: schema.branches.name })
      .from(schema.orders)
      .innerJoin(schema.branches, eq(schema.branches.id, schema.orders.branchId))
      .where(where)
      .orderBy(desc(schema.orders.createdAt))
      .limit(50)
      .offset((page - 1) * 50),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(where),
  ]);
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl text-forest-900">Orders</h1>
      <form className="flex flex-wrap items-end gap-2 rounded-3xl bg-white p-4 ring-1 ring-forest-900/5" method="get">
        <label className="min-w-0 flex-1 basis-56">
          <span className="label">Search</span>
          <input name="q" defaultValue={sp.q} placeholder="Order number, name or phone" className="input py-2" />
        </label>
        <label>
          <span className="label">Status</span>
          <select name="status" defaultValue={sp.status ?? ""} className="input py-2">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, "delivery")}
              </option>
            ))}
          </select>
        </label>
        {!admin.branchScope && (
          <label>
            <span className="label">Branch</span>
            <select name="branch" defaultValue={sp.branch ?? ""} className="input py-2">
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="label">From</span>
          <input type="date" name="from" defaultValue={sp.from} className="input py-2" />
        </label>
        <label>
          <span className="label">To</span>
          <input type="date" name="to" defaultValue={sp.to} className="input py-2" />
        </label>
        <button className="btn-primary py-2.5">Filter</button>
        <Link href="/admin/orders" className="btn-ghost py-2.5">
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-forest-900/5">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-forest-900/10 text-xs uppercase tracking-wide text-forest-900/55">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-forest-900/55">
                  No orders match.
                </td>
              </tr>
            )}
            {rows.map(({ o, branch }) => (
              <tr key={o.id} className="border-b border-forest-900/5 hover:bg-cream-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest-900 hover:underline">
                    {o.orderNumber}
                  </Link>
                  <span className="block text-xs text-forest-900/55">
                    {o.fulfilmentMethod}
                    {o.isSampleConfig ? " · sample" : ""}
                  </span>
                </td>
                <td className="px-4 py-3 text-forest-900/70">{o.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" })}</td>
                <td className="px-4 py-3">
                  {o.customerName}
                  <span className="block text-xs text-forest-900/55">{o.customerPhone}</span>
                </td>
                <td className="px-4 py-3">{branch}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(o.status)}>{statusLabel(o.status, o.fulfilmentMethod)}</Badge>
                </td>
                <td className="px-4 py-3 text-xs">{paymentStatusLabel(o.paymentStatus, o.paymentMethod)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatBDT(o.totalPaisa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-forest-900/60">
        <span>{n} order(s)</span>
        <span className="flex gap-2">
          {page > 1 && (
            <Link href={qs({ page: String(page - 1) })} className="btn-ghost py-2">
              Previous
            </Link>
          )}
          {page * 50 < n && (
            <Link href={qs({ page: String(page + 1) })} className="btn-ghost py-2">
              Next
            </Link>
          )}
        </span>
      </div>
    </div>
  );
}
