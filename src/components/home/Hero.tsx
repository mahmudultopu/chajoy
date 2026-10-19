"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, MapPin } from "lucide-react";
import { SceneGate } from "@/components/three/SceneGate";
import { useStore } from "@/components/store/StoreProvider";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

export type HeroCopy = { eyebrow: string; headline: string; headlineAccent: string; subhead: string };

export function Hero({ copy, callout }: { copy: HeroCopy; callout: { name: string; slug: string; prices: string } | null }) {
  const { setBranchPickerOpen } = useStore();
  return (
    <section id="hero" className="relative isolate overflow-hidden bg-forest-950 text-cream-50">
      {/* light & texture */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[38%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-matcha-500/35 blur-[90px]" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-lemon-400/10 blur-3xl" />
        <div className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-berry-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fffdf6_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className="container-x relative flex min-h-[min(100svh,960px)] flex-col pb-10 pt-8 sm:pt-12">
        <div className="relative z-20 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-cream-50/20 bg-cream-50/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-cream-50/85 backdrop-blur">
            <span className="size-1.5 rounded-full bg-matcha-300" /> {copy.eyebrow}
          </span>
        </div>

        {/* far garnish, blurred: a depth-of-field layer behind the type */}
        <SceneGate className="pointer-events-none absolute inset-0 z-0 blur-[3px] motion-reduce:blur-[2px]" fallback={null} allowLow={false}>
          {(env) => <HeroScene env={env} triggerId="hero" layer="back" />}
        </SceneGate>

        <h1 className="relative z-[5] mt-8 select-none text-center font-display font-semibold leading-[0.84] tracking-[-0.035em] sm:mt-6">
          <span className="block text-[clamp(4.1rem,15.5vw,13.75rem)] text-cream-50">{copy.headline}</span>
          <span className="mt-[0.22em] block text-[clamp(4.1rem,15.5vw,13.75rem)] italic text-matcha-300 sm:mt-[0.3em]">{copy.headlineAccent}</span>
        </h1>

        {/* 3D layer sits above the type so the cup breaks through it */}
        <SceneGate
          className="pointer-events-none absolute inset-x-0 top-14 z-10 h-[64svh] min-h-[420px] sm:top-6 sm:h-[78%] sm:max-h-[780px]"
          fallback={
            <div className="flex h-full items-center justify-center">
              <figure className="relative mt-24 aspect-[3/4] h-[52%] sm:mt-10 sm:h-[66%]">
                <div className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-[2.5rem] border-[6px] border-cream-50/90 shadow-lift">
                  <Image src="/images/brand/three-cups.webp" alt="CHAJOY sundae, milk tea and strawberry sundae on a counter" fill priority sizes="(min-width:768px) 360px, 70vw" className="object-cover" />
                </div>
                <figcaption className="absolute -bottom-7 left-0 right-0 text-center text-[11px] font-semibold text-cream-50/60">Photo from a CHAJOY store</figcaption>
              </figure>
            </div>
          }
        >
          {(env) => (
            <>
              <HeroScene env={env} triggerId="hero" layer="front" />
              <span className="absolute right-4 top-0 rounded-full bg-cream-50/10 px-3 py-1 text-[11px] font-semibold text-cream-50/70 sm:right-6 sm:top-6 lg:right-8">3D illustration</span>
            </>
          )}
        </SceneGate>

        <div className="relative z-20 mt-auto grid items-end gap-6 pt-[34svh] sm:pt-[30vh] lg:grid-cols-[1.1fr_1fr] lg:pt-0">
          <div className="max-w-lg rounded-3xl bg-forest-950/55 p-4 backdrop-blur-sm sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:max-w-[26rem]">
            <p className="text-base leading-relaxed text-cream-50/85 sm:text-lg">{copy.subhead}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/menu" className="btn-matcha px-6 py-3.5 text-[15px]">
                Explore our menu <ArrowRight className="size-4" />
              </Link>
              <button onClick={() => setBranchPickerOpen(true)} className="btn-outline-light px-6 py-3.5 text-[15px]">
                <MapPin className="size-4" /> Find nearest branch
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4 lg:justify-end">
            {callout && (
              <Link href={`/products/${callout.slug}`} className="group rounded-3xl bg-cream-50 px-5 py-4 text-forest-900 shadow-lift transition hover:-translate-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-matcha-700">In the spotlight</p>
                <p className="mt-1 font-display text-xl font-semibold">{callout.name}</p>
                <p className="mt-0.5 text-sm font-semibold text-berry-600">{callout.prices}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-900/70 group-hover:text-forest-900">
                  Customize yours <ArrowRight className="size-3.5" />
                </span>
              </Link>
            )}
            <Sticker />
          </div>
        </div>

        <a href="#discover" className="relative z-20 mx-auto mt-8 hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cream-50/50 hover:text-cream-50 sm:flex">
          Scroll <ArrowDown className="size-3.5 motion-safe:animate-bounce" />
        </a>
      </div>
    </section>
  );
}

/** Rotating badge with the slogan printed on CHAJOY's menu board. */
function Sticker() {
  return (
    <div className="relative hidden size-32 shrink-0 sm:block" aria-hidden>
      <svg viewBox="0 0 200 200" className="absolute inset-0 animate-spin-slow">
        <defs>
          <path id="circ" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="98" fill="#bfd876" />
        <text fill="#10291a" fontSize="17" fontWeight="800" letterSpacing="3.2">
          <textPath href="#circ">FOLLOW MY CONE TO JOY · SCOOP JOY SIP CHA ·</textPath>
        </text>
      </svg>
      <Image src="/images/brand/chajoy-logo.webp" alt="" width={64} height={64} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
    </div>
  );
}
