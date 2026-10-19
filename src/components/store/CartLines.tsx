"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import type { CartView } from "@/lib/services/cart";
import { formatBDT } from "@/lib/money";
import { useStore } from "./StoreProvider";

export function CartLines({ view, compact }: { view: CartView; compact?: boolean }) {
  const { updateQty, removeLine, busy } = useStore();
  return (
    <ul className="flex flex-col gap-3">
      {view.quote.lines.map((l) => {
        const img = view.images[l.productId];
        const bad = l.status !== "ok";
        return (
          <li key={l.id} className={clsx("flex gap-3 rounded-3xl bg-white p-3 ring-1", bad ? "ring-berry-500/40" : "ring-forest-900/5")}>
            <Link href={l.slug ? `/products/${l.slug}` : "#"} className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-matcha-50">
              {img && <Image src={img} alt="" fill sizes="80px" className="menu-photo object-contain p-1" />}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={l.slug ? `/products/${l.slug}` : "#"} className="font-semibold text-forest-900 hover:underline">
                    {l.productName}
                  </Link>
                  <p className="text-xs text-forest-900/60">{[l.variantLabel, l.optionsLabel].filter(Boolean).join(" · ")}</p>
                </div>
                <p className={clsx("shrink-0 text-sm font-bold", bad ? "text-forest-900/40 line-through" : "text-forest-900")}>{formatBDT(l.lineTotalPaisa || l.unitPricePaisa * l.quantity)}</p>
              </div>
              {bad && (
                <p className="mt-1 flex items-start gap-1 text-xs font-medium text-berry-600">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" /> {l.message}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center rounded-full bg-cream-100 ring-1 ring-forest-900/10">
                  <button
                    aria-label={`One less ${l.productName}`}
                    disabled={busy}
                    onClick={() => updateQty(l.id, l.quantity - 1)}
                    className="grid size-8 place-items-center rounded-full hover:bg-white"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                    {l.quantity}
                  </span>
                  <button
                    aria-label={`One more ${l.productName}`}
                    disabled={busy || l.quantity >= 20}
                    onClick={() => updateQty(l.id, l.quantity + 1)}
                    className="grid size-8 place-items-center rounded-full hover:bg-white"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button disabled={busy} onClick={() => removeLine(l.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-forest-900/60 hover:text-berry-600">
                  <Trash2 className="size-3.5" /> {compact ? "" : "Remove"}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartSummary({ view }: { view: CartView }) {
  const q = view.quote;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-forest-900/70">Subtotal</dt>
        <dd className="font-semibold tabular-nums">{formatBDT(q.subtotalPaisa)}</dd>
      </div>
      {q.discountPaisa > 0 && (
        <div className="flex justify-between text-matcha-700">
          <dt>{q.appliedDiscount?.title ?? "Discount"}</dt>
          <dd className="font-semibold tabular-nums">−{formatBDT(q.discountPaisa)}</dd>
        </div>
      )}
      {view.fulfilment === "delivery" && (
        <div className="flex justify-between">
          <dt className="text-forest-900/70">Delivery</dt>
          <dd className="font-semibold tabular-nums">{q.deliveryFeePaisa ? formatBDT(q.deliveryFeePaisa) : "—"}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-dashed border-forest-900/15 pt-3 text-base">
        <dt className="font-bold text-forest-900">Total</dt>
        <dd className="font-display text-xl font-bold tabular-nums text-forest-900">{formatBDT(q.totalPaisa)}</dd>
      </div>
    </dl>
  );
}
