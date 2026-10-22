/** About page: CHAJOY's story, store photos and branches. */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSettings } from "@/lib/services/settings";
import { listBranches } from "@/lib/services/branches";

/** Page title and search-engine settings. */
export const metadata: Metadata = {
  title: "Our story",
  description: "ChaJoy is a fast-growing international tea, ice cream and dessert brand bringing premium quality at an affordable price to Bangladesh.",
  alternates: { canonical: "/about" },
};

/** Renders the about page. */
export default async function AboutPage() {
  const [settings, branches] = await Promise.all([getSettings(), listBranches()]);
  return (
    <div className="pb-10">
      <section className="container-x pt-12 sm:pt-16">
        <p className="eyebrow">Our story</p>
        <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[0.95] tracking-tight text-forest-900 sm:text-7xl">
          Share cha. <em className="font-medium text-matcha-600">Share joy.</em>
        </h1>
      </section>
      <section className="container-x mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="space-y-5 text-lg leading-relaxed text-forest-900/80">
          {settings.story.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p>
            Today you&apos;ll find us in {branches.map((b) => b.area).join(", ").replace(/, ([^,]*)$/, " and $1")}.
          </p>
          <Link href="/branches" className="btn-primary mt-2">
            Find your nearest branch <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-4xl">
            <Image src="/images/stores/badda.webp" alt="CHAJOY Badda store with a green balloon arch and penguin standees" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" priority />
          </div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-4xl">
            <Image src="/images/brand/store-interior.webp" alt="CHAJOY seating area" fill sizes="25vw" className="object-cover" />
          </div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-4xl">
            <Image src="/images/stores/mohammadpur.webp" alt="CHAJOY Mohammadpur corner store" fill sizes="25vw" className="object-cover" />
          </div>
        </div>
      </section>
      <section className="container-x mt-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Milk tea & fruit tea", "Signature milk teas and fruit teas, made the way you like them: sugar from 50% to 100%, less or normal ice."],
            ["Ice cream & sundaes", "Our cones and sundaes come in original or matcha flavour."],
            ["Follow my cone to joy", "From our menu board: scoop joy, sip cha — and make every hour your happy hour."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-4xl bg-white p-7 ring-1 ring-forest-900/5">
              <h2 className="font-display text-2xl text-forest-900">{t}</h2>
              <p className="mt-2 text-forest-900/70">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
