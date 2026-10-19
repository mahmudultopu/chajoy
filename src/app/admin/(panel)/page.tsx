import Link from "next/link";
import { CircleCheck, CircleDashed } from "lucide-react";
import { requireAdminPage, can } from "@/lib/auth/admin";
import { dashboardMetrics, setupChecklist } from "@/lib/services/dashboard";
import { formatBDT } from "@/lib/money";
import { statusLabel } from "@/lib/order-status";
import { SalesChart } from "@/components/admin/SalesChart";
import { Badge, statusTone } from "@/components/admin/Badge";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string; denied?: string }> }) {
  const admin = await requireAdminPage("dashboard.view");
  const sp = await searchParams;
  const days = [7, 14, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 14;
  const [m, setup] = await Promise.all([dashboardMetrics({ branchId: admin.branchScope, days }), can(admin, "branches.manage") ? setupChecklist() : Promise.resolve([])]);
  const fmtTime = (d: Date) => d.toLocaleString("en-GB", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Dhaka" });

  return (
    <div className="space-y-6">
      {sp.denied && <p className="rounded-2xl bg-berry-500/10 px-4 py-3 text-sm text-berry-600">Your role can&apos;t open that page.</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="font-display text-4xl font-semibold text-forest-900">Hello, {admin.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-forest-900/10" role="group" aria-label="Period">
          {[7, 14, 30, 90].map((d) => (
            <Link key={d} href={`/admin?days=${d}`} aria-current={d === days ? "true" : undefined} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${d === days ? "bg-forest-900 text-cream-50" : "text-forest-900/70"}`}>
              {d} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Orders today", String(m.today.orders)],
          ["Sales today", formatBDT(m.today.totalPaisa)],
          [`Orders, last ${days} days`, String(m.period.orders)],
          [`Sales, last ${days} days`, formatBDT(m.period.totalPaisa)],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-forest-900/60">{label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-forest-900">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-forest-900/50">Sales exclude cancelled orders and include unpaid cash orders. Times are Asia/Dhaka.</p>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5" aria-labelledby="sales-h">
          <h2 id="sales-h" className="font-semibold text-forest-900">
            Sales per day
          </h2>
          <div className="mt-4">
            <SalesChart series={m.series} />
          </div>
        </section>
        <section className="card p-5" aria-labelledby="wait-h">
          <div className="flex items-center justify-between">
            <h2 id="wait-h" className="font-semibold text-forest-900">
              Waiting for confirmation
            </h2>
            <Link href="/admin/orders?status=pending_confirmation" className="text-sm font-semibold underline">
              All
            </Link>
          </div>
          {m.waiting.length === 0 ? (
            <p className="mt-4 text-sm text-forest-900/55">No orders waiting.</p>
          ) : (
            <ul className="mt-3 divide-y divide-forest-900/5">
              {m.waiting.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                    {o.orderNumber}
                    <span className="block text-xs font-normal text-forest-900/55">
                      {o.branch} · {fmtTime(o.createdAt)}
                    </span>
                  </Link>
                  <span className="text-right">
                    <span className="block tabular-nums">{formatBDT(o.totalPaisa)}</span>
                    {o.paymentMethod === "sslcommerz" && o.paymentStatus !== "paid" && <Badge tone="yellow">awaiting payment</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="font-semibold text-forest-900">Order status · last {days} days</h2>
          {m.byStatus.length === 0 ? (
            <p className="mt-3 text-sm text-forest-900/55">No orders in this period.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {m.byStatus.map((s) => (
                <li key={s.status} className="flex items-center justify-between">
                  <Badge tone={statusTone(s.status)}>{statusLabel(s.status, "delivery")}</Badge>
                  <span className="tabular-nums">{s.n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-forest-900">Popular products</h2>
          {m.popular.length === 0 ? (
            <p className="mt-3 text-sm text-forest-900/55">No sales yet in this period.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {m.popular.map((p, i) => (
                <li key={p.name} className="flex justify-between gap-3">
                  <span>
                    {i + 1}. {p.name}
                  </span>
                  <span className="tabular-nums text-forest-900/70">{p.qty} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-forest-900">{admin.branchScope ? "Your branch" : "By branch"}</h2>
          {m.byBranch.length === 0 ? (
            <p className="mt-3 text-sm text-forest-900/55">No orders in this period.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {m.byBranch.map((b) => (
                <li key={b.name} className="flex justify-between gap-3">
                  <span>{b.name}</span>
                  <span className="tabular-nums text-forest-900/70">
                    {b.orders} · {formatBDT(b.totalPaisa)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {m.lowStock.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold text-forest-900">Inventory alerts</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {m.lowStock.map((l, i) => (
              <li key={i} className="flex justify-between rounded-xl bg-cream-100 px-3 py-2">
                <span>
                  {l.product} ({l.size}) · {l.branch}
                </span>
                <Badge tone={(l.qty ?? 0) <= 0 ? "red" : "yellow"}>{(l.qty ?? 0) <= 0 ? "Out" : `${l.qty} left`}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {setup.length > 0 && (
        <section className="card p-5" aria-labelledby="setup-h">
          <h2 id="setup-h" className="font-semibold text-forest-900">
            Launch checklist
          </h2>
          <p className="text-sm text-forest-900/60">Business details that weren&apos;t published anywhere and need CHAJOY to confirm.</p>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {setup.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-start gap-3 rounded-2xl bg-cream-100 p-3 hover:bg-matcha-50">
                  {s.done ? <CircleCheck className="mt-0.5 size-5 text-matcha-600" /> : <CircleDashed className="mt-0.5 size-5 text-forest-900/40" />}
                  <span>
                    <span className="block text-sm font-semibold text-forest-900">{s.label}</span>
                    <span className="block text-xs text-forest-900/60">{s.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
