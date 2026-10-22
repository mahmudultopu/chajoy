/** Loading orders for the public order page, with access checks. */

import { cookies } from "next/headers";
import { canViewOrder, getOrderByNumber, type OrderDetail } from "@/lib/services/orders";
import { currentCustomer } from "@/lib/auth/customer";
import { currentCart } from "@/lib/request";
import { statusLabel, paymentStatusLabel } from "@/lib/order-status";

/** Load an order if the visitor may see it (access link, signed-in owner, or the browser that placed it). */
export async function loadOrderForVisitor(orderNumber: string, token: string | null): Promise<OrderDetail | null> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) return null;
  const [customer, cart] = await Promise.all([currentCustomer(), currentCart()]);
  await cookies();
  return canViewOrder(order, { token, customerId: customer?.id ?? null, cartId: cart?.id ?? null }) ? order : null;
}

/** The customer-facing shape of an order (no internal ids or tokens). */
export function publicOrder(o: OrderDetail) {
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    statusLabel: statusLabel(o.status, o.fulfilmentMethod),
    fulfilmentMethod: o.fulfilmentMethod,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paymentLabel: paymentStatusLabel(o.paymentStatus, o.paymentMethod),
    createdAt: o.createdAt.toISOString(),
    isSampleConfig: o.isSampleConfig,
    branch: { name: o.branch.name, slug: o.branch.slug, area: o.branch.area, addressLine: o.branch.addressLine, phone: o.branch.phone },
    items: o.items.map((i) => ({
      name: i.productName,
      variant: i.variantLabel,
      options: i.optionsLabel,
      quantity: i.quantity,
      unitPricePaisa: i.unitPricePaisa,
      lineTotalPaisa: i.lineTotalPaisa,
    })),
    subtotalPaisa: o.subtotalPaisa,
    discountPaisa: o.discountPaisa,
    deliveryFeePaisa: o.deliveryFeePaisa,
    taxPaisa: o.taxPaisa,
    totalPaisa: o.totalPaisa,
    deliveryAddress: o.deliveryAddress ? { addressLine: o.deliveryAddress.addressLine, area: o.deliveryAddress.area, city: o.deliveryAddress.city } : null,
    history: o.history.map((h) => ({ status: h.status, label: statusLabel(h.status as never, o.fulfilmentMethod), at: h.createdAt.toISOString() })),
    // tracking is only shown when a real courier integration supplied it
    tracking: o.delivery?.trackingUrl || o.delivery?.trackingRef ? { ref: o.delivery.trackingRef, url: o.delivery.trackingUrl, provider: o.delivery.providerName } : null,
  };
}
export type PublicOrder = ReturnType<typeof publicOrder>;
