import { placeOrder } from "@/lib/services/orders";
import { startOnlinePayment } from "@/lib/payments";
import { currentCart } from "@/lib/request";
import { currentCustomer } from "@/lib/auth/customer";
import { assertSameOrigin, clientIp, handle, HttpError, json, limit, parseJson } from "@/lib/http";
import { checkoutSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  limit(req, "checkout", 10, 10 * 60_000);
  const input = await parseJson(req, checkoutSchema);
  const cart = await currentCart();
  if (!cart) throw new HttpError(409, "Your cart is empty.");
  const customer = await currentCustomer();
  const placed = await placeOrder(cart, input, { customerId: customer?.id ?? null, ip: clientIp(req) });

  let paymentUrl: string | null = null;
  let paymentError: string | null = null;
  if (placed.paymentMethod === "sslcommerz" && !placed.duplicate) {
    try {
      paymentUrl = await startOnlinePayment(placed.orderId, new URL(req.url).origin);
    } catch (e) {
      console.error("payment init failed", e);
      paymentError = "Your order is saved, but the payment page couldn't be opened. You can retry from your order page.";
    }
  }
  return json(
    {
      orderNumber: placed.orderNumber,
      // the token is only returned once; repeated submissions get the order number only
      orderUrl: placed.accessToken ? `/orders/${placed.orderNumber}?t=${placed.accessToken}` : `/orders/${placed.orderNumber}`,
      duplicate: placed.duplicate,
      paymentUrl,
      paymentError,
    },
    { status: placed.duplicate ? 200 : 201 },
  );
});
