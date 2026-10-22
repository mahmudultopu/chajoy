/** Order status page, reachable with the order's private link. */

import type { Metadata } from "next";
import Link from "next/link";
import { loadOrderForVisitor, publicOrder } from "@/lib/order-view";
import { OrderStatusClient } from "@/components/orders/OrderStatusClient";

/** Page title and search-engine settings. */
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; payment?: string; placed?: string }> };

/** Shows the order if the visitor may see it, otherwise 404. */
export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { t, payment, placed } = await searchParams;
  const order = await loadOrderForVisitor(number, t ?? null);
  if (!order)
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-4xl text-forest-900">We can&apos;t show that order</h1>
        <p className="mx-auto mt-3 max-w-md text-forest-900/65">Open the link from your confirmation, sign in to the account you ordered with, or look it up with your order number and phone.</p>
        <Link href="/track" className="btn-primary mt-6">
          Track an order
        </Link>
      </div>
    );
  return (
    <div className="container-x py-10 sm:py-14">
      <OrderStatusClient initial={publicOrder(order)} token={t ?? null} paymentNotice={payment ?? null} justPlaced={placed === "1"} />
    </div>
  );
}
