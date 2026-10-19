"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Check, CircleCheck, Clock, CreditCard, ExternalLink, LoaderCircle, MapPin, TriangleAlert, X } from "lucide-react";
import type { PublicOrder } from "@/lib/order-view";
import { formatBDT } from "@/lib/money";
import { progressSteps, statusLabel } from "@/lib/order-status";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" });

export function OrderStatusClient({ initial, token, paymentNotice, justPlaced }: { initial: PublicOrder; token: string | null; paymentNotice: string | null; justPlaced: boolean }) {
  const [o, setO] = useState(initial);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const done = ["delivered", "completed", "cancelled", "refunded"].includes(o.status);

  useEffect(() => {
    if (done) return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const r = await fetch(`/api/orders/${o.orderNumber}${token ? `?t=${encodeURIComponent(token)}` : ""}`);
      if (r.ok) setO(await r.json());
    }, 20000);
    return () => clearInterval(t);
  }, [o.orderNumber, token, done]);

  const steps = progressSteps(o.fulfilmentMethod);
  const reached = new Set(o.history.map((h) => h.status));
  const currentIdx = steps.indexOf(o.status as (typeof steps)[number]);
  const needsPayment = o.paymentMethod === "sslcommerz" && o.paymentStatus !== "paid" && !["cancelled", "refunded"].includes(o.status);

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    const r = await fetch(`/api/orders/${o.orderNumber}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const d = await r.json();
    if (r.ok && d.paymentUrl) window.location.assign(d.paymentUrl);
    else {
      setPayError(d.error ?? "Couldn't open the payment page.");
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {justPlaced && o.status === "pending_confirmation" && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl bg-matcha-100 p-5">
          <CircleCheck className="mt-0.5 size-6 shrink-0 text-matcha-700" />
          <div>
            <p className="font-display text-xl font-semibold text-forest-900">Thank you, your order is in!</p>
            <p className="text-sm text-forest-900/75">
              {o.branch.name} will confirm it shortly. Keep this page — bookmark it to check on your order.
            </p>
          </div>
        </div>
      )}
      {paymentNotice && (
        <div className={clsx("mb-6 flex items-start gap-3 rounded-3xl p-5", paymentNotice === "paid" ? "bg-matcha-100" : "bg-lemon-300/50")}>
          {paymentNotice === "paid" ? <CircleCheck className="size-6 text-matcha-700" /> : <TriangleAlert className="size-6" />}
          <p className="text-sm text-forest-900">
            {paymentNotice === "paid"
              ? "Payment received and verified."
              : paymentNotice === "cancelled"
                ? "You cancelled the payment. Your order is saved — you can pay below."
                : paymentNotice === "init_failed"
                  ? "Your order is saved, but the payment page couldn't be opened. Try again below."
                  : "The payment didn't go through. Your order is saved — you can try again below."}
          </p>
        </div>
      )}
      {o.isSampleConfig && <p className="mb-6 rounded-2xl bg-lemon-300/50 px-4 py-2 text-sm font-semibold">This is a test order placed while sample settings were active.</p>}

      <p className="eyebrow">Order {o.orderNumber}</p>
      <h1 className="mt-2 font-display text-5xl font-semibold leading-none tracking-tight text-forest-900">{o.statusLabel}</h1>
      <p className="mt-3 text-forest-900/65">
        Placed {fmt(o.createdAt)} · {o.fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"} from {o.branch.name}
      </p>

      {o.status !== "cancelled" && o.status !== "refunded" ? (
        <ol className="mt-8 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))] sm:gap-0" aria-label="Order progress">
          {steps.map((s, i) => {
            const isDone = reached.has(s) || i < currentIdx;
            const isNow = i === currentIdx;
            const at = o.history.find((h) => h.status === s)?.at;
            return (
              <li key={s} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                <div className="flex items-center sm:w-full">
                  <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full", isDone ? "bg-forest-900 text-cream-50" : "bg-white ring-1 ring-forest-900/15", isNow && "ring-4 ring-matcha-300")}>
                    {isDone && !isNow ? <Check className="size-4" /> : isNow ? <span className="size-2.5 rounded-full bg-matcha-300 motion-safe:animate-pulse" /> : <span className="text-xs font-bold text-forest-900/40">{i + 1}</span>}
                  </span>
                  {i < steps.length - 1 && <span className={clsx("hidden h-1 flex-1 rounded sm:block", i < currentIdx ? "bg-forest-900" : "bg-forest-900/10")} />}
                </div>
                <div>
                  <p className={clsx("text-sm font-semibold", isDone ? "text-forest-900" : "text-forest-900/45")}>{statusLabel(s, o.fulfilmentMethod)}</p>
                  {at && <p className="text-xs text-forest-900/50">{fmt(at)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-white p-4 text-forest-900 ring-1 ring-forest-900/10">
          <X className="size-5" /> This order was {o.status}.
        </p>
      )}

      {o.tracking && (
        <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-forest-900/5">
          <p className="font-semibold">Courier tracking{o.tracking.provider ? ` · ${o.tracking.provider}` : ""}</p>
          {o.tracking.ref && <p className="text-sm text-forest-900/70">Reference {o.tracking.ref}</p>}
          {o.tracking.url && (
            <a href={o.tracking.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline">
              Track with courier <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="flex items-center gap-2 font-semibold text-forest-900">
            <CreditCard className="size-4" /> Payment
          </p>
          <p className="mt-1 text-sm text-forest-900/70">{o.paymentLabel}</p>
          {needsPayment && (
            <>
              <button onClick={pay} disabled={paying} className="btn-primary mt-3 w-full">
                {paying && <LoaderCircle className="size-4 animate-spin" />} Pay {formatBDT(o.totalPaisa)} now
              </button>
              {payError && <p className="mt-2 text-sm text-berry-600">{payError}</p>}
            </>
          )}
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-2 font-semibold text-forest-900">
            <MapPin className="size-4" /> {o.fulfilmentMethod === "pickup" ? "Pick up at" : "Delivering to"}
          </p>
          {o.fulfilmentMethod === "pickup" ? (
            <p className="mt-1 text-sm text-forest-900/70">
              <Link href={`/branches/${o.branch.slug}`} className="font-semibold underline">
                {o.branch.name}
              </Link>
              <br />
              {o.branch.addressLine ?? o.branch.area}
            </p>
          ) : (
            <p className="mt-1 text-sm text-forest-900/70">
              {o.deliveryAddress?.addressLine}
              {o.deliveryAddress?.area ? `, ${o.deliveryAddress.area}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="card mt-4 p-5">
        <p className="font-semibold text-forest-900">Items</p>
        <ul className="mt-3 divide-y divide-forest-900/5">
          {o.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="font-semibold">
                  {i.quantity} × {i.name}
                </span>
                <span className="block text-xs text-forest-900/55">{[i.variant, i.options].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="tabular-nums">{formatBDT(i.lineTotalPaisa)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-dashed border-forest-900/15 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatBDT(o.subtotalPaisa)}</dd>
          </div>
          {o.discountPaisa > 0 && (
            <div className="flex justify-between text-matcha-700">
              <dt>Discount</dt>
              <dd className="tabular-nums">−{formatBDT(o.discountPaisa)}</dd>
            </div>
          )}
          {o.fulfilmentMethod === "delivery" && (
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="tabular-nums">{formatBDT(o.deliveryFeePaisa)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatBDT(o.totalPaisa)}</dd>
          </div>
        </dl>
      </div>
      {!done && (
        <p className="mt-4 flex items-center gap-2 text-xs text-forest-900/50">
          <Clock className="size-3.5" /> This page updates automatically.
        </p>
      )}
    </div>
  );
}
