/** API: order status for the order page. */

import { loadOrderForVisitor, publicOrder } from "@/lib/order-view";
import { handle, HttpError, json, limit } from "@/lib/http";

/** Always run per request: the response depends on cookies or the query. */
export const dynamic = "force-dynamic";

/** Returns the public view of an order the visitor may see. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ number: string }> }) => {
  limit(req, "order-status", 60, 60_000);
  const { number } = await ctx.params;
  const order = await loadOrderForVisitor(number, new URL(req.url).searchParams.get("t"));
  if (!order) throw new HttpError(404, "Order not found.");
  return json(publicOrder(order), { headers: { "Cache-Control": "no-store" } });
});
