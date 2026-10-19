import { z } from "zod";
import { rankBranches } from "@/lib/services/branches";
import { cartLines } from "@/lib/services/cart";
import { currentCart } from "@/lib/request";
import { handle, json, limit } from "@/lib/http";

export const dynamic = "force-dynamic";

const q = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  fulfilment: z.enum(["pickup", "delivery"]).optional(),
});

/**
 * Branches sorted by straight-line distance from the given point, each with
 * whether it can take the visitor's current cart right now. Coordinates are
 * used for this calculation only and are not stored.
 */
export const GET = handle(async (req: Request) => {
  limit(req, "branches", 60, 60_000);
  const p = q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const cart = await currentCart();
  const productIds = cart ? [...new Set((await cartLines(cart.id)).map((l) => l.productId))] : [];
  const origin = p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : null;
  const result = await rankBranches({ origin, productIds, fulfilment: p.fulfilment ?? null });
  return json(result, { headers: { "Cache-Control": "no-store" } });
});
