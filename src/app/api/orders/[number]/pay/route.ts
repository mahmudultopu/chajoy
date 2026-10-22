/** API: start (or retry) online payment for an order. */

import { z } from "zod";
import { loadOrderForVisitor } from "@/lib/order-view";
import { startOnlinePayment } from "@/lib/payments";
import { assertSameOrigin, handle, HttpError, json, limit, parseJson } from "@/lib/http";

/** Retry an online payment for an unpaid order. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ number: string }> }) => {
  assertSameOrigin(req);
  limit(req, "pay", 10, 10 * 60_000);
  const { token } = await parseJson(req, z.object({ token: z.string().max(100).nullable().optional() }));
  const order = await loadOrderForVisitor((await ctx.params).number, token ?? null);
  if (!order) throw new HttpError(404, "Order not found.");
  const paymentUrl = await startOnlinePayment(order.id, new URL(req.url).origin).catch((e) => {
    if (e instanceof HttpError) throw e;
    console.error(e);
    throw new HttpError(502, "The payment page couldn't be opened. Please try again shortly.");
  });
  return json({ paymentUrl });
});
