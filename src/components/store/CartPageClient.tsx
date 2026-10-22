/** Client part of the /cart page. */

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, MapPin, ShoppingBag, TriangleAlert } from "lucide-react";
import type { CartView } from "@/lib/services/cart";
import { useStore } from "./StoreProvider";
import { CartLines, CartSummary } from "./CartLines";

const STEP_CODES = new Set(["no_fulfilment", "delivery_location_missing", "empty"]);

/** Full-page cart with lines, totals and next steps. */
export function CartPageClient({ initial }: { initial: CartView }) {
  const { cart, refreshCart, setBranchPickerOpen } = useStore();
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);
  const view = cart ?? initial;
  const lines = view.quote.lines;
  const problems = view.quote.blockers.filter((b) => !STEP_CODES.has(b.code));
  const canContinue = lines.length > 0 && !lines.some((l) => l.status !== "ok") && !!view.branch;

  if (!lines.length)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-matcha-100">
          <ShoppingBag className="size-9 text-forest-800" />
        </span>
        <h1 className="mt-6 font-display text-4xl text-forest-900">Your cart is empty</h1>
        <p className="mt-2 text-forest-900/65">Find something cold, creamy or fruity on the menu.</p>
        <Link href="/menu" className="btn-primary mt-6">
          Browse the menu <ArrowRight className="size-4" />
        </Link>
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <h1 className="font-display text-5xl tracking-tight text-forest-900">Your cart</h1>
        <button onClick={() => setBranchPickerOpen(true)} className="mt-5 flex w-full items-center gap-3 rounded-3xl bg-white px-5 py-4 text-left ring-1 ring-forest-900/5 hover:ring-matcha-400">
          <MapPin className="size-5 text-matcha-600" />
          {view.branch ? (
            <span className="flex-1">
              Ordering from <strong>{view.branch.name}</strong>
              <span className="block text-sm text-forest-900/60">{view.branch.openLabel}</span>
            </span>
          ) : (
            <span className="flex-1">
              <strong>Choose a branch</strong>
              <span className="block text-sm text-forest-900/60">Prices and availability depend on the branch.</span>
            </span>
          )}
          <span className="text-sm font-semibold underline">{view.branch ? "Change" : "Choose"}</span>
        </button>
        <div className="mt-5">
          <CartLines view={view} />
        </div>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-6">
          <h2 className="font-display text-2xl text-forest-900">Summary</h2>
          <div className="mt-4">
            <CartSummary view={view} />
          </div>
          {problems.length > 0 && (
            <ul className="mt-4 space-y-2 rounded-2xl bg-lemon-300/40 p-4 text-sm text-forest-900">
              {problems.map((p) => (
                <li key={p.code} className="flex gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {p.message}
                </li>
              ))}
            </ul>
          )}
          {canContinue ? (
            <Link href="/checkout" className="btn-primary mt-6 w-full py-4 text-base">
              Continue to checkout <ArrowRight className="size-4" />
            </Link>
          ) : (
            <button disabled className="btn-primary mt-6 w-full py-4 text-base">
              {view.branch ? "Fix the items above to continue" : "Choose a branch to continue"}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-forest-900/55">Delivery fee and discounts are confirmed at checkout.</p>
        </div>
      </aside>
    </div>
  );
}
