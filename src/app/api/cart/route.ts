/** API: the visitor's cart. */

import { buildCartView } from "@/lib/services/cart";
import { currentCart } from "@/lib/request";
import { handle, json } from "@/lib/http";

/** Always run per request: the response depends on cookies or the query. */
export const dynamic = "force-dynamic";

/** Returns the priced cart. */
export const GET = handle(async () => {
  const cart = await currentCart();
  return json(await buildCartView(cart));
});
