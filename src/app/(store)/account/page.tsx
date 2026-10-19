import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentCustomer } from "@/lib/auth/customer";
import { AuthForms, DeleteAddressButton, ReorderButton, SignOutButton } from "@/components/account/AccountClient";
import { formatBDT } from "@/lib/money";
import { statusLabel } from "@/lib/order-status";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
  const customer = await currentCustomer();
  if (!customer)
    return (
      <div className="container-x py-12 sm:py-16">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-display text-5xl font-semibold tracking-tight text-forest-900">Your account</h1>
          <p className="mt-3 text-forest-900/65">See your past orders, reorder favourites and save delivery addresses.</p>
        </div>
        <AuthForms />
      </div>
    );

  const [orders, addresses] = await Promise.all([
    db.query.orders.findMany({ where: eq(schema.orders.customerId, customer.id), with: { branch: true, items: true }, orderBy: desc(schema.orders.createdAt), limit: 30 }),
    db.select().from(schema.customerAddresses).where(eq(schema.customerAddresses.customerId, customer.id)),
  ]);

  return (
    <div className="container-x py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Signed in as {customer.email}</p>
          <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-forest-900">Hi, {customer.name.split(" ")[0]}</h1>
        </div>
        <SignOutButton />
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="orders-h">
          <h2 id="orders-h" className="font-display text-2xl font-semibold text-forest-900">
            Your orders
          </h2>
          {orders.length === 0 ? (
            <p className="mt-4 rounded-3xl bg-white p-6 text-forest-900/65 ring-1 ring-forest-900/5">
              No orders yet.{" "}
              <Link href="/menu" className="font-semibold underline">
                Browse the menu
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <Link href={`/orders/${o.orderNumber}`} className="font-semibold text-forest-900 hover:underline">
                      {o.orderNumber}
                    </Link>
                    <p className="text-sm text-forest-900/60">
                      {o.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" })} · {o.branch.name} · {o.items.reduce((s, i) => s + i.quantity, 0)} items
                    </p>
                    <p className="text-sm font-semibold text-forest-900">{statusLabel(o.status, o.fulfilmentMethod)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-semibold">{formatBDT(o.totalPaisa)}</p>
                    <ReorderButton orderNumber={o.orderNumber} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="addr-h">
          <h2 id="addr-h" className="font-display text-2xl font-semibold text-forest-900">
            Saved addresses
          </h2>
          {addresses.length === 0 ? (
            <p className="mt-4 rounded-3xl bg-white p-6 text-sm text-forest-900/65 ring-1 ring-forest-900/5">Tick “Save this address” at checkout to keep one here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {addresses.map((a) => (
                <li key={a.id} className="card flex items-start justify-between gap-3 p-5 text-sm">
                  <div>
                    <p className="font-semibold text-forest-900">{a.label}</p>
                    <p className="text-forest-900/65">
                      {a.addressLine}
                      {a.area ? `, ${a.area}` : ""}, {a.city}
                    </p>
                    <p className="text-forest-900/65">
                      {a.recipientName} · {a.phone}
                    </p>
                  </div>
                  <DeleteAddressButton id={a.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
