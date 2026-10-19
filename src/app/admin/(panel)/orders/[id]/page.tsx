import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { allowedTransitions, paymentStatusLabel, statusLabel } from "@/lib/order-status";
import { formatBDT } from "@/lib/money";
import { formatDistance } from "@/lib/geo";
import { Badge, statusTone } from "@/components/admin/Badge";
import { OrderActions } from "./OrderActions";

export const metadata = { title: "Order" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("orders.view");
  const id = Number((await params).id);
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, branch: true, history: { orderBy: (h, { asc }) => [asc(h.createdAt), asc(h.id)] }, payments: true, delivery: true },
  });
  if (!o || (admin.branchScope && o.branchId !== admin.branchScope)) notFound();
  const admins = await db.select({ id: schema.adminUsers.id, name: schema.adminUsers.name }).from(schema.adminUsers);
  const who = (actor: string) => (actor.startsWith("admin:") ? (admins.find((a) => a.id === Number(actor.slice(6)))?.name ?? "Staff") : actor === "customer" ? "Customer" : "System");
  const fmt = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" });
  const transitions = allowedTransitions(o);
  const awaitingOnline = o.paymentMethod === "sslcommerz" && o.paymentStatus !== "paid";

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-forest-900/60 hover:text-forest-900">
        ← Orders
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-forest-900">{o.orderNumber}</h1>
          <p className="mt-1 text-sm text-forest-900/60">
            Placed {fmt(o.createdAt)} · {o.branch.name} · {o.fulfilmentMethod}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={statusTone(o.status)}>{statusLabel(o.status, o.fulfilmentMethod)}</Badge>
            <Badge tone={o.paymentStatus === "paid" ? "green" : o.paymentStatus === "failed" ? "red" : "yellow"}>{paymentStatusLabel(o.paymentStatus, o.paymentMethod)}</Badge>
            {o.isSampleConfig && <Badge tone="yellow">placed under sample settings</Badge>}
          </div>
        </div>
        <p className="font-display text-4xl font-semibold tabular-nums text-forest-900">{formatBDT(o.totalPaisa)}</p>
      </div>
      {awaitingOnline && !["cancelled", "refunded"].includes(o.status) && (
        <p className="rounded-2xl bg-lemon-300/50 px-4 py-3 text-sm font-semibold text-forest-950">Online payment not completed — don&apos;t start preparing until it shows as paid.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold text-forest-900">Items</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id} className="border-b border-forest-900/5 align-top">
                    <td className="py-2.5 pr-3 font-semibold">{i.quantity} ×</td>
                    <td className="py-2.5">
                      {i.productName} <span className="text-forest-900/55">({i.variantLabel})</span>
                      {i.optionsLabel && <span className="block text-xs text-forest-900/60">{i.optionsLabel}</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{formatBDT(i.lineTotalPaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatBDT(o.subtotalPaisa)}</dd>
              </div>
              {o.discountPaisa > 0 && (
                <div className="flex justify-between">
                  <dt>Discount {o.discountCode ? `(${o.discountCode})` : ""}</dt>
                  <dd className="tabular-nums">−{formatBDT(o.discountPaisa)}</dd>
                </div>
              )}
              {o.fulfilmentMethod === "delivery" && (
                <div className="flex justify-between">
                  <dt>Delivery</dt>
                  <dd className="tabular-nums">{formatBDT(o.deliveryFeePaisa)}</dd>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatBDT(o.totalPaisa)}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-forest-900">Customer</h2>
            <p className="mt-2 text-sm">
              {o.customerName} ·{" "}
              <a className="font-semibold underline" href={`tel:${o.customerPhone}`}>
                {o.customerPhone}
              </a>
              {o.customerEmail ? ` · ${o.customerEmail}` : ""}
            </p>
            {o.deliveryAddress && (
              <div className="mt-3 text-sm">
                <p className="font-semibold">Deliver to</p>
                <p>
                  {o.deliveryAddress.addressLine}
                  {o.deliveryAddress.area ? `, ${o.deliveryAddress.area}` : ""}, {o.deliveryAddress.city}
                </p>
                <p className="text-forest-900/60">
                  Pin {o.deliveryAddress.latitude.toFixed(5)}, {o.deliveryAddress.longitude.toFixed(5)}
                  {o.deliveryDistanceKm != null ? ` · ≈${formatDistance(o.deliveryDistanceKm)} straight line` : ""} ·{" "}
                  <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${o.deliveryAddress.latitude}&mlon=${o.deliveryAddress.longitude}#map=17/${o.deliveryAddress.latitude}/${o.deliveryAddress.longitude}`}>
                    open map
                  </a>
                </p>
                {o.deliveryInstructions && <p className="mt-1">Instructions: {o.deliveryInstructions}</p>}
              </div>
            )}
            {o.notes && <p className="mt-3 rounded-xl bg-cream-100 p-3 text-sm">Note: {o.notes}</p>}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-forest-900">History</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {o.history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="w-32 shrink-0 text-forest-900/55">{fmt(h.createdAt)}</span>
                  <span>
                    <strong>{statusLabel(h.status as never, o.fulfilmentMethod)}</strong> · {who(h.actor)}
                    {h.note && <span className="block text-forest-900/70">{h.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <OrderActions
            orderId={o.id}
            transitions={transitions.map((t) => ({ value: t, label: statusLabel(t, o.fulfilmentMethod) }))}
            isCod={o.paymentMethod === "cod"}
            paymentPending={o.paymentStatus === "pending"}
            canCollect={o.paymentMethod === "cod" && o.paymentStatus === "pending" && ["ready", "out_for_delivery", "delivered", "completed"].includes(o.status)}
            delivery={
              o.delivery
                ? { method: o.delivery.method, providerName: o.delivery.providerName, riderName: o.delivery.riderName, riderPhone: o.delivery.riderPhone, trackingRef: o.delivery.trackingRef, trackingUrl: o.delivery.trackingUrl, status: o.delivery.status }
                : null
            }
          />
          <section className="card p-5">
            <h2 className="font-semibold text-forest-900">Payments</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="rounded-xl bg-cream-100 p-3">
                  <span className="font-semibold">{p.provider === "cod" ? "Cash" : "SSLCommerz"}</span> · {p.status} · {formatBDT(p.amountPaisa)}
                  {p.transactionRef && <span className="block text-xs text-forest-900/60">Ref {p.transactionRef}</span>}
                  {p.providerRef && <span className="block text-xs text-forest-900/60">Gateway {p.providerRef}</span>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
