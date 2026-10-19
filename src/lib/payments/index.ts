import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type { SiteSettings } from "@/lib/services/settings";
import { amountMatches, initSslcommerzSession, isSslcommerzConfigured, validateSslcommerzPayment } from "./sslcommerz";
import { randomCode } from "@/lib/tokens";
import { audit } from "@/lib/audit";

export type PaymentOption = { id: "cod" | "sslcommerz"; label: string; description: string; enabled: boolean; reason?: string };

export function paymentOptions(settings: SiteSettings): PaymentOption[] {
  const ssl = settings.payments.sslcommerzEnabled && isSslcommerzConfigured();
  return [
    {
      id: "cod",
      label: "Cash",
      description: "Pay the rider on delivery, or pay at the counter when you collect.",
      enabled: settings.payments.codEnabled,
      reason: settings.payments.codEnabled ? undefined : "Not enabled by CHAJOY yet",
    },
    {
      id: "sslcommerz",
      label: "Pay online",
      description: "bKash, Nagad, Rocket or card through SSLCommerz's secure page.",
      enabled: ssl,
      reason: ssl ? undefined : "Online payment isn't set up yet",
    },
  ];
}

/** Start (or restart) an online payment for an order and return the gateway URL. */
export async function startOnlinePayment(orderId: number, origin: string): Promise<string> {
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.paymentMethod !== "sslcommerz") throw new HttpError(409, "This order is paid in cash.");
  if (order.paymentStatus === "paid") throw new HttpError(409, "This order is already paid.");
  if (["cancelled", "refunded"].includes(order.status)) throw new HttpError(409, "This order was cancelled.");

  // A fresh transaction id per attempt; earlier attempts stay on record.
  let [payment] = await db
    .select()
    .from(schema.payments)
    .where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.provider, "sslcommerz"), eq(schema.payments.status, "initiated")));
  if (!payment) {
    [payment] = await db
      .insert(schema.payments)
      .values({ orderId: order.id, provider: "sslcommerz", amountPaisa: order.totalPaisa, status: "initiated", transactionRef: `${order.orderNumber}-${randomCode(4)}` })
      .returning();
  }
  const base = `${origin}/api/payments/sslcommerz`;
  const { gatewayUrl, sessionKey } = await initSslcommerzSession({
    tranId: payment.transactionRef!,
    amountPaisa: order.totalPaisa,
    orderNumber: order.orderNumber,
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
    productNames: order.items.map((i) => i.productName).join(", "),
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
      address: order.deliveryAddress?.addressLine ?? "Pickup",
      city: order.deliveryAddress?.city ?? "Dhaka",
    },
    urls: { success: `${base}/return?result=success`, fail: `${base}/return?result=fail`, cancel: `${base}/return?result=cancel`, ipn: `${base}/ipn` },
  });
  await db.update(schema.payments).set({ meta: { sessionKey }, updatedAt: new Date() }).where(eq(schema.payments.id, payment.id));
  return gatewayUrl;
}

/**
 * Settle a payment from a gateway callback. Safe to call repeatedly (IPN and
 * the browser return can both arrive): an already-paid payment is left alone.
 */
export async function settleSslcommerz(valId: string | null, tranId: string | null, fallbackResult: "fail" | "cancel" | null) {
  if (!tranId) throw new HttpError(400, "Missing transaction id.");
  const [payment] = await db.select().from(schema.payments).where(and(eq(schema.payments.provider, "sslcommerz"), eq(schema.payments.transactionRef, tranId)));
  if (!payment) throw new HttpError(404, "Unknown transaction.");
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, payment.orderId) });
  if (!order) throw new HttpError(404, "Order not found.");
  if (payment.status === "paid") return { order, status: "paid" as const };

  if (!valId) {
    const status = fallbackResult === "cancel" ? ("cancelled" as const) : ("failed" as const);
    await db.update(schema.payments).set({ status, updatedAt: new Date() }).where(eq(schema.payments.id, payment.id));
    if (order.paymentStatus === "pending") await db.update(schema.orders).set({ paymentStatus: status === "cancelled" ? "pending" : "failed", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
    return { order, status };
  }

  const v = await validateSslcommerzPayment(valId);
  const ok = v.valid && v.tranId === tranId && v.currency === "BDT" && amountMatches(v.amount, payment.amountPaisa);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.payments)
      .set({ status: ok ? "paid" : "failed", providerRef: v.bankTranId ?? valId, meta: v.raw, updatedAt: new Date() })
      .where(and(eq(schema.payments.id, payment.id), eq(schema.payments.status, payment.status)));
    if (ok) await tx.update(schema.orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
    else if (order.paymentStatus === "pending") await tx.update(schema.orders).set({ paymentStatus: "failed", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
    await audit(
      { type: "system", label: "sslcommerz" },
      { action: ok ? "payment.paid" : "payment.rejected", entityType: "order", entityId: order.id, summary: `${order.orderNumber}: SSLCommerz ${v.status}${ok ? "" : " (validation failed)"}`, diff: v.raw },
      tx,
    );
  });
  return { order, status: ok ? ("paid" as const) : ("failed" as const) };
}
