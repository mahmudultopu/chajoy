/** API: change or remove one cart line. */

import { z } from "zod";
import { buildCartView, removeLine, updateLine } from "@/lib/services/cart";
import { currentCart } from "@/lib/request";
import { assertSameOrigin, handle, HttpError, json, parseJson } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function lineId(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Bad line id.");
  return id;
}

/** Changes the line's quantity. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  const { quantity } = await parseJson(req, z.object({ quantity: z.number().int().min(0).max(20) }));
  const cart = await currentCart();
  if (!cart) throw new HttpError(404, "Your cart is empty.");
  await updateLine(cart, await lineId(ctx), quantity);
  return json(await buildCartView(cart));
});

/** Removes the line. */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  const cart = await currentCart();
  if (!cart) throw new HttpError(404, "Your cart is empty.");
  await removeLine(cart, await lineId(ctx));
  return json(await buildCartView(cart));
});
