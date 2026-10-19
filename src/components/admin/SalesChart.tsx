"use client";

import { useState } from "react";
import { formatBDT } from "@/lib/money";

/**
 * Daily sales, one series: columns ≤24px with 4px rounded tops, hairline grid,
 * per-column hover/focus tooltip, and a table view so no value is hover-only.
 */
export function SalesChart({ series }: { series: { day: string; totalPaisa: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.map((s) => s.totalPaisa), 0);
  const niceMax = (() => {
    if (max <= 0) return 100_000; // ৳1,000 scale for an empty chart
    const taka = max / 100;
    const mag = Math.pow(10, Math.floor(Math.log10(taka)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => taka / s <= 4) ?? 10 * mag;
    return Math.ceil(taka / step) * step * 100;
  })();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));
  const W = 720;
  const H = 220;
  const left = 56;
  const bottom = 24;
  const plotW = W - left - 8;
  const plotH = H - bottom - 8;
  const band = plotW / series.length;
  const bw = Math.min(24, band - 2);
  const compact = (p: number) => {
    const t = p / 100;
    return t >= 1000 ? `৳${(t / 1000).toFixed(t >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : `৳${t}`;
  };
  const r = 4;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily sales column chart">
          {ticks.map((t) => {
            const y = 8 + plotH - (t / niceMax) * plotH;
            return (
              <g key={t}>
                <line x1={left} x2={W - 8} y1={y} y2={y} stroke="#e7e3d6" strokeWidth={1} />
                <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#5e6b62">
                  {compact(t)}
                </text>
              </g>
            );
          })}
          {series.map((s, i) => {
            const h = niceMax ? (s.totalPaisa / niceMax) * plotH : 0;
            const x = left + i * band + (band - bw) / 2;
            const y = 8 + plotH - h;
            const showLabel = series.length <= 14 || i % Math.ceil(series.length / 10) === 0 || i === series.length - 1;
            return (
              <g key={s.day}>
                {h > 0 && (
                  <path
                    d={h > r ? `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${y + h} Z` : `M${x},${y + h} V${y} H${x + bw} V${y + h} Z`}
                    fill={hover === i ? "#8db33a" : "#6f9126"}
                  />
                )}
                {/* hit target: the whole column slot, bigger than the mark */}
                <rect
                  x={left + i * band}
                  y={8}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${s.day}: ${formatBDT(s.totalPaisa)}, ${s.orders} orders`}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
                {showLabel && (
                  <text x={left + i * band + band / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#5e6b62">
                    {new Date(s.day + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={left} x2={W - 8} y1={8 + plotH} y2={8 + plotH} stroke="#cfcab8" strokeWidth={1} />
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-forest-950 px-3 py-2 text-xs text-cream-50 shadow-lift"
            style={{ left: `${((left + hover * band + band / 2) / W) * 100}%` }}
          >
            <p className="text-sm font-bold">{formatBDT(series[hover].totalPaisa)}</p>
            <p className="text-cream-50/70">
              {series[hover].day} · {series[hover].orders} order{series[hover].orders === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-forest-900/70">
        <summary className="cursor-pointer font-semibold">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-forest-900/55">
              <th className="py-1 font-semibold">Day</th>
              <th className="py-1 font-semibold">Orders</th>
              <th className="py-1 text-right font-semibold">Sales</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.day} className="border-t border-forest-900/5">
                <td className="py-1">{s.day}</td>
                <td className="py-1 tabular-nums">{s.orders}</td>
                <td className="py-1 text-right tabular-nums">{formatBDT(s.totalPaisa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
