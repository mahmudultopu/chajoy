"use client";

import Link from "next/link";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { clsx } from "clsx";
import { useStore } from "@/components/store/StoreProvider";

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
      {toasts.map((t) => {
        const Icon = t.tone === "ok" ? CircleCheck : t.tone === "error" ? TriangleAlert : Info;
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-3xl p-4 shadow-lift ring-1",
              t.tone === "error" ? "bg-white ring-berry-500/30" : "bg-forest-900 text-cream-50 ring-white/10",
            )}
          >
            <Icon className={clsx("mt-0.5 size-5 shrink-0", t.tone === "error" ? "text-berry-600" : "text-matcha-300")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className={clsx("mt-0.5 text-sm", t.tone === "error" ? "text-ink/70" : "text-cream-50/75")}>{t.body}</p>}
              {t.action && (
                <Link href={t.action.href} className={clsx("mt-2 inline-block text-sm font-semibold underline underline-offset-4", t.tone === "error" ? "text-forest-800" : "text-matcha-300")}>
                  {t.action.label}
                </Link>
              )}
            </div>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
