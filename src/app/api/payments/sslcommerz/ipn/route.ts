/**
 * SSLCommerz instant payment notification (server-to-server). Every payment is
 * validated with the gateway before the order is marked paid.
 */

import { settleSslcommerz } from "@/lib/payments";
import { isSslcommerzConfigured } from "@/lib/payments/sslcommerz";
import { handle, HttpError, json } from "@/lib/http";

/**
 * Instant Payment Notification from SSLCommerz (server to server). The body is
 * only used to find the transaction; settleSslcommerz() re-validates it with
 * SSLCommerz before anything is marked paid, and is idempotent.
 */
export const POST = handle(async (req: Request) => {
  if (!isSslcommerzConfigured()) throw new HttpError(404, "Not enabled.");
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "") || null;
  const valId = String(form.get("val_id") ?? "") || null;
  const status = String(form.get("status") ?? "");
  const result = await settleSslcommerz(valId, tranId, status === "CANCELLED" ? "cancel" : valId ? null : "fail");
  return json({ ok: true, status: result.status });
});
