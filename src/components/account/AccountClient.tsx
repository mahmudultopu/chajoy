/**
 * Client-side pieces of the customer account page: sign-in/register forms,
 * sign out, reorder and address deletion.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { LoaderCircle, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { useStore } from "@/components/store/StoreProvider";

async function post(url: string, body: unknown, method = "POST") {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, d };
}

/** Sign-in and registration forms, switchable with a toggle. */
export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", marketingConsent: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = mode === "login" ? { action: "login", email: f.email, password: f.password } : { action: "register", ...f, phone: f.phone || undefined };
    const { ok, d } = await post("/api/account", body);
    setBusy(false);
    if (ok) router.refresh();
    else setError(d.fields?.[0]?.message ?? d.error);
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="flex rounded-full bg-white p-1 ring-1 ring-forest-900/10" role="tablist">
        {(["login", "register"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={clsx("flex-1 rounded-full py-2.5 text-sm font-semibold", mode === m ? "bg-forest-900 text-cream-50" : "text-forest-900")}>
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="card mt-5 space-y-4 p-6">
        {mode === "register" && (
          <div>
            <label className="label" htmlFor="a-name">
              Name
            </label>
            <input id="a-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="label" htmlFor="a-email">
            Email
          </label>
          <input id="a-email" type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" required />
        </div>
        {mode === "register" && (
          <div>
            <label className="label" htmlFor="a-phone">
              Mobile <span className="font-normal text-forest-900/50">(optional)</span>
            </label>
            <input id="a-phone" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" autoComplete="tel" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="a-pw">
            Password
          </label>
          <input
            id="a-pw"
            type="password"
            className="input"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 10 : undefined}
            required
          />
          {mode === "register" && <p className="mt-1 text-xs text-forest-900/55">At least 10 characters.</p>}
        </div>
        {mode === "register" && (
          <label className="flex items-start gap-2 text-sm text-forest-900/75">
            <input type="checkbox" checked={f.marketingConsent} onChange={(e) => setF({ ...f, marketingConsent: e.target.checked })} className="mt-0.5 size-4 accent-forest-800" />
            Send me CHAJOY news and offers by email (optional).
          </label>
        )}
        {error && <p className="text-sm text-berry-600">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-3.5">
          {busy && <LoaderCircle className="size-4 animate-spin" />}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
        <p className="text-center text-xs text-forest-900/55">
          Accounts are optional — you can check out as a guest. Phone sign-in isn&apos;t available yet.
        </p>
      </form>
    </div>
  );
}

/** Signs the customer out and refreshes the page. */
export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await post("/api/account", { action: "logout" });
        router.refresh();
      }}
      className="btn-ghost"
    >
      <LogOut className="size-4" /> Sign out
    </button>
  );
}

/** Adds the items of a past order back into the cart. */
export function ReorderButton({ orderNumber }: { orderNumber: string }) {
  const { toast, refreshCart, setCartOpen } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { ok, d } = await post("/api/account/reorder", { orderNumber });
        setBusy(false);
        await refreshCart();
        if (!ok) return toast({ tone: "error", title: "Couldn't reorder", body: d.error });
        if (d.skipped?.length) toast({ tone: "info", title: "Some items weren't added", body: d.skipped.map((s: { name: string; reason: string }) => `${s.name}: ${s.reason}`).join(" ") });
        else toast({ tone: "ok", title: "Added to your cart" });
        setCartOpen(true);
      }}
      className="inline-flex items-center gap-1 text-sm font-semibold text-forest-900 underline-offset-2 hover:underline"
    >
      {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Order again
    </button>
  );
}

/** Deletes a saved delivery address. */
export function DeleteAddressButton({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      aria-label="Delete address"
      onClick={async () => {
        await post(`/api/account/addresses/${id}`, null, "DELETE");
        router.refresh();
      }}
      className="text-forest-900/50 hover:text-berry-600"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

