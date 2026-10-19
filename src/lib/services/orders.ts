import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { haversineKm } from "@/lib/geo";
import { quote, type Quote } from "@/lib/pricing";
import { catalogSnapshot } from "@/lib/services/catalog";
import { getBranchById, toBranchSnapshot } from "@/lib/services/branches";
import { cartLines, clearCart, type Cart } from "@/lib/services/cart";
import { activeDiscountCandidates } from "@/lib/services/promotions";
import { getSettings } from "@/lib/services/settings";
import { isSslcommerzConfigured } from "@/lib/payments/sslcommerz";
import { randomCode, randomToken, sha256, timingSafeEqualHex } from "@/lib/tokens";
import { allowedTransitions } from "@/lib/order-status";
import { audit, type Actor } from "@/lib/audit";
import type { CheckoutInput } from "@/lib/validation";
import type { OrderStatus } from "@/lib/db/schema";

export type PlacedOrder = {
  orderId: number;
  orderNumber: string;
  accessToken: string | null; // null when this was a repeated submission
  paymentMethod: "cod" | "sslcommerz";
  totalPaisa: number;
  duplicate: boolean;
};

function orderNumberPrefix(now: Date) {
  const t = new Date(now.getTime() + 6 * 3600_000);
  const yy = String(t.getUTCFullYear()).slice(2);
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `CJ${yy}${mm}${dd}`;
}

export class CheckoutBlockedError extends HttpError {
  constructor(public quote: Quote) {
    super(409, quote.blockers[0]?.message ?? "This order can't be placed right now.", { blockers: quote.blockers, codeError: quote.codeError });
  }
}

/**
 * Create an order from the cart. Prices, availability, discounts and delivery
 * eligibility are recomputed here from the database; nothing the browser sent
 * about money is trusted. The idempotency key makes a double-submit return the
 * first order instead of creating a second one.
 */
export async function placeOrder(
  cart: Cart,
  input: CheckoutInput,
  ctx: { customerId: number | null; ip: string | null; now?: Date },
): Promise<PlacedOrder> {
  const now = ctx.now ?? new Date();

  const existing = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, input.idempotencyKey) });
  if (existing)
    return {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      accessToken: null,
      paymentMethod: existing.paymentMethod,
      totalPaisa: existing.totalPaisa,
      duplicate: true,
    };

  if (cart.branchId !== input.branchId)
    throw new HttpError(409, "Your selected branch changed. Please review your cart before ordering.");
  const branch = await getBranchById(input.branchId);
  if (!branch) throw new HttpError(409, "That branch isn't available.");

  const settings = await getSettings();
  if (input.paymentMethod === "cod" && !settings.payments.codEnabled)
    throw new HttpError(409, "Cash payment isn't available for online orders yet.");
  if (input.paymentMethod === "sslcommerz" && !(settings.payments.sslcommerzEnabled && isSslcommerzConfigured()))
    throw new HttpError(409, "Online payment isn't available yet.");

  let deliveryDistanceKm: number | null = null;
  if (input.fulfilment === "delivery" && input.delivery && branch.latitude !== null && branch.longitude !== null) {
    deliveryDistanceKm = haversineKm(
      { lat: branch.latitude, lng: branch.longitude },
      { lat: input.delivery.latitude, lng: input.delivery.longitude },
    );
  }

  const lines = await cartLines(cart.id);
  const [catalog, discounts] = await Promise.all([
    catalogSnapshot(branch.id, [...new Set(lines.map((l) => l.productId))]),
    activeDiscountCandidates(now),
  ]);
  const q = quote({
    lines: lines.map((l) => ({ id: l.id, productId: l.productId, variantId: l.variantId, quantity: l.quantity, options: l.options })),
    catalog,
    branch: toBranchSnapshot(branch),
    fulfilment: input.fulfilment,
    deliveryDistanceKm,
    discounts,
    code: input.discountCode ?? null,
    now,
  });
  if (!q.canCheckout) throw new CheckoutBlockedError(q);
  if (input.discountCode && q.codeError) throw new HttpError(409, q.codeError, { field: "discountCode" });

  const accessToken = randomToken(24);
  const prefix = orderNumberPrefix(now);

  try {
    const result = await db.transaction(async (tx) => {
      // Stock: decrement only if enough remains (guards against two checkouts racing).
      const perVariant = new Map<number, number>();
      for (const l of q.lines) perVariant.set(l.variantId, (perVariant.get(l.variantId) ?? 0) + l.quantity);
      for (const [variantId, qty] of perVariant) {
        const updated = await tx
          .update(schema.branchInventory)
          .set({ stockQty: sql`${schema.branchInventory.stockQty} - ${qty}`, updatedAt: now })
          .where(
            and(
              eq(schema.branchInventory.branchId, branch.id),
              eq(schema.branchInventory.variantId, variantId),
              eq(schema.branchInventory.trackStock, true),
              sql`${schema.branchInventory.stockQty} >= ${qty}`,
            ),
          )
          .returning({ id: schema.branchInventory.id });
        if (!updated.length) {
          const [row] = await tx
            .select()
            .from(schema.branchInventory)
            .where(and(eq(schema.branchInventory.branchId, branch.id), eq(schema.branchInventory.variantId, variantId)));
          if (row?.trackStock) throw new HttpError(409, "Some items just sold out at this branch. Please review your cart.");
        }
      }

      if (q.appliedDiscount) {
        const used = await tx
          .update(schema.discountRules)
          .set({ usedCount: sql`${schema.discountRules.usedCount} + 1` })
          .where(
            and(
              eq(schema.discountRules.id, q.appliedDiscount.ruleId),
              or(isNull(schema.discountRules.usageLimit), lt(schema.discountRules.usedCount, schema.discountRules.usageLimit)),
            ),
          )
          .returning({ id: schema.discountRules.id });
        if (!used.length) throw new HttpError(409, "That offer has just been fully redeemed.");
      }

      let order: typeof schema.orders.$inferSelect | undefined;
      for (let attempt = 0; attempt < 5 && !order; attempt++) {
        const orderNumber = `${prefix}-${randomCode(5)}`;
        const [dupe] = await tx.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.orderNumber, orderNumber));
        if (dupe) continue;
        [order] = await tx
          .insert(schema.orders)
          .values({
            orderNumber,
            accessTokenHash: sha256(accessToken),
            idempotencyKey: input.idempotencyKey,
            cartId: cart.id,
            customerId: ctx.customerId,
            branchId: branch.id,
            status: "pending_confirmation",
            fulfilmentMethod: input.fulfilment,
            customerName: input.name,
            customerPhone: input.phone,
            customerEmail: input.email ?? null,
            deliveryAddress:
              input.fulfilment === "delivery" && input.delivery
                ? {
                    addressLine: input.delivery.addressLine,
                    area: input.delivery.area,
                    city: input.delivery.city,
                    latitude: input.delivery.latitude,
                    longitude: input.delivery.longitude,
                  }
                : null,
            deliveryDistanceKm,
            deliveryInstructions: input.fulfilment === "delivery" ? (input.deliveryInstructions ?? null) : null,
            notes: input.notes ?? null,
            subtotalPaisa: q.subtotalPaisa,
            discountPaisa: q.discountPaisa,
            deliveryFeePaisa: q.deliveryFeePaisa,
            taxPaisa: q.taxPaisa,
            totalPaisa: q.totalPaisa,
            promotionId: q.appliedDiscount?.promotionId ?? null,
            discountCode: q.appliedDiscount?.code ?? null,
            paymentMethod: input.paymentMethod,
            paymentStatus: "pending",
            isSampleConfig: branch.isSampleConfig,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
      }
      if (!order) throw new Error("Could not allocate an order number");

      await tx.insert(schema.orderItems).values(
        q.lines.map((l) => ({
          orderId: order!.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          variantLabel: l.variantLabel,
          sizeCode: l.sizeCode,
          options: l.options,
          optionsLabel: l.optionsLabel,
          basePricePaisa: l.basePricePaisa,
          toppingsPricePaisa: l.toppingsPricePaisa,
          unitPricePaisa: l.unitPricePaisa,
          quantity: l.quantity,
          lineTotalPaisa: l.lineTotalPaisa,
        })),
      );
      await tx.insert(schema.orderStatusHistory).values({ orderId: order.id, status: "pending_confirmation", actor: "customer", note: "Order placed online", createdAt: now });
      await tx.insert(schema.payments).values({
        orderId: order.id,
        provider: input.paymentMethod,
        amountPaisa: q.totalPaisa,
        status: input.paymentMethod === "cod" ? "pending" : "initiated",
        transactionRef: input.paymentMethod === "cod" ? null : `${order.orderNumber}-${randomCode(4)}`,
      });
      if (input.fulfilment === "delivery")
        await tx.insert(schema.deliveries).values({ orderId: order.id, method: "manual", status: "pending", feePaisa: q.deliveryFeePaisa });

      if (input.saveAddress && ctx.customerId && input.delivery) {
        await tx.insert(schema.customerAddresses).values({
          customerId: ctx.customerId,
          label: input.delivery.area || "Saved address",
          recipientName: input.name,
          phone: input.phone,
          addressLine: input.delivery.addressLine,
          area: input.delivery.area,
          city: input.delivery.city,
          latitude: input.delivery.latitude,
          longitude: input.delivery.longitude,
        });
      }
      await clearCart(cart.id, tx);
      await audit(
        { type: "customer", id: ctx.customerId, label: input.name },
        { action: "order.placed", entityType: "order", entityId: order.id, summary: `Order ${order.orderNumber} placed (${input.fulfilment}, ${input.paymentMethod})`, ip: ctx.ip },
        tx,
      );
      return order;
    });
    return {
      orderId: result.id,
      orderNumber: result.orderNumber,
      accessToken,
      paymentMethod: result.paymentMethod,
      totalPaisa: result.totalPaisa,
      duplicate: false,
    };
  } catch (e) {
    // A concurrent duplicate submit loses the unique-key race: return the winner.
    const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") {
      const winner = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, input.idempotencyKey) });
      if (winner)
        return { orderId: winner.id, orderNumber: winner.orderNumber, accessToken: null, paymentMethod: winner.paymentMethod, totalPaisa: winner.totalPaisa, duplicate: true };
    }
    throw e;
  }
}

// ------------------------------------------------------------------ reading orders

export async function getOrderByNumber(orderNumber: string) {
  return db.query.orders.findFirst({
    where: eq(schema.orders.orderNumber, orderNumber),
    with: {
      items: true,
      branch: true,
      history: { orderBy: (h, { asc }) => [asc(h.createdAt), asc(h.id)] },
      payments: { orderBy: (p, { desc }) => [desc(p.createdAt)] },
      delivery: true,
    },
  });
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderByNumber>>>;

export function canViewOrder(
  order: { accessTokenHash: string; customerId: number | null; cartId: string | null },
  access: { token?: string | null; customerId?: number | null; cartId?: string | null },
) {
  if (access.token && timingSafeEqualHex(sha256(access.token), order.accessTokenHash)) return true;
  if (access.customerId && order.customerId === access.customerId) return true;
  if (access.cartId && order.cartId === access.cartId) return true;
  return false;
}

// ------------------------------------------------------------------ staff updates

export async function transitionOrder(
  orderId: number,
  to: OrderStatus,
  actor: Actor & { type: "admin" },
  opts: { note?: string; cashCollected?: boolean; ip?: string | null; branchScope?: number | null } = {},
) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!order) throw new HttpError(404, "Order not found.");
    if (opts.branchScope && order.branchId !== opts.branchScope) throw new HttpError(403, "This order belongs to another branch.");
    if (!allowedTransitions(order).includes(to))
      throw new HttpError(409, `Can't move an order from "${order.status}" to "${to}".`);
    const patch: Partial<typeof schema.orders.$inferInsert> = { status: to, updatedAt: new Date() };
    if (to === "refunded") patch.paymentStatus = "refunded";
    if (to === "cancelled" && order.paymentStatus === "pending") patch.paymentStatus = "cancelled";
    if ((to === "delivered" || to === "completed") && order.paymentMethod === "cod" && opts.cashCollected) patch.paymentStatus = "paid";
    await tx.update(schema.orders).set(patch).where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderStatusHistory).values({ orderId, status: to, note: opts.note ?? null, actor: `admin:${actor.id}` });

    if (patch.paymentStatus && patch.paymentStatus !== order.paymentStatus) {
      await tx
        .update(schema.payments)
        .set({ status: patch.paymentStatus === "paid" ? "paid" : patch.paymentStatus, updatedAt: new Date() })
        .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.provider, order.paymentMethod)));
    }
    if (order.fulfilmentMethod === "delivery") {
      const d: Partial<typeof schema.deliveries.$inferInsert> = { updatedAt: new Date() };
      if (to === "out_for_delivery") Object.assign(d, { status: "picked_up", pickedUpAt: new Date() });
      if (to === "delivered") Object.assign(d, { status: "delivered", deliveredAt: new Date() });
      if (to === "cancelled") Object.assign(d, { status: "cancelled" });
      if (d.status) await tx.update(schema.deliveries).set(d).where(eq(schema.deliveries.orderId, orderId));
    }
    // Put tracked stock back when an order is cancelled before it was made.
    if (to === "cancelled" && ["pending_confirmation", "confirmed"].includes(order.status)) {
      const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
      for (const it of items) {
        if (!it.variantId) continue;
        await tx
          .update(schema.branchInventory)
          .set({ stockQty: sql`${schema.branchInventory.stockQty} + ${it.quantity}` })
          .where(
            and(
              eq(schema.branchInventory.branchId, order.branchId),
              eq(schema.branchInventory.variantId, it.variantId),
              eq(schema.branchInventory.trackStock, true),
            ),
          );
      }
    }
    await audit(actor, { action: "order.status", entityType: "order", entityId: orderId, summary: `${order.orderNumber}: ${order.status} → ${to}${opts.note ? ` (${opts.note})` : ""}`, ip: opts.ip }, tx);
  });
}

export async function markCashCollected(orderId: number, actor: Actor & { type: "admin" }, branchScope: number | null, ip?: string | null) {
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (!o) throw new HttpError(404, "Order not found.");
    if (branchScope && o.branchId !== branchScope) throw new HttpError(403, "This order belongs to another branch.");
    if (o.paymentMethod !== "cod") throw new HttpError(409, "Only cash orders can be marked as collected.");
    if (o.paymentStatus !== "pending") throw new HttpError(409, "Payment isn't pending.");
    if (!["delivered", "completed", "ready", "out_for_delivery"].includes(o.status))
      throw new HttpError(409, "Mark cash as collected when the order is handed over.");
    await tx.update(schema.orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(schema.orders.id, orderId));
    await tx.update(schema.payments).set({ status: "paid", updatedAt: new Date() }).where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.provider, "cod")));
    await audit(actor, { action: "payment.cash_collected", entityType: "order", entityId: orderId, summary: `${o.orderNumber}: cash collected`, ip }, tx);
  });
}

export async function staleUnpaidOnlineOrders(olderThanMinutes = 60) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  return db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.paymentMethod, "sslcommerz"), eq(schema.orders.paymentStatus, "pending"), lt(schema.orders.createdAt, cutoff)));
}

