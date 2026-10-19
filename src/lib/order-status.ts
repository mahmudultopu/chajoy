import type { OrderStatus, PaymentStatus } from "@/lib/db/schema";

type Fulfilment = "pickup" | "delivery";

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["refunded"],
  completed: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export function allowedTransitions(o: {
  status: OrderStatus;
  fulfilmentMethod: Fulfilment;
  paymentStatus: PaymentStatus;
}): OrderStatus[] {
  return NEXT[o.status].filter((to) => {
    if (to === "out_for_delivery" || to === "delivered") return o.fulfilmentMethod === "delivery";
    if (to === "completed") return o.fulfilmentMethod === "pickup";
    // a refund can only follow money actually received
    if (to === "refunded") return o.paymentStatus === "paid";
    return true;
  });
}

export function canTransition(
  o: { status: OrderStatus; fulfilmentMethod: Fulfilment; paymentStatus: PaymentStatus },
  to: OrderStatus,
): boolean {
  return allowedTransitions(o).includes(to);
}

export function statusLabel(s: OrderStatus, f: Fulfilment): string {
  switch (s) {
    case "pending_confirmation":
      return "Waiting for the branch to confirm";
    case "confirmed":
      return "Confirmed";
    case "preparing":
      return "Being prepared";
    case "ready":
      return f === "pickup" ? "Ready for pickup" : "Ready for dispatch";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "completed":
      return "Collected";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
  }
}

export const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "completed", "cancelled", "refunded"];

export function progressSteps(f: Fulfilment): OrderStatus[] {
  return f === "pickup"
    ? ["pending_confirmation", "confirmed", "preparing", "ready", "completed"]
    : ["pending_confirmation", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];
}

export function paymentStatusLabel(p: PaymentStatus, method: "cod" | "sslcommerz"): string {
  if (method === "cod")
    return p === "paid" ? "Cash collected" : p === "pending" ? "Cash on delivery / pickup — not yet collected" : p[0].toUpperCase() + p.slice(1);
  return { pending: "Awaiting payment", paid: "Paid online", failed: "Payment failed", cancelled: "Payment cancelled", refunded: "Refunded" }[p];
}
