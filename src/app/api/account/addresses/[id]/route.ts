/** API: delete a saved address of the signed-in customer. */

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentCustomer } from "@/lib/auth/customer";
import { assertSameOrigin, handle, HttpError, json } from "@/lib/http";

/** Deletes the address if it belongs to the customer. */
export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const customer = await currentCustomer();
  if (!customer) throw new HttpError(401, "Please sign in.");
  const id = Number((await ctx.params).id);
  await db.delete(schema.customerAddresses).where(and(eq(schema.customerAddresses.id, id), eq(schema.customerAddresses.customerId, customer.id)));
  return json({ ok: true });
});
