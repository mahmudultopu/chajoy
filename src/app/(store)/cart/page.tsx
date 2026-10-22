/** Cart page. */

import type { Metadata } from "next";
import { CartPageClient } from "@/components/store/CartPageClient";
import { buildCartView } from "@/lib/services/cart";
import { currentCart } from "@/lib/request";

/** Page title and search-engine settings. */
export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

/** Renders the visitor's cart. */
export default async function CartPage() {
  const view = await buildCartView(await currentCart());
  return (
    <div className="container-x py-10 sm:py-14">
      <CartPageClient initial={view} />
    </div>
  );
}
