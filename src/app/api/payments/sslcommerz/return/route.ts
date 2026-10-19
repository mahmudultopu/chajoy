import { NextResponse } from "next/server";
import { settleSslcommerz } from "@/lib/payments";
import { isSslcommerzConfigured } from "@/lib/payments/sslcommerz";

/**
 * The customer's browser comes back here from the SSLCommerz page (it POSTs a
 * form). We validate server-to-server, then send them to their order page.
 * The order page is reachable because this browser placed the order.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const result = url.searchParams.get("result");
  if (!isSslcommerzConfigured()) return NextResponse.redirect(new URL("/", url), 303);
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "") || null;
  const valId = result === "success" ? String(form.get("val_id") ?? "") || null : null;
  try {
    const r = await settleSslcommerz(valId, tranId, result === "cancel" ? "cancel" : result === "fail" ? "fail" : null);
    return NextResponse.redirect(new URL(`/orders/${r.order.orderNumber}?payment=${r.status}`, url), 303);
  } catch (e) {
    console.error("sslcommerz return", e);
    return NextResponse.redirect(new URL(`/track?payment=error`, url), 303);
  }
}
