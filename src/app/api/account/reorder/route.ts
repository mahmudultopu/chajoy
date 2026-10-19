import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentCustomer } from "@/lib/auth/customer";
import { addToCart, buildCartView } from "@/lib/services/cart";
import { ensureCart } from "@/lib/request";
import { assertSameOrigin, handle, HttpError, json, parseJson } from "@/lib/http";

/** Put a past order's items back in the cart, skipping anything no longer available. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const customer = await currentCustomer();
  if (!customer) throw new HttpError(401, "Please sign in.");
  const { orderNumber } = await parseJson(req, z.object({ orderNumber: z.string().max(30) }));
  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.orderNumber, orderNumber), eq(schema.orders.customerId, customer.id)),
    with: { items: true },
  });
  if (!order) throw new HttpError(404, "Order not found.");
  const cart = await ensureCart();
  const skipped: { name: string; reason: string }[] = [];
  for (const it of order.items) {
    if (!it.productId || !it.variantId) {
      skipped.push({ name: it.productName, reason: "No longer on the menu" });
      continue;
    }
    try {
      await addToCart(cart, { productId: it.productId, variantId: it.variantId, quantity: it.quantity, options: it.options });
    } catch (e) {
      skipped.push({ name: it.productName, reason: (e as Error).message });
    }
  }
  return json({ view: await buildCartView(cart), skipped });
});
