import { buildCartView } from "@/lib/services/cart";
import { currentCart } from "@/lib/request";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const cart = await currentCart();
  return json(await buildCartView(cart));
});
