import { z } from "zod";
import { buildCartView, setCartFulfilment } from "@/lib/services/cart";
import { currentCart } from "@/lib/request";
import { getBranchById } from "@/lib/services/branches";
import { haversineKm } from "@/lib/geo";
import { assertSameOrigin, handle, json, limit, parseJson } from "@/lib/http";

const body = z.object({
  fulfilment: z.enum(["pickup", "delivery"]).nullable().optional(),
  code: z.string().trim().max(40).optional(),
  delivery: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullable().optional(),
});

/** Live server-side totals for the checkout page. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  limit(req, "quote", 120, 60_000);
  const b = await parseJson(req, body);
  let cart = await currentCart();
  if (cart && b.fulfilment !== undefined && b.fulfilment !== cart.fulfilment) cart = await setCartFulfilment(cart, b.fulfilment ?? null);
  let deliveryDistanceKm: number | null = null;
  if (cart?.branchId && b.delivery) {
    const branch = await getBranchById(cart.branchId);
    if (branch?.latitude != null && branch.longitude != null)
      deliveryDistanceKm = haversineKm({ lat: branch.latitude, lng: branch.longitude }, { lat: b.delivery.latitude, lng: b.delivery.longitude });
  }
  const view = await buildCartView(cart, { code: b.code || null, deliveryDistanceKm });
  return json({ ...view, deliveryDistanceKm });
});
