/** Slide-in cart drawer. */

"use client";

import Link from "next/link";
import { MapPin, ShoppingBag } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useStore } from "./StoreProvider";
import { CartLines, CartSummary } from "./CartLines";

const STEP_CODES = new Set(["no_fulfilment", "delivery_location_missing", "empty"]);

/** Shows cart lines, any problems with the order and the checkout button. */
export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, setBranchPickerOpen } = useStore();
  const close = () => setCartOpen(false);
  const lines = cart?.quote.lines ?? [];
  const problems = cart?.quote.blockers.filter((b) => !STEP_CODES.has(b.code) && b.code !== "no_branch") ?? [];

  return (
    <Dialog open={cartOpen} onClose={close} title="Your cart" variant="drawer">
      <div className="flex h-full flex-col">
        <div className="flex-1 px-5 pb-4 sm:px-6">
          {!cart ? (
            <div className="space-y-3 pt-2">
              <div className="skeleton h-24" />
              <div className="skeleton h-24" />
            </div>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-matcha-100">
                <ShoppingBag className="size-7 text-forest-800" />
              </span>
              <p className="font-display text-xl text-forest-900">Nothing here yet</p>
              <p className="max-w-xs text-sm text-forest-900/65">Pick a milk tea, a fruit tea or a sundae from the menu.</p>
              <Link href="/menu" onClick={close} className="btn-primary mt-2">
                Browse the menu
              </Link>
            </div>
          ) : (
            <>
              <button
                onClick={() => setBranchPickerOpen(true)}
                className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-matcha-50 px-4 py-3 text-left text-sm ring-1 ring-matcha-200"
              >
                <MapPin className="size-4 shrink-0 text-matcha-700" />
                {cart.branch ? (
                  <span>
                    Ordering from <strong>{cart.branch.name}</strong> · <span className="underline">change</span>
                  </span>
                ) : (
                  <span>
                    <strong>Choose a branch</strong> to see availability and order
                  </span>
                )}
              </button>
              <CartLines view={cart} compact />
              {problems.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-2xl bg-lemon-300/35 p-3 text-xs text-forest-900">
                  {problems.map((p) => (
                    <li key={p.code}>• {p.message}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        {cart && lines.length > 0 && (
          <div className="sticky bottom-0 border-t border-forest-900/10 bg-cream-50 px-5 py-4 sm:px-6">
            <CartSummary view={cart} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={close} className="btn-ghost">
                View cart
              </Link>
              <Link href="/checkout" onClick={close} className="btn-primary">
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
