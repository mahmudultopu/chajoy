/**
 * Homepage sections: hero, signatures, store band, "made your way", matcha
 * series and gallery. Photography is CHAJOY's own: products cut from its
 * official high-resolution posters (public/images/cutouts/hq), menu photos,
 * and store photos from its website and Facebook page.
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, MapPin } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/ui/BrandIcons";


/** Shared page-width container classes for homepage sections. */
export const wrap = "mx-auto w-full max-w-[1280px] px-5 sm:px-8";

/** Small uppercase label shown above section headings. */
export function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] ${dark ? "text-caramel-300" : "text-matcha-600"}`}>{children}</p>;
}

// ------------------------------------------------------------------ hero

type HeroProps = {
  copy: { eyebrow: string; headline: string; headlineAccent: string; subhead: string };
  stats: { items: number; branches: number; fromPrice: string };
};

/** Homepage hero: headline, calls to action, key figures and the product stage. */
export function Hero({ copy, stats }: HeroProps) {
  return (
    <section className="relative -mt-[74px] overflow-hidden bg-cream-100 pt-[74px] text-ink">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-10 size-[780px] rounded-full bg-[radial-gradient(circle,rgba(140,198,63,0.28),rgba(140,198,63,0)_62%)]" />
      <div aria-hidden className="pointer-events-none absolute -left-40 bottom-[-300px] size-[620px] rounded-full bg-[radial-gradient(circle,rgba(224,168,102,0.30),rgba(224,168,102,0)_65%)]" />

      <div className={`${wrap} relative grid items-center gap-6 pb-14 pt-10 lg:min-h-[680px] lg:grid-cols-[1fr_1.05fr] lg:gap-0 lg:pb-20 lg:pt-6`}>
        <div className="relative z-10 max-w-[560px]">
          <p className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3.5 py-1.5 text-[12px] font-medium text-ink/75 backdrop-blur">
            <span className="size-1.5 rounded-full bg-matcha-400" /> {copy.eyebrow}
          </p>
          <h1 className="mt-7 font-display text-[54px] leading-[0.95] tracking-[-0.02em] sm:text-[76px] lg:text-[92px]">
            {copy.headline} <em className="text-matcha-600">{copy.headlineAccent}</em>
          </h1>
          <p className="mt-7 max-w-[440px] text-[17px] leading-relaxed text-ink/65">{copy.subhead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
            <Link href="/menu" className="inline-flex items-center gap-3 rounded-full bg-matcha-600 px-7 py-4 text-[15px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(79,125,44,0.7)] transition hover:bg-matcha-700">
              Order now <ArrowRight className="size-4" />
            </Link>
            <Link href="/#branches" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-6 py-4 text-[15px] font-medium text-ink transition hover:border-ink/40">
              <MapPin className="size-4" /> Find a branch
            </Link>
          </div>
          <dl className="mt-14 hidden max-w-[460px] sm:grid grid-cols-3 divide-x divide-ink/10 border-t border-ink/10 pt-7">
            {[
              [String(stats.items), "drinks & desserts"],
              [String(stats.branches), "branches in Dhaka"],
              [stats.fromPrice, "starting price"],
            ].map(([v, l]) => (
              <div key={l} className="px-4 first:pl-0">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-[34px] leading-none text-ink">{v}</dd>
                <dd className="mt-2 text-[12px] text-ink/55">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroStage />
      </div>
    </section>
  );
}

function HeroStage() {
  const items = [
    { src: "/images/cutouts/hq/chocolate-oreo-crumb-sundae--original.webp", alt: "CHAJOY Chocolate Oreo Crumb Sundae", cls: "-left-[4%] bottom-[14%] h-[58%] [rotate:-9deg] [animation-delay:-2s]" },
    { src: "/images/cutouts/hq/strawberry-sundae--matcha.webp", alt: "CHAJOY matcha Strawberry Sundae", cls: "-right-[6%] bottom-[16%] h-[58%] [rotate:10deg] [animation-delay:-4.5s]" },
    { src: "/images/cutouts/hq/boba-milk-tea.webp", alt: "CHAJOY Boba Milk Tea", cls: "left-[25%] bottom-[6%] h-[76%] z-10 [rotate:3deg]" },
  ];
  return (
    <div className="relative mx-auto aspect-[1/0.9] w-[86%] max-w-[600px] lg:w-full">
      <div aria-hidden className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_45%,#ffffff,#eef4df_50%,rgba(255,248,238,0)_72%)]" />
      <div aria-hidden className="absolute bottom-[5%] left-1/2 h-[7%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[#5b4330]/25 blur-2xl" />
      {items.map((it) => (
        <div key={it.src} className={`absolute aspect-[0.7] motion-safe:animate-float ${it.cls}`}>
          <Image src={it.src} alt={it.alt} fill priority quality={90} sizes="(min-width:1024px) 420px, 60vw" className="object-contain drop-shadow-[0_30px_36px_rgba(70,45,20,0.28)]" />
        </div>
      ))}
      <div className="absolute -bottom-[2%] right-[4%] z-20 h-[30%] w-[22%] motion-safe:animate-float [animation-delay:-1s]">
        <Image src="/images/cutouts/hq/penguin.webp" alt="The CHAJOY penguin" fill priority quality={90} sizes="160px" className="object-contain drop-shadow-[0_18px_22px_rgba(70,45,20,0.3)]" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ signatures

export type Signature = { slug: string; name: string; nameZh: string | null; note: string; price: string; image: string; tint: [string, string] };

/** Three large cards for CHAJOY's signature items. */
export function Signatures({ items }: { items: Signature[] }) {
  return (
    <section className="bg-white py-24 sm:py-32" aria-labelledby="sig-title">
      <div className={wrap}>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>From the menu board</Eyebrow>
            <h2 id="sig-title" className="font-display text-[44px] leading-[1] tracking-[-0.02em] text-ink sm:text-[60px]">
              Our <em className="text-matcha-600">signatures</em>
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink/60">Brown sugar boba, Oreo crumble and fresh strawberries on matcha soft serve.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((s) => (
            <Link key={s.slug} href={`/products/${s.slug}`} className="group relative flex flex-col overflow-hidden rounded-[28px] p-7" style={{ background: `linear-gradient(165deg, ${s.tint[0]}, ${s.tint[1]})` }}>
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-white/60 px-3 py-1 text-[12px] font-medium text-ink/70 backdrop-blur">{s.note}</span>
                <span className="grid size-11 place-items-center rounded-full bg-ink text-white transition group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
              </div>
              <div className="relative mx-auto my-4 aspect-[0.78] w-[78%]">
                <div aria-hidden className="absolute bottom-[2%] left-1/2 h-[6%] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-xl" />
                <Image src={s.image} alt={s.name} fill quality={90} sizes="(min-width:768px) 340px, 80vw" className="object-contain drop-shadow-[0_24px_30px_rgba(40,20,0,0.25)] transition duration-700 group-hover:-translate-y-2 group-hover:scale-[1.03]" />
              </div>
              <div className="mt-auto flex items-end justify-between gap-4">
                <div>
                  <h3 className="font-display text-[30px] leading-tight text-ink">{s.name}</h3>
                  {s.nameZh && <p className="mt-1 text-sm text-ink/55">{s.nameZh}</p>}
                </div>
                <p className="shrink-0 font-display text-[26px] text-ink">{s.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ full-bleed photo band

export function StoreBand({ branches }: { branches: number }) {
  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="band-title">
      <Image src="/images/social/badda-arch.webp" alt="CHAJOY Badda with its green balloon arch" fill quality={90} sizes="100vw" className="-z-10 object-cover object-[50%_60%]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(42,30,23,0.9)_0%,rgba(42,30,23,0.66)_42%,rgba(42,30,23,0.04)_75%)]" />
      <div className={`${wrap} flex min-h-[560px] items-center py-24`}>
        <div className="max-w-[520px] text-white">
          <Eyebrow dark>{branches} branches across Dhaka</Eyebrow>
          <h2 id="band-title" className="font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[60px]">
            Your next boba obsession is <em className="text-caramel-300">one table away.</em>
          </h2>
          <Link href="/#branches" className="mt-10 inline-flex items-center gap-3 rounded-full bg-cream-100 px-7 py-4 text-[15px] font-semibold text-ink transition hover:bg-white">
            Find your nearest CHAJOY <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ made your way

export function MadeYourWay({ toppings }: { toppings: { name: string; price: string }[] }) {
  const groups = [
    { title: "Sugar", options: ["50%", "75%", "100%"] },
    { title: "Ice", options: ["Less ice", "Normal ice", "Hot (milk teas)"] },
  ];
  return (
    <section className="bg-cream-100 py-24 sm:py-32" aria-labelledby="way-title">
      <div className={`${wrap} grid items-center gap-14 lg:grid-cols-2 lg:gap-20`}>
        <div className="relative">
          <div className="relative aspect-[4/3.4] overflow-hidden rounded-[28px]">
            <Image src="/images/social/boba-on-table.webp" alt="A CHAJOY Boba Milk Tea on a café table" fill quality={90} sizes="(min-width:1024px) 600px, 100vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-8 -right-3 hidden w-[42%] overflow-hidden rounded-[22px] border-[6px] border-white shadow-lift sm:block">
            <div className="relative aspect-square">
              <Image src="/images/social/cones-prep.webp" alt="CHAJOY cones being prepared for customers" fill sizes="260px" className="object-cover" />
            </div>
          </div>
        </div>
        <div>
          <Eyebrow>Made to order</Eyebrow>
          <h2 id="way-title" className="font-display text-[44px] leading-[1] tracking-[-0.02em] text-ink sm:text-[56px]">
            Exactly <em className="text-matcha-600">your way</em>, every cup
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink/60">Every CHAJOY drink is made when you order it. Choose your sweetness, your ice and your toppings — right from the menu.</p>
          <div className="mt-10 space-y-7">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink/45">{g.title}</p>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => (
                    <span key={o} className="rounded-full border border-ink/10 bg-white px-4 py-2 text-[14px] text-ink">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {toppings.length > 0 && (
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink/45">Toppings</p>
                <ul className="grid gap-x-8 sm:grid-cols-2">
                  {toppings.map((t) => (
                    <li key={t.name} className="flex items-center justify-between border-b border-ink/10 py-2.5 text-[15px] text-ink">
                      <span className="flex items-center gap-2.5">
                        <Check className="size-4 text-matcha-600" strokeWidth={2.5} /> {t.name}
                      </span>
                      <span className="text-ink/50">+{t.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ matcha series

export type MatchaItem = { name: string; price: string; href: string };

/** Matcha range section with prices and product photography. */
export function MatchaSeries({ items }: { items: MatchaItem[] }) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef4dc,#dfeabf)] py-24 sm:py-32" aria-labelledby="matcha-title">
      <div aria-hidden className="absolute right-[-10%] top-1/2 size-[720px] -translate-y-1/2 rounded-full bg-white/40 blur-3xl" />
      <div className={`${wrap} relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]`}>
        <div>
          <Eyebrow>Matcha series · 抹茶系列</Eyebrow>
          <h2 id="matcha-title" className="font-display text-[44px] leading-[1] tracking-[-0.02em] text-ink sm:text-[60px]">
            Green, creamy <em className="text-matcha-700">&amp; a little extra</em>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink/65">Matcha soft serve in a crisp cone, on our sundaes, or shaken with Oreo.</p>
          <ul className="mt-10 max-w-md divide-y divide-ink/10 border-y border-ink/10">
            {items.map((m) => (
              <li key={m.name}>
                <Link href={m.href} className="group flex items-center justify-between py-4">
                  <span className="font-display text-[22px] text-ink">{m.name}</span>
                  <span className="flex items-center gap-3 text-[15px] text-ink/70">
                    {m.price} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto aspect-[1.1] w-full max-w-[600px]">
          <div aria-hidden className="absolute bottom-[6%] left-1/2 h-[6%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[#5a7a20]/30 blur-2xl" />
          <div className="absolute bottom-[8%] left-[6%] h-[72%] w-[22%] [rotate:-8deg]">
            <Image src="/images/cutouts/hq/matcha-cone.webp" alt="CHAJOY matcha ice cream cone" fill quality={90} sizes="160px" className="object-contain drop-shadow-[0_24px_24px_rgba(50,70,10,0.3)]" />
          </div>
          <div className="absolute bottom-[6%] left-[26%] z-10 h-[90%] w-[48%]">
            <Image src="/images/cutouts/hq/strawberry-sundae--matcha.webp" alt="CHAJOY matcha Strawberry Sundae" fill quality={90} sizes="(min-width:1024px) 300px, 50vw" className="object-contain drop-shadow-[0_30px_30px_rgba(50,70,10,0.35)]" />
          </div>
          <div className="absolute bottom-[8%] right-[2%] h-[64%] w-[32%] [rotate:7deg]">
            <Image src="/images/cutouts/brown-sugar-boba-sundae--matcha.webp" alt="CHAJOY matcha Brown Sugar Boba Sundae" fill quality={90} sizes="220px" className="object-contain drop-shadow-[0_24px_24px_rgba(50,70,10,0.3)]" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ gallery

const GALLERY = [
  { src: "/images/social/lounge.webp", alt: "CHAJOY lounge with a green sofa", cls: "row-span-2" },
  { src: "/images/social/drink-at-counter.webp", alt: "A CHAJOY fruit tea held up at the counter", cls: "" },
  { src: "/images/social/blueberry-and-lemon.webp", alt: "CHAJOY Blueberry Milkshake and Lemon Black Tea", cls: "" },
  { src: "/images/social/penguin-mascot.webp", alt: "The giant CHAJOY penguin out in Dhaka", cls: "row-span-2" },
  { src: "/images/social/storefront-corner.webp", alt: "CHAJOY corner storefront in Mohammadpur", cls: "" },
  { src: "/images/social/seating.webp", alt: "CHAJOY seating with green chairs and a checked floor", cls: "" },
];

/** Photo grid of CHAJOY stores and drinks, with social links. */
export function Gallery({ instagram, facebook }: { instagram: string; facebook: string }) {
  return (
    <section className="bg-cream-200 py-24 text-ink sm:py-32" aria-labelledby="life-title">
      <div className={wrap}>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>Share cha · share joy</Eyebrow>
            <h2 id="life-title" className="font-display text-[44px] leading-[1] tracking-[-0.02em] sm:text-[60px]">
              Life at <em className="text-matcha-600">CHAJOY</em>
            </h2>
          </div>
          <div className="flex gap-3">
            <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-5 py-3 text-sm font-medium hover:border-ink/40">
              <InstagramIcon className="size-4" /> Instagram
            </a>
            <a href={facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-5 py-3 text-sm font-medium hover:border-ink/40">
              <FacebookIcon className="size-4" /> Facebook
            </a>
          </div>
        </div>
        <div className="mt-14 grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[240px] md:grid-cols-4">
          {GALLERY.map((g) => (
            <div key={g.src} className={`group relative overflow-hidden rounded-[20px] ${g.cls}`}>
              <Image src={g.src} alt={g.alt} fill sizes="(min-width:768px) 320px, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
