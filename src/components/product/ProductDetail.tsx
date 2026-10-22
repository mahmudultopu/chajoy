/**
 * Product page body: photo gallery or 3D view, sizes, options, toppings,
 * quantity and add to cart.
 */

"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Box, Check, Flame, Image as ImageIcon, LoaderCircle, MapPin, Minus, Plus, Snowflake } from "lucide-react";
import { SceneGate } from "@/components/three/SceneGate";
import { useStore } from "@/components/store/StoreProvider";
import { formatBDT } from "@/lib/money";
import type { ProductOptionConfig, ProductVisual } from "@/lib/db/schema";

const InteractiveViewer = dynamic(() => import("@/components/three/InteractiveViewer"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-none" />,
});

export type DetailProduct = {
  id: number;
  name: string;
  nameZh: string | null;
  description: string | null;
  category: string;
  accent: string | null;
  availability: "available" | "unavailable_at_branch" | "unavailable" | "no_branch";
  optionConfig: ProductOptionConfig;
  visual: ProductVisual | null;
  /** `cut` = official photo with the menu background removed */
  images: { url: string; cut: boolean; alt: string; variantKey: string | null; sourceType: string; isLowRes: boolean }[];
  backdrop: [string, string];
  variants: { id: number; sizeCode: string; label: string; volumeMl: number | null; pricePaisa: number; available: boolean; stockNote: string | null }[];
  toppings: { id: number; name: string; pricePaisa: number; image: string | null; available: boolean }[];
};

const SUGAR = [50, 75, 100] as const;

function Seg<T extends string | number>({ value, set, items, label }: { value: T; set: (v: T) => void; items: { v: T; label: React.ReactNode }[]; label: string }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={String(it.v)}
            type="button"
            aria-pressed={value === it.v}
            onClick={() => set(it.v)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition",
              value === it.v ? "border-forest-900 bg-forest-900 text-cream-50" : "border-forest-900/10 bg-white text-forest-900 hover:border-forest-900/30",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}


/** Interactive product detail with option pickers and a live price. */
export function ProductDetail({ p, branchName }: { p: DetailProduct; branchName: string | null }) {
  const { addItem, busy, setBranchPickerOpen } = useStore();
  const c = p.optionConfig;
  const [variantId, setVariantId] = useState(p.variants.find((v) => v.available)?.id ?? p.variants[0]?.id);
  const [temperature, setTemperature] = useState<"cold" | "hot">(c.temperatures?.[0] ?? "cold");
  const [flavour, setFlavour] = useState<"original" | "matcha">(c.flavours?.[0] ?? "original");
  const [sugar, setSugar] = useState<50 | 75 | 100>(100);
  const [ice, setIce] = useState<"less" | "normal">("normal");
  const [toppings, setToppings] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"photo" | "3d">("photo");
  const [imageIdx, setImageIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const v = p.variants.find((x) => x.id === variantId) ?? p.variants[0];
  const toppingTotal = toppings.reduce((s, id) => s + (p.toppings.find((t) => t.id === id)?.pricePaisa ?? 0), 0);
  const unit = (v?.pricePaisa ?? 0) + toppingTotal;
  const orderable = (p.availability === "available" || p.availability === "no_branch") && ((v?.available ?? false) || p.availability === "no_branch");

  // photo for the chosen flavour, if the menu has one
  const photos = useMemo(() => {
    const flav = p.images.find((i) => i.variantKey === `flavour:${flavour}`);
    const rest = p.images.filter((i) => i !== flav);
    return flav ? [flav, ...rest] : p.images;
  }, [p.images, flavour]);
  const photo = photos[Math.min(imageIdx, photos.length - 1)];

  const add = async () => {
    if (!v) return;
    setAdding(true);
    const options = {
      ...(c.temperatures?.length ? { temperature } : {}),
      ...(c.flavours?.length ? { flavour } : {}),
      ...(c.sugar ? { sugar } : {}),
      ...(c.ice && temperature !== "hot" ? { ice } : {}),
      ...(toppings.length ? { toppings } : {}),
    };
    const ok = await addItem({ productId: p.id, variantId: v.id, quantity: qty, options, label: `${qty} × ${p.name} (${v.label})` });
    setAdding(false);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      {/* media */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-[28px]" style={{ background: `radial-gradient(circle at 50% 42%, #ffffff 0%, ${p.backdrop[0]} 62%)` }}>
          {view === "photo" || !p.visual ? (
            photo && (
              <>
                {photo.cut ? (
                  <>
                    <span aria-hidden className="absolute bottom-[8%] left-1/2 h-[6%] w-[44%] -translate-x-1/2 rounded-[50%] bg-black/15 blur-lg" />
                    <Image src={photo.url} alt={photo.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-contain px-[20%] pb-[11%] pt-[17%] drop-shadow-[0_20px_26px_rgba(0,0,0,0.2)]" />
                  </>
                ) : (
                  <>
                    <span aria-hidden className="absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-3xl" />
                    <Image src={photo.url} alt={photo.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className={clsx("menu-photo object-contain", photo.isLowRes ? "p-[17%]" : "p-[8%]")} />
                  </>
                )}
                <span className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-forest-900 ring-1 ring-forest-900/10">
                  {photo.sourceType === "official_menu" ? "Photo: official CHAJOY menu" : photo.sourceType === "placeholder" ? "Placeholder — photo pending" : "Photo: CHAJOY"}
                </span>
              </>
            )
          ) : (
            <SceneGate
              className="h-full w-full"
              fallback={<div className="grid h-full place-items-center p-8 text-center text-sm text-forest-900/70">3D view isn&apos;t available on this device or in Lite mode.</div>}
            >
              {(env) => <InteractiveViewer env={env} visual={p.visual!} size={v?.sizeCode ?? "M"} temperature={temperature} flavour={flavour} background={p.backdrop[0]} />}
            </SceneGate>
          )}
          {p.visual && (
            <div className="absolute right-3 top-3 flex rounded-full bg-white/90 p-1 shadow-soft ring-1 ring-forest-900/10" role="group" aria-label="View">
              <button onClick={() => setView("photo")} aria-pressed={view === "photo"} className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold", view === "photo" ? "bg-forest-900 text-cream-50" : "text-forest-900")}>
                <ImageIcon className="size-3.5" /> Photo
              </button>
              <button onClick={() => setView("3d")} aria-pressed={view === "3d"} className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold", view === "3d" ? "bg-forest-900 text-cream-50" : "text-forest-900")}>
                <Box className="size-3.5" /> 3D
              </button>
            </div>
          )}
        </div>
        {view === "photo" && photos.length > 1 && (
          <div className="mt-3 flex gap-2">
            {photos.map((ph, i) => (
              <button
                key={ph.url}
                onClick={() => setImageIdx(i)}
                aria-label={`Show photo: ${ph.alt}`}
                aria-pressed={i === imageIdx}
                className={clsx("relative size-20 overflow-hidden rounded-2xl ring-2", i === imageIdx ? "ring-forest-900" : "ring-transparent")}
                style={{ background: p.backdrop[0] }}
              >
                <Image src={ph.url} alt="" fill sizes="80px" className={ph.cut ? "object-contain p-1.5" : "menu-photo object-contain p-1.5"} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* options */}
      <div className="pb-28 lg:pb-0">
        <p className="eyebrow">{p.category}</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] tracking-tight text-forest-900 sm:text-6xl">{p.name}</h1>
        {p.nameZh && <p className="mt-2 text-lg text-forest-900/45">{p.nameZh}</p>}
        <p className="mt-4 font-display text-3xl text-caramel-600">
          {formatBDT(unit)}
          {toppingTotal > 0 && <span className="ml-2 text-sm font-sans font-semibold text-forest-900/50">incl. toppings</span>}
        </p>
        {p.description && <p className="mt-4 max-w-prose text-base leading-relaxed text-forest-900/75">{p.description}</p>}

        <div className={clsx("mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm", p.availability === "available" ? "bg-matcha-100" : p.availability === "no_branch" ? "bg-white ring-1 ring-forest-900/10" : "bg-lemon-300/40")}>
          <MapPin className="mt-0.5 size-4 shrink-0" />
          {p.availability === "available" && (
            <span>
              Available at <strong>{branchName}</strong>
              {v?.stockNote ? ` · ${v.stockNote}` : ""}
            </span>
          )}
          {p.availability === "unavailable_at_branch" && (
            <span>
              <strong>Currently unavailable at {branchName}.</strong>{" "}
              <button className="underline" onClick={() => setBranchPickerOpen(true)}>
                Try another branch
              </button>
            </span>
          )}
          {p.availability === "unavailable" && <span>Temporarily unavailable at every branch.</span>}
          {p.availability === "no_branch" && (
            <span>
              Showing menu price.{" "}
              <button className="font-semibold underline" onClick={() => setBranchPickerOpen(true)}>
                Choose your branch
              </button>{" "}
              to check availability.
            </span>
          )}
        </div>

        <div className="mt-7 space-y-6">
          {p.variants.length > 1 && (
            <fieldset>
              <legend className="label">Size</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.variants.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={x.id === v?.id}
                    disabled={!x.available && p.availability !== "no_branch"}
                    onClick={() => setVariantId(x.id)}
                    className={clsx(
                      "rounded-3xl border-2 p-3.5 text-left transition disabled:opacity-40",
                      x.id === v?.id ? "border-forest-900 bg-white shadow-soft" : "border-forest-900/10 bg-white/60 hover:border-forest-900/30",
                    )}
                  >
                    <span className="block text-sm font-semibold text-forest-900">{x.label}</span>
                    <span className="mt-0.5 block font-display text-xl text-caramel-600">{formatBDT(x.pricePaisa)}</span>
                    {x.stockNote && <span className="text-xs text-forest-900/60">{x.stockNote}</span>}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {p.variants.length === 1 && v && v.sizeCode !== "ONE" && <p className="text-sm text-forest-900/70">Size: {v.label}</p>}

          {c.temperatures && c.temperatures.length > 1 && (
            <Seg
              label="Temperature"
              value={temperature}
              set={setTemperature}
              items={c.temperatures.map((t) => ({ v: t, label: t === "cold" ? <><Snowflake className="size-4" /> Cold</> : <><Flame className="size-4" /> Hot</> }))}
            />
          )}
          {c.flavours && c.flavours.length > 1 && (
            <Seg label="Flavour" value={flavour} set={setFlavour} items={c.flavours.map((f) => ({ v: f, label: f === "matcha" ? "Matcha 抹茶" : "Original 原味" }))} />
          )}
          {c.sugar && <Seg label="Sugar level" value={sugar} set={setSugar} items={SUGAR.map((s) => ({ v: s, label: `${s}%` }))} />}
          {c.ice && temperature !== "hot" && (
            <Seg label="Ice level" value={ice} set={setIce} items={[{ v: "less" as const, label: "Less ice" }, { v: "normal" as const, label: "Normal ice" }]} />
          )}

          {c.toppings && p.toppings.length > 0 && (
            <fieldset>
              <legend className="label">Toppings</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {p.toppings.map((t) => {
                  const on = toppings.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={clsx(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-2 pr-3 transition",
                        on ? "border-forest-900 bg-white" : "border-forest-900/10 bg-white/60",
                        !t.available && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        disabled={!t.available}
                        onChange={() => setToppings((all) => (on ? all.filter((x) => x !== t.id) : [...all, t.id]))}
                      />
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-cream-100">
                        {t.image && <Image src={t.image} alt="" fill sizes="44px" className="menu-photo object-cover" />}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-forest-900">
                        {t.name}
                        {!t.available && <span className="block text-xs font-normal">Unavailable here</span>}
                      </span>
                      <span className="text-sm font-semibold text-forest-900/70">+{formatBDT(t.pricePaisa)}</span>
                      <span className={clsx("grid size-5 place-items-center rounded-md border-2", on ? "border-forest-900 bg-forest-900 text-cream-50" : "border-forest-900/25")}>
                        {on && <Check className="size-3.5" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        {/* add to cart: inline on desktop, sticky bar on phones */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-forest-900/10 bg-cream-50/95 p-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="flex items-center rounded-full bg-white ring-1 ring-forest-900/10">
              <button aria-label="Fewer" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center rounded-full hover:bg-cream-100">
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
                {qty}
              </span>
              <button aria-label="More" onClick={() => setQty((q) => Math.min(20, q + 1))} className="grid size-11 place-items-center rounded-full hover:bg-cream-100">
                <Plus className="size-4" />
              </button>
            </div>
            <button onClick={add} disabled={!orderable || busy || adding} className="btn-primary flex-1 py-3.5 text-base">
              {adding ? <LoaderCircle className="size-5 animate-spin" /> : added ? <Check className="size-5" /> : null}
              {!orderable ? "Currently unavailable" : added ? "Added" : `Add to cart · ${formatBDT(unit * qty)}`}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-5 text-sm ring-1 ring-forest-900/5">
          <p className="font-semibold text-forest-900">Ingredients &amp; allergens</p>
          <p className="mt-1 text-forest-900/70">
            CHAJOY hasn&apos;t published ingredient or allergen information for this item yet. If you have an allergy, please check with the branch before ordering.
          </p>
        </div>
      </div>
    </div>
  );
}
