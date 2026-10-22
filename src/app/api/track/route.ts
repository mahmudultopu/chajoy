/** API: find an order by order number and phone number. */

import { z } from "zod";
import { getOrderByNumber } from "@/lib/services/orders";
import { publicOrder } from "@/lib/order-view";
import { assertSameOrigin, handle, HttpError, json, limit, parseJson } from "@/lib/http";
import { bdPhone } from "@/lib/validation";

/** Guest order lookup by order number + the phone number used on the order. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  limit(req, "track", 8, 10 * 60_000);
  const body = await parseJson(req, z.object({ orderNumber: z.string().trim().toUpperCase().max(30), phone: bdPhone }));
  const order = await getOrderByNumber(body.orderNumber);
  // same message either way so numbers can't be probed
  if (!order || order.customerPhone !== body.phone) throw new HttpError(404, "We couldn't find an order with that number and phone.");
  return json(publicOrder(order));
});
