/** SSLCommerz payment gateway client (session creation and server-side validation). */

import { paisaToDecimalString } from "@/lib/money";

// SSLCommerz hosted checkout (v4). The gateway itself offers bKash, Nagad,
// Rocket and cards, so this one integration covers those methods.
// Docs: https://developer.sslcommerz.com/doc/v4/
//
// Status: implemented against the documented API; NOT yet tested against a
// live or sandbox store because no credentials were provided. It stays off
// until SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD are set AND the owner
// enables online payment in Admin > Settings.

const env = () => ({
  storeId: process.env.SSLCOMMERZ_STORE_ID ?? "",
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD ?? "",
  sandbox: process.env.SSLCOMMERZ_SANDBOX !== "false",
});

/** True when store credentials are present in the environment. */
export function isSslcommerzConfigured(): boolean {
  const e = env();
  return !!e.storeId && !!e.storePassword;
}

function baseUrl() {
  return env().sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
}

export type InitParams = {
  tranId: string;
  amountPaisa: number;
  orderNumber: string;
  itemCount: number;
  productNames: string;
  customer: { name: string; phone: string; email: string | null; address: string; city: string };
  urls: { success: string; fail: string; cancel: string; ipn: string };
};

/** Creates a payment session and returns the gateway URL to redirect the customer to. */
export async function initSslcommerzSession(p: InitParams): Promise<{ gatewayUrl: string; sessionKey: string }> {
  const e = env();
  if (!isSslcommerzConfigured()) throw new Error("SSLCommerz is not configured");
  const body = new URLSearchParams({
    store_id: e.storeId,
    store_passwd: e.storePassword,
    total_amount: paisaToDecimalString(p.amountPaisa),
    currency: "BDT",
    tran_id: p.tranId,
    success_url: p.urls.success,
    fail_url: p.urls.fail,
    cancel_url: p.urls.cancel,
    ipn_url: p.urls.ipn,
    cus_name: p.customer.name,
    // SSLCommerz requires an email; if the customer gave none we send the
    // store's contact address so the gateway receipt still reaches someone.
    cus_email: p.customer.email ?? process.env.SSLCOMMERZ_FALLBACK_EMAIL ?? "bdchajoy@gmail.com",
    cus_phone: p.customer.phone,
    cus_add1: p.customer.address.slice(0, 50) || "N/A",
    cus_city: p.customer.city,
    cus_country: "Bangladesh",
    shipping_method: "NO",
    num_of_item: String(p.itemCount),
    product_name: p.productNames.slice(0, 250),
    product_category: "Food & Beverage",
    product_profile: "general",
    value_a: p.orderNumber,
  });
  const res = await fetch(`${baseUrl()}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { status?: string; GatewayPageURL?: string; sessionkey?: string; failedreason?: string } | null;
  if (!data || data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new Error(`SSLCommerz session failed: ${data?.failedreason ?? res.status}`);
  }
  return { gatewayUrl: data.GatewayPageURL, sessionKey: data.sessionkey ?? "" };
}

export type ValidationResult = {
  valid: boolean;
  status: string;
  tranId: string | null;
  amount: string | null;
  currency: string | null;
  bankTranId: string | null;
  cardType: string | null;
  raw: Record<string, unknown>;
};

/**
 * Ask SSLCommerz whether a payment is genuine. Callback/IPN bodies are never
 * trusted on their own; only this server-to-server answer marks an order paid.
 */
export async function validateSslcommerzPayment(valId: string): Promise<ValidationResult> {
  const e = env();
  const url = new URL(`${baseUrl()}/validator/api/validationserverAPI.php`);
  url.search = new URLSearchParams({ val_id: valId, store_id: e.storeId, store_passwd: e.storePassword, v: "1", format: "json" }).toString();
  const res = await fetch(url, { cache: "no-store" });
  const raw = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const status = String(raw.status ?? "");
  return {
    valid: status === "VALID" || status === "VALIDATED",
    status,
    tranId: (raw.tran_id as string) ?? null,
    amount: (raw.amount as string) ?? null,
    currency: ((raw.currency_type as string) || (raw.currency as string)) ?? null,
    bankTranId: (raw.bank_tran_id as string) ?? null,
    cardType: (raw.card_type as string) ?? null,
    raw: { status, tran_id: raw.tran_id, val_id: raw.val_id, amount: raw.amount, currency: raw.currency, card_type: raw.card_type, bank_tran_id: raw.bank_tran_id, risk_level: raw.risk_level },
  };
}

/** Amount check without floats: "180.00" vs 18000 paisa. */
export function amountMatches(gatewayAmount: string | null, paisa: number): boolean {
  if (!gatewayAmount) return false;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(gatewayAmount.trim());
  if (!m) return false;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0")) === paisa;
}
