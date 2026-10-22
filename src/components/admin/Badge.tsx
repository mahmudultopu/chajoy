/** Small coloured status badges used in admin tables. */

import { clsx } from "clsx";

const TONES = {
  green: "bg-matcha-100 text-forest-900",
  yellow: "bg-lemon-300/60 text-forest-950",
  red: "bg-berry-500/12 text-berry-600",
  grey: "bg-forest-900/6 text-forest-900/70",
  dark: "bg-forest-900 text-cream-50",
} as const;

/** A rounded label in one of the preset tones. */
export function Badge({ tone = "grey", children, className }: { tone?: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone], className)}>{children}</span>;
}

/** Badge tone for an order status. */
export function statusTone(s: string): keyof typeof TONES {
  if (s === "pending_confirmation") return "yellow";
  if (["confirmed", "preparing", "ready", "out_for_delivery"].includes(s)) return "green";
  if (["delivered", "completed"].includes(s)) return "dark";
  if (["cancelled", "refunded", "failed"].includes(s)) return "red";
  return "grey";
}
