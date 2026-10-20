"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { ArrowRight, Flame, LoaderCircle, Snowflake } from "lucide-react";
import { SceneGate } from "@/components/three/SceneGate";
import { useStore } from "@/components/store/StoreProvider";
import { formatBDT } from "@/lib/money";
import type { ProductVisual } from "@/lib/db/schema";
import type { Hotspot } from "@/components/three/InteractiveViewer";

const InteractiveViewer = dynamic(() => import("@/components/three/InteractiveViewer"), { ssr: false });

export type ShowcaseProduct = {
  id: number;
  slug: string;
  name: string;
  nameZh: string | null;
  description: string | null;
  image: string | null;
  visual: ProductVisual;
  temperatures: ("cold" | "hot")[];
  variants: { id: number; sizeCode: string; label: string; volumeMl: number | null; pricePaisa: number; available: boolean }[];
  availability: string;
};

// Every hotspot fact comes from the official menu board.
const HOTSPOTS: Hotspot[] = [
  { id: "pearls", label: "Brown sugar pearls", detail: "黑糖珍珠 — the brown sugar boba that gives this drink its name on the menu.", y: 0.14, side: -1 },
  { id: "tea", label: "CHAJOY milk tea", detail: "Choose 50%, 75% or 100% sugar when you order.", y: 0.48, side: 1 },
  { id: "ice", label: "Your ice, your way", detail: "Less or normal ice — or order it hot instead.", y: 0.86, side: -1 },
  { id: "cup", label: "Two sizes", detail: "Small cup 370 ml or medium cup 500 ml.", y: 0.7, side: 1 },
];

export function Showcase({ p, branchName }: { p: ShowcaseProduct; branchName: string | null }) {
  const { addItem, busy } = useStore();
  const [variantId, setVariantId] = useState(p.variants[p.variants.length - 1]?.id);
  const [temp, setTemp] = useState<"cold" | "hot">(p.temperatures[0] ?? "cold");
  const [adding, setAdding] = useState(false);
  const v = p.variants.find((x) => x.id === variantId) ?? p.variants[0];
  const orderable = p.availability === "available" || p.availability === "no_branch";

  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 sm:py-28" aria-labelledby="showcase-title">
      <p aria-hidden className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[22vw] leading-none text-matcha-100/70">
        {p.nameZh}
      </p>
      <div className="container-x relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative h-[460px] overflow-hidden rounded-5xl bg-[#e8f0d3] ring-1 ring-forest-900/5 sm:h-[560px]">
          <SceneGate
            className="h-full w-full"
            fallback={
              <div className="relative h-full w-full">
                {p.image && <Image src={p.image} alt={`${p.name} — photo from the official CHAJOY menu`} fill sizes="(min-width:1024px) 50vw, 90vw" className="menu-photo object-contain p-10" />}
                <span className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-forest-900 ring-1 ring-forest-900/10">Photo: official CHAJOY menu</span>
              </div>
            }
          >
            {(env) => <InteractiveViewer env={env} visual={p.visual} size={v?.sizeCode ?? "M"} temperature={temp} background="#e8f0d3" hotspots={temp === "hot" ? HOTSPOTS.filter((h) => h.id !== "ice") : HOTSPOTS} />}
          </SceneGate>
        </div>

        <div>
          <p className="eyebrow mb-3">Signature drink</p>
          <h2 id="showcase-title" className="font-display text-5xl leading-none tracking-tight text-forest-900 sm:text-6xl">
            {p.name}
          </h2>
          <p className="mt-2 text-lg text-forest-900/50">{p.nameZh}</p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-forest-900/75">{p.description} Drag the cup to turn it, and tap the + markers to explore it.</p>

          <fieldset className="mt-7">
            <legend className="label">Size</legend>
            <div className="grid grid-cols-2 gap-2">
              {p.variants.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === v?.id}
                  onClick={() => setVariantId(x.id)}
                  className={clsx(
                    "rounded-3xl border-2 p-4 text-left transition",
                    x.id === v?.id ? "border-forest-900 bg-white shadow-soft" : "border-forest-900/10 bg-white/60 hover:border-forest-900/30",
                  )}
                >
                  <span className="block text-sm font-semibold text-forest-900">{x.label}</span>
                  <span className="mt-1 block font-display text-2xl text-berry-600">{formatBDT(x.pricePaisa)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {p.temperatures.length > 1 && (
            <fieldset className="mt-4">
              <legend className="label">Temperature</legend>
              <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-forest-900/10">
                {p.temperatures.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={temp === t}
                    onClick={() => setTemp(t)}
                    className={clsx("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold", temp === t ? "bg-forest-900 text-cream-50" : "text-forest-900/70")}
                  >
                    {t === "cold" ? <Snowflake className="size-4" /> : <Flame className="size-4" />} {t === "cold" ? "Cold" : "Hot"}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              disabled={!orderable || busy || adding || !v}
              onClick={async () => {
                if (!v) return;
                setAdding(true);
                await addItem({ productId: p.id, variantId: v.id, quantity: 1, options: { temperature: temp }, label: `${p.name} · ${v.sizeCode} · ${temp === "cold" ? "Cold" : "Hot"}` });
                setAdding(false);
              }}
              className="btn-primary px-7 py-4 text-base"
            >
              {adding && <LoaderCircle className="size-4 animate-spin" />}
              {orderable ? `Add to cart · ${v ? formatBDT(v.pricePaisa) : ""}` : `Unavailable${branchName ? ` at ${branchName}` : ""}`}
            </button>
            <Link href={`/products/${p.slug}`} className="btn-ghost px-6 py-4 text-base">
              Sugar, ice & toppings <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
