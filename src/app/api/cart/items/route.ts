/** API: add an item to the cart. */

import { addToCart, buildCartView } from "@/lib/services/cart";
import { ensureCart } from "@/lib/request";
import { assertSameOrigin, handle, json, limit, parseJson } from "@/lib/http";
import { addToCartSchema } from "@/lib/validation";

/** Validates the product, size and options, then adds them to the cart. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  limit(req, "cart", 120, 60_000);
  const body = await parseJson(req, addToCartSchema);
  const cart = await ensureCart();
  await addToCart(cart, body);
  return json(await buildCartView(cart), { status: 201 });
});
