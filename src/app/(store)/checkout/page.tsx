import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { buildCartView } from "@/lib/services/cart";
import { getSettings } from "@/lib/services/settings";
import { paymentOptions } from "@/lib/payments";
import { currentCart } from "@/lib/request";
import { currentCustomer } from "@/lib/auth/customer";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, settings, customer] = await Promise.all([currentCart(), getSettings(), currentCustomer()]);
  const view = await buildCartView(cart);
  const addresses = customer ? await db.select().from(schema.customerAddresses).where(eq(schema.customerAddresses.customerId, customer.id)) : [];
  return (
    <div className="container-x py-10 sm:py-14">
      <CheckoutClient
        initial={view}
        payments={paymentOptions(settings)}
        customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipientName: a.recipientName, phone: a.phone, addressLine: a.addressLine, area: a.area, city: a.city, latitude: a.latitude, longitude: a.longitude }))}
      />
    </div>
  );
}
