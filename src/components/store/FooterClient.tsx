"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useStore } from "./StoreProvider";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "busy" | "done" | "error"; message?: string }>({ status: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ status: "busy" });
    const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent }) });
    const d = await r.json().catch(() => ({}));
    setState(r.ok ? { status: "done", message: d.message } : { status: "error", message: d.fields?.[0]?.message ?? d.error });
  };

  if (state.status === "done") return <p className="rounded-2xl bg-white/10 p-4 text-sm text-cream-50">{state.message}</p>;
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <label htmlFor="nl-email" className="sr-only">
          Email
        </label>
        <input
          id="nl-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-full border border-cream-50/20 bg-white/10 px-4 py-3 text-sm text-cream-50 placeholder:text-cream-50/45 focus:border-matcha-300 focus:outline-none"
        />
        <button disabled={!consent || state.status === "busy"} className="btn-matcha shrink-0">
          {state.status === "busy" ? <LoaderCircle className="size-4 animate-spin" /> : "Subscribe"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-cream-50/70">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-matcha-400" />
        I agree to receive CHAJOY news and offers by email and can unsubscribe at any time.
      </label>
      {state.status === "error" && <p className="text-xs text-berry-400">{state.message}</p>}
    </form>
  );
}

export function LiteModeToggle() {
  const { liteMode, setLiteMode } = useStore();
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-cream-50/70">
      <input type="checkbox" checked={liteMode} onChange={(e) => setLiteMode(e.target.checked)} className="accent-matcha-400" />
      Lite mode (turn off 3D effects)
    </label>
  );
}
