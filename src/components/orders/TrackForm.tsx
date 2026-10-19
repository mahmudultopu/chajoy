"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { PublicOrder } from "@/lib/order-view";
import { OrderStatusClient } from "./OrderStatusClient";

export function TrackForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrder | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, phone }) });
    const d = await r.json();
    setBusy(false);
    if (r.ok) setOrder(d);
    else setError(d.fields?.[0]?.message ?? d.error);
  };

  if (order)
    return (
      <div className="mt-8">
        <OrderStatusClient initial={order} token={null} paymentNotice={null} justPlaced={false} />
      </div>
    );
  return (
    <form onSubmit={submit} className="card mt-8 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="t-num">
          Order number
        </label>
        <input id="t-num" className="input uppercase" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="CJ261019-ABCDE" required autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="t-phone">
          Mobile number
        </label>
        <input id="t-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01XXX-XXXXXX" required />
      </div>
      {error && <p className="text-sm text-berry-600">{error}</p>}
      <button disabled={busy} className="btn-primary w-full py-3.5">
        {busy && <LoaderCircle className="size-4 animate-spin" />} Find my order
      </button>
    </form>
  );
}
