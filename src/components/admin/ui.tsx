"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

export type ActionResult = { ok: boolean; message: string; fields?: Record<string, string> } | null;

export function SubmitButton({ children, className, variant = "primary", confirm }: { children: React.ReactNode; className?: string; variant?: "primary" | "ghost" | "danger"; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={clsx(
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "danger" && "btn border border-berry-500/40 bg-white text-berry-600 hover:bg-berry-500 hover:text-white",
        "py-2.5",
        className,
      )}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** A form bound to a server action, showing its result message inline. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, run] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      {state && (
        <div role={state.ok ? "status" : "alert"} className={clsx("mt-3 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm", state.ok ? "bg-matcha-100 text-forest-900" : "bg-berry-500/10 text-berry-600")}>
          {state.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          <div>
            <p className="font-semibold">{state.message}</p>
            {state.fields && (
              <ul className="mt-1 list-disc pl-4">
                {Object.entries(state.fields).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-mono text-xs">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-forest-900/55">{hint}</span>}
    </label>
  );
}

export function Toggle({ name, defaultChecked, label, hint, disabled }: { name: string; defaultChecked?: boolean; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={clsx("flex items-start gap-3 rounded-2xl bg-cream-100 p-3", disabled && "opacity-50")}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 size-4 accent-forest-800" />
      <span>
        <span className="block text-sm font-semibold text-forest-900">{label}</span>
        {hint && <span className="block text-xs text-forest-900/60">{hint}</span>}
      </span>
    </label>
  );
}
