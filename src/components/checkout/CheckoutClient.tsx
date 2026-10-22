/**
 * Checkout form: pickup or delivery, contact details, delivery address with
 * map pin, payment method and order placement. Prices always come from the server.
 */

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Banknote, CreditCard, LoaderCircle, LocateFixed, Lock, MapPin, Search, Store, Truck, TriangleAlert } from "lucide-react";
import type { CartView } from "@/lib/services/cart";
import type { PaymentOption } from "@/lib/payments";
import { formatBDT } from "@/lib/money";
import { formatDistance } from "@/lib/geo";
import { useStore } from "@/components/store/StoreProvider";
import { CartSummary } from "@/components/store/CartLines";

const BranchMap = dynamic(() => import("@/components/branches/BranchMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full rounded-none" /> });

type SavedAddress = { id: number; label: string; recipientName: string; phone: string; addressLine: string; area: string | null; city: string; latitude: number | null; longitude: number | null };
type Pin = { lat: number; lng: number } | null;
type FieldErrors = Record<string, string>;

const KEY_STORE = "cj-checkout-key";
function idempotencyKey() {
  try {
    const k = sessionStorage.getItem(KEY_STORE);
    if (k) return k;
    const n = crypto.randomUUID();
    sessionStorage.setItem(KEY_STORE, n);
    return n;
  } catch {
    return crypto.randomUUID();
  }
}

const HINT_CODES = new Set(["no_fulfilment", "delivery_location_missing"]);

/** Runs the checkout flow and places the order with an idempotency key. */
export function CheckoutClient({
  initial,
  payments,
  customer,
  addresses,
}: {
  initial: CartView;
  payments: PaymentOption[];
  customer: { name: string; email: string | null; phone: string | null } | null;
  addresses: SavedAddress[];
}) {
  const router = useRouter();
  const { setBranchPickerOpen, branch: storeBranch, refreshCart } = useStore();
  const [view, setView] = useState<CartView & { deliveryDistanceKm?: number | null }>(initial);
  const branch = view.branch;
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery" | null>(
    initial.fulfilment ?? (branch?.pickupEnabled ? "pickup" : branch?.deliveryEnabled ? "delivery" : null),
  );
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [addressLine, setAddressLine] = useState("");
  const [area, setArea] = useState("");
  const [pin, setPin] = useState<Pin>(null);
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState("");
  const firstEnabled = payments.find((p) => p.enabled)?.id ?? null;
  const [payment, setPayment] = useState<"cod" | "sslcommerz" | null>(firstEnabled);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [addrQuery, setAddrQuery] = useState("");
  const [addrResults, setAddrResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const reqId = useRef(0);
  // state updates are async, so a fast double-click could submit twice before re-render
  const submittingRef = useRef(false);

  // re-quote on the server whenever something that affects the total changes
  const requote = useCallback(async () => {
    const id = ++reqId.current;
    setQuoting(true);
    try {
      const r = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfilment, code: code || undefined, delivery: fulfilment === "delivery" && pin ? { latitude: pin.lat, longitude: pin.lng } : null }),
      });
      const d = await r.json();
      if (id === reqId.current && r.ok) setView(d);
    } finally {
      if (id === reqId.current) setQuoting(false);
    }
  }, [fulfilment, code, pin]);

  useEffect(() => {
    requote();
  }, [requote, storeBranch?.id]);

  // keep the chosen fulfilment valid for the branch
  useEffect(() => {
    if (!branch) return;
    if (fulfilment === "pickup" && !branch.pickupEnabled && branch.deliveryEnabled) setFulfilment("delivery");
    if (fulfilment === "delivery" && !branch.deliveryEnabled && branch.pickupEnabled) setFulfilment("pickup");
    if (!fulfilment) setFulfilment(branch.pickupEnabled ? "pickup" : branch.deliveryEnabled ? "delivery" : null);
  }, [branch, fulfilment]);

  const q = view.quote;
  const blockers = q.blockers.filter((b) => !(HINT_CODES.has(b.code) && b.code === "delivery_location_missing" && !pin && fulfilment === "delivery"));
  const hardBlockers = q.blockers.filter((b) => !HINT_CODES.has(b.code));

  const locate = () => {
    if (!("geolocation" in navigator)) return setErrors((e) => ({ ...e, delivery: "Your browser can't share location. Search your address instead." }));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        setLocating(false);
        setErrors((e) => ({ ...e, delivery: "Location access was blocked. Search your address or tap the map instead." }));
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const searchAddress = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (addrQuery.trim().length < 2) return;
    const r = await fetch(`/api/geocode?q=${encodeURIComponent(addrQuery)}`);
    const d = await r.json();
    setAddrResults(d.results ?? []);
  };

  const applySaved = (a: SavedAddress) => {
    setAddressLine(a.addressLine);
    setArea(a.area ?? "");
    if (a.latitude !== null && a.longitude !== null) setPin({ lat: a.latitude, lng: a.longitude });
    if (!name) setName(a.recipientName);
    if (!phone) setPhone(a.phone);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrors({});
    setFormError(null);
    const local: FieldErrors = {};
    if (name.trim().length < 2) local.name = "Enter your name.";
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(phone.replace(/[\s\-()]/g, ""))) local.phone = "Enter a Bangladeshi mobile number, e.g. 01712-345678.";
    if (fulfilment === "delivery") {
      if (addressLine.trim().length < 6) local["delivery.addressLine"] = "Enter your full address (house, road, area).";
      if (!pin) local.delivery = "Set your delivery location on the map.";
    }
    if (!payment) local.payment = "Choose how you'll pay.";
    if (Object.keys(local).length) {
      setErrors(local);
      document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    submittingRef.current = true;
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey(),
          branchId: branch?.id,
          fulfilment,
          name,
          phone,
          email: email || undefined,
          delivery: fulfilment === "delivery" && pin ? { addressLine, area: area || undefined, city: "Dhaka", latitude: pin.lat, longitude: pin.lng } : undefined,
          deliveryInstructions: fulfilment === "delivery" ? instructions || undefined : undefined,
          notes: notes || undefined,
          paymentMethod: payment,
          discountCode: code || undefined,
          saveAddress: fulfilment === "delivery" && saveAddress,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.fields) setErrors(Object.fromEntries(d.fields.map((f: { path: string; message: string }) => [f.path, f.message])));
        setFormError(d.error ?? "We couldn't place your order.");
        if (r.status === 409) requote();
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }
      try {
        sessionStorage.removeItem(KEY_STORE);
      } catch {}
      await refreshCart();
      if (d.paymentUrl) window.location.assign(d.paymentUrl);
      else {
        const sep = d.orderUrl.includes("?") ? "&" : "?";
        router.push(`${d.orderUrl}${sep}placed=1${d.paymentError ? "&payment=init_failed" : ""}`);
      }
    } catch {
      setFormError("Network problem — your order may not have gone through. Check your connection and try again; you won't be charged twice.");
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const mapBranches = useMemo(
    () => (branch && branch.latitude !== null && branch.longitude !== null ? [{ id: branch.id, name: branch.name, latitude: branch.latitude, longitude: branch.longitude, approximate: branch.locationPrecision !== "exact" }] : []),
    [branch],
  );
  const err = (k: string) => errors[k] && (
    <p data-error className="mt-1.5 text-sm text-berry-600">
      {errors[k]}
    </p>
  );

  if (!q.lines.length)
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-4xl text-forest-900">Nothing to check out</h1>
        <Link href="/menu" className="btn-primary mt-6">
          Browse the menu
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.4fr_1fr]" noValidate>
      <div className="space-y-6">
        <h1 className="font-display text-5xl tracking-tight text-forest-900">Checkout</h1>

        {/* 1. branch & method */}
        <section className="card p-5 sm:p-6" aria-labelledby="s1">
          <h2 id="s1" className="font-display text-2xl text-forest-900">
            1. Branch &amp; collection
          </h2>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-cream-100 p-4">
            <MapPin className="mt-0.5 size-5 text-matcha-600" />
            <div className="flex-1">
              {branch ? (
                <>
                  <p className="font-semibold text-forest-900">{branch.name}</p>
                  <p className="text-sm text-forest-900/65">{branch.addressLine ? `${branch.addressLine}, ${branch.city}` : `${branch.area}, ${branch.city}`}</p>
                  <p className="text-sm text-forest-900/65">{branch.openLabel}</p>
                </>
              ) : (
                <p className="font-semibold">No branch selected</p>
              )}
            </div>
            <button type="button" onClick={() => setBranchPickerOpen(true)} className="text-sm font-semibold underline">
              Change
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pickup or delivery">
            {(["pickup", "delivery"] as const).map((f) => {
              const enabled = !!branch?.acceptsOnlineOrders && (f === "pickup" ? branch.pickupEnabled : branch.deliveryEnabled);
              const Icon = f === "pickup" ? Store : Truck;
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={fulfilment === f}
                  disabled={!enabled}
                  onClick={() => setFulfilment(f)}
                  className={clsx(
                    "flex items-start gap-3 rounded-3xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                    fulfilment === f ? "border-forest-900 bg-white" : "border-forest-900/10 bg-white/60",
                  )}
                >
                  <Icon className="mt-0.5 size-5" />
                  <span>
                    <span className="block font-semibold text-forest-900">{f === "pickup" ? "Pickup" : "Delivery"}</span>
                    <span className="block text-sm text-forest-900/60">
                      {!enabled
                        ? "Not offered by this branch yet"
                        : f === "pickup"
                          ? `Collect at the counter${branch?.prepTimeMinutes ? ` · usually ready in ~${branch.prepTimeMinutes} min` : ""}`
                          : `${formatBDT(branch!.deliveryFeePaisa!)} · within ${branch!.deliveryRadiusKm} km${branch?.deliveryTimeMinutes ? ` · ~${branch.deliveryTimeMinutes} min` : ""}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. contact */}
        <section className="card p-5 sm:p-6" aria-labelledby="s2">
          <h2 id="s2" className="font-display text-2xl text-forest-900">
            2. Your details
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="c-name">
                Name
              </label>
              <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} required />
              {err("name")}
            </div>
            <div>
              <label className="label" htmlFor="c-phone">
                Mobile number
              </label>
              <input id="c-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXX-XXXXXX" aria-invalid={!!errors.phone} required />
              {err("phone")}
              <p className="mt-1 text-xs text-forest-900/55">The branch calls this number if there&apos;s a question about your order.</p>
            </div>
            <div>
              <label className="label" htmlFor="c-email">
                Email <span className="font-normal text-forest-900/50">(optional)</span>
              </label>
              <input id="c-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
              {err("email")}
            </div>
          </div>
        </section>

        {/* 3. delivery */}
        {fulfilment === "delivery" && (
          <section className="card p-5 sm:p-6" aria-labelledby="s3">
            <h2 id="s3" className="font-display text-2xl text-forest-900">
              3. Delivery address
            </h2>
            {addresses.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button key={a.id} type="button" onClick={() => applySaved(a)} className="chip hover:bg-matcha-100">
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div>
                <label className="label" htmlFor="d-line">
                  House, road &amp; area
                </label>
                <input id="d-line" className="input" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} autoComplete="street-address" placeholder="House 12, Road 5, Block F" aria-invalid={!!errors["delivery.addressLine"]} />
                {err("delivery.addressLine")}
              </div>
              <div>
                <label className="label" htmlFor="d-area">
                  Area
                </label>
                <input id="d-area" className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Banasree" />
              </div>
            </div>
            <p className="label mt-5">Delivery location</p>
            <p className="-mt-1 mb-3 text-sm text-forest-900/60">We use the pin to check the branch can reach you. Drag it or tap the map to adjust.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={locate} className="btn-ghost py-2.5">
                {locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />} Use my location
              </button>
              <div className="relative min-w-0 flex-1 basis-56">
                <input
                  value={addrQuery}
                  onChange={(e) => setAddrQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchAddress(e as unknown as React.FormEvent)}
                  className="input py-2.5 pr-11"
                  placeholder="Search address or landmark"
                  aria-label="Search address or landmark"
                />
                <button type="button" onClick={searchAddress} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-xl bg-matcha-600 text-white" aria-label="Search">
                  <Search className="size-4" />
                </button>
              </div>
            </div>
            {addrResults.length > 0 && (
              <ul className="mt-2 divide-y divide-forest-900/5 overflow-hidden rounded-2xl ring-1 ring-forest-900/10">
                {addrResults.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        setPin({ lat: r.lat, lng: r.lng });
                        setAddrResults([]);
                      }}
                      className="w-full bg-white px-4 py-2.5 text-left text-sm hover:bg-matcha-50"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 h-72 overflow-hidden rounded-3xl ring-1 ring-forest-900/10">
              <BranchMap
                branches={mapBranches}
                pickPoint={pin}
                onPick={(p) => setPin({ lat: p.lat, lng: p.lng })}
                radiusKm={branch && branch.deliveryRadiusKm && branch.latitude !== null && branch.longitude !== null ? { center: { lat: branch.latitude, lng: branch.longitude }, km: branch.deliveryRadiusKm } : null}
              />
            </div>
            {err("delivery")}
            {pin && view.deliveryDistanceKm != null && (
              <p className={clsx("mt-2 text-sm", branch?.deliveryRadiusKm && view.deliveryDistanceKm > branch.deliveryRadiusKm ? "text-berry-600" : "text-forest-900/70")}>
                About {formatDistance(view.deliveryDistanceKm)} from {branch?.name} in a straight line (not driving distance).
              </p>
            )}
            <div className="mt-4">
              <label className="label" htmlFor="d-ins">
                Instructions for the rider <span className="font-normal text-forest-900/50">(optional)</span>
              </label>
              <input id="d-ins" className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Gate code, floor, landmark…" maxLength={300} />
            </div>
            {customer && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="size-4 accent-forest-800" /> Save this address to my account
              </label>
            )}
          </section>
        )}

        {/* 4. payment */}
        <section className="card p-5 sm:p-6" aria-labelledby="s4">
          <h2 id="s4" className="font-display text-2xl text-forest-900">
            {fulfilment === "delivery" ? "4" : "3"}. Payment
          </h2>
          <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Payment method">
            {payments.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={payment === p.id}
                disabled={!p.enabled}
                onClick={() => setPayment(p.id)}
                className={clsx(
                  "flex items-start gap-3 rounded-3xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                  payment === p.id ? "border-forest-900 bg-white" : "border-forest-900/10 bg-white/60",
                )}
              >
                {p.id === "cod" ? <Banknote className="mt-0.5 size-5" /> : <CreditCard className="mt-0.5 size-5" />}
                <span>
                  <span className="block font-semibold text-forest-900">{p.label}</span>
                  <span className="block text-sm text-forest-900/60">{p.enabled ? p.description : p.reason}</span>
                </span>
              </button>
            ))}
          </div>
          {err("payment")}
          {!payments.some((p) => p.enabled) && <p className="mt-3 text-sm text-berry-600">No payment method is switched on yet, so online orders can&apos;t be placed.</p>}
          <div className="mt-5">
            <label className="label" htmlFor="o-notes">
              Order notes <span className="font-normal text-forest-900/50">(optional)</span>
            </label>
            <textarea id="o-notes" className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </div>
        </section>
      </div>

      {/* summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-forest-900">Your order</h2>
            {quoting && <LoaderCircle className="size-4 animate-spin text-matcha-600" aria-label="Updating totals" />}
          </div>
          <ul className="mt-4 space-y-3">
            {q.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold text-forest-900">
                    {l.quantity} × {l.productName}
                  </span>
                  <span className="block text-xs text-forest-900/55">{[l.variantLabel, l.optionsLabel].filter(Boolean).join(" · ")}</span>
                  {l.status !== "ok" && <span className="block text-xs font-semibold text-berry-600">{l.message}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatBDT(l.lineTotalPaisa)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <label htmlFor="promo" className="sr-only">
              Discount code
            </label>
            <input id="promo" className="input py-2.5" placeholder="Discount code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
            <button type="button" onClick={() => setCode(codeInput.trim())} className="btn-ghost shrink-0 py-2.5">
              Apply
            </button>
          </div>
          {code && q.codeError && <p className="mt-1.5 text-sm text-berry-600">{q.codeError}</p>}
          {code && q.appliedDiscount?.code && <p className="mt-1.5 text-sm text-matcha-700">Code {q.appliedDiscount.code} applied.</p>}
          <div className="mt-5 border-t border-forest-900/10 pt-4">
            <CartSummary view={{ ...view, fulfilment }} />
          </div>

          {(hardBlockers.length > 0 || formError) && (
            <ul className="mt-4 space-y-2 rounded-2xl bg-lemon-300/40 p-4 text-sm text-forest-900" role="alert">
              {formError && (
                <li className="flex gap-2 font-semibold">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {formError}
                </li>
              )}
              {hardBlockers.map((b) => (
                <li key={b.code} className="flex gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {b.message}
                </li>
              ))}
            </ul>
          )}

          <button type="submit" disabled={submitting || hardBlockers.length > 0 || !payment || !payments.some((p) => p.enabled)} className="btn-primary mt-5 w-full py-4 text-base">
            {submitting ? <LoaderCircle className="size-5 animate-spin" /> : <Lock className="size-4" />}
            {payment === "sslcommerz" ? `Pay ${formatBDT(q.totalPaisa)}` : `Place order · ${formatBDT(q.totalPaisa)}`}
          </button>
          <p className="mt-3 text-center text-xs text-forest-900/55">
            Totals are calculated by CHAJOY&apos;s server. By ordering you agree to the{" "}
            <Link href="/policies/terms" className="underline">
              terms
            </Link>
            .
          </p>
          {view.branch?.isSampleConfig && <p className="mt-2 rounded-xl bg-lemon-300/50 p-2 text-center text-xs font-semibold">Sample settings — this is a test order.</p>}
          <span className="sr-only" aria-live="polite">
            {blockers.length ? `${blockers.length} issue(s) to resolve` : "Ready to place order"}
          </span>
        </div>
      </aside>
    </form>
  );
}
