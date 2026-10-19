import type { Metadata } from "next";
import { TrackForm } from "@/components/orders/TrackForm";

export const metadata: Metadata = { title: "Track an order", alternates: { canonical: "/track" } };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const { payment } = await searchParams;
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="mx-auto max-w-xl">
        <p className="eyebrow">Order status</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-forest-900">Track an order</h1>
        <p className="mt-3 text-forest-900/70">Enter your order number (it starts with CJ) and the mobile number you ordered with.</p>
        {payment === "error" && <p className="mt-4 rounded-2xl bg-lemon-300/50 p-3 text-sm">We couldn&apos;t confirm that payment automatically. Look up your order below to see its status.</p>}
        <TrackForm />
      </div>
    </div>
  );
}
