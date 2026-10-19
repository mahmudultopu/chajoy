import { z } from "zod";
import { buildCartView, setCartBranch } from "@/lib/services/cart";
import { getBranchById } from "@/lib/services/branches";
import { currentCart, setSelectedBranchCookie } from "@/lib/request";
import { assertSameOrigin, handle, HttpError, json, parseJson } from "@/lib/http";
import { formatBDT } from "@/lib/money";

/**
 * Choose the branch to shop from. The cart is re-priced for the new branch and
 * the response lists anything that changed, so the UI can warn the customer.
 */
export const PUT = handle(async (req: Request) => {
  assertSameOrigin(req);
  const { branchId } = await parseJson(req, z.object({ branchId: z.number().int().positive().nullable() }));
  if (branchId && !(await getBranchById(branchId))) throw new HttpError(404, "That branch isn't available.");
  await setSelectedBranchCookie(branchId);

  const cart = await currentCart();
  if (!cart) return json({ view: await buildCartView(null), changes: [] });
  const before = await buildCartView(cart);
  const moved = await setCartBranch(cart, branchId);
  const after = await buildCartView(moved);

  const changes: { name: string; message: string }[] = [];
  for (const line of after.quote.lines) {
    const prev = before.quote.lines.find((l) => l.id === line.id);
    if (line.status !== "ok") changes.push({ name: line.productName, message: line.message ?? "Unavailable at this branch." });
    else if (prev && prev.status === "ok" && prev.unitPricePaisa !== line.unitPricePaisa)
      changes.push({ name: line.productName, message: `Price here is ${formatBDT(line.unitPricePaisa)} (was ${formatBDT(prev.unitPricePaisa)}).` });
  }
  return json({ view: after, changes });
});
