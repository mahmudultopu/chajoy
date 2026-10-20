import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, MapPin } from "lucide-react";
import { InstagramIcon } from "@/components/ui/BrandIcons";

/* Homepage sections, modelled section-for-section on the reference design
   (Alldae), in CHAJOY's colours and with CHAJOY's own products and facts. */

export const wrap = "mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8";

export function PillLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-8 rounded-full bg-pill py-3.5 pl-7 pr-5 text-[15px] font-semibold text-ink transition hover:bg-pill-dark ${className}`}>
      {children} <ArrowRight className="size-4" />
    </Link>
  );
}

// ------------------------------------------------------------------ hero

export function HeroBanner({ itemCount, copy }: { itemCount: number; copy: { headline: string; headlineAccent: string; subhead: string } }) {
  return (
    <section className={`${wrap} pt-4 sm:pt-5`}>
      <div className="relative flex flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(90deg,#cfe7b4,#e3eb8e_55%,#fde34f)] lg:block lg:min-h-[540px]">
        <div className="relative z-10 px-6 pb-4 pt-9 sm:px-12 sm:pt-12 lg:max-w-[560px] lg:px-14 lg:py-16">
          <h1 className="font-display text-[44px] leading-[1.02] text-ink sm:text-[60px] lg:text-[70px]">
            {copy.headline} <em className="text-[#47701f]">{copy.headlineAccent}</em>
          </h1>
          <p className="mt-6 max-w-[400px] text-[17px] leading-relaxed text-ink/80">
            {copy.subhead}
          </p>
          <PillLink href="/menu" className="mt-9">
            Sip Joy
          </PillLink>
        </div>

        <div className="relative h-[300px] sm:h-[380px] lg:absolute lg:inset-0 lg:h-auto">
          <Image src="/images/renders/hero.webp" alt="CHAJOY boba milk tea and a matcha twist cone — 3D illustration" fill priority sizes="(min-width:1024px) 1240px, 100vw" className="object-cover object-[78%_50%] lg:object-[72%_50%]" />
          <span className="absolute bottom-3 left-4 rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-semibold text-ink/70 backdrop-blur lg:left-auto lg:right-4">3D illustration</span>
        </div>

        {/* right column badges, as in the reference */}
        <div className="pointer-events-none absolute right-6 top-6 z-10 hidden flex-col items-center text-center lg:flex">
          <span className="relative block size-[78px] overflow-hidden rounded-full ring-4 ring-white/70">
            <Image src="/images/brand/cone-in-store.webp" alt="" fill sizes="78px" className="object-cover" />
          </span>
          <span className="mt-3 font-display text-[26px] leading-none text-ink" style={{ fontWeight: 600 }}>
            chajoy<span className="text-[#47701f]">.</span>
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/70">Ice cream &amp; tea</span>
        </div>
        <div className="absolute bottom-10 right-10 z-10 hidden text-right lg:block">
          <p className="font-display text-[64px] leading-none text-ink">{itemCount}</p>
          <p className="mt-2 text-sm leading-snug text-ink/80">
            drinks &amp; desserts
            <br />
            on our menu
          </p>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ ingredient bubbles ("Huge Benefits")

const BUBBLES = [
  { img: "/images/renders/bubble-boba.webp", label: "Brown sugar boba", bg: "#fde0e6", lift: 32 },
  { img: "/images/renders/bubble-ice.webp", label: "Less or normal ice", bg: "#dbe5ff", lift: 8 },
  { img: "/images/renders/bubble-matcha.webp", label: "Original or matcha", bg: "#e3f0c8", lift: 0 },
  { img: "/images/renders/bubble-citrus.webp", label: "Fruit teas", bg: "#ffe2d1", lift: 8 },
  { img: "/images/renders/bubble-sugar.webp", label: "50–100% sugar", bg: "#e6f1d2", lift: 32 },
];

export function MadeYourWay() {
  return (
    <section className={`${wrap} py-20 sm:py-28`} aria-labelledby="way-title">
      <h2 id="way-title" className="mx-auto max-w-3xl text-center font-display text-[40px] leading-[1.05] text-ink sm:text-[56px]">
        Made your way{" "}
        <span className="relative inline-block size-[0.9em] translate-y-[0.1em] overflow-hidden rounded-full align-baseline">
          <Image src="/images/brand/chajoy-logo.webp" alt="" fill sizes="56px" />
        </span>{" "}
        inside
        <br />
        every cup of <em className="text-[#e0572e]">chajoy</em>
      </h2>
      <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {BUBBLES.map((b) => (
          <li key={b.label} className="flex flex-col items-center text-center lg:[margin-top:var(--lift)]" style={{ ["--lift" as string]: `${b.lift}px` }}>
            <span className="relative block size-[136px] rounded-full sm:size-[152px]" style={{ background: b.bg }}>
              <Image src={b.img} alt="" fill sizes="190px" className="scale-[1.25] object-contain" />
            </span>
            <span className="mt-4 font-display text-[22px] text-ink">{b.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-center text-xs text-ink/45">3D illustrations of the choices on CHAJOY&apos;s menu board.</p>
    </section>
  );
}

// ------------------------------------------------------------------ "Drink real fruit every time"

export function JustRight() {
  const points = ["Choose 50%, 75% or 100% sugar", "Less or normal ice — or order milk teas hot", "Add brown pearl, pudding, coconut jelly, crystal ball or crushed cone (৳30 each)"];
  return (
    <section className={`${wrap} grid items-center gap-10 pb-20 sm:pb-28 lg:grid-cols-2 lg:gap-20`} aria-labelledby="right-title">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#9fd8cf]">
        <Image src="/images/brand/three-cups.webp" alt="Three CHAJOY desserts on the counter of a CHAJOY store" fill sizes="(min-width:1024px) 600px, 100vw" className="object-cover object-[50%_60%]" />
      </div>
      <div>
        <h2 id="right-title" className="font-display text-[40px] leading-[1.05] text-ink sm:text-[52px]">
          Make it <em className="text-[#47701f]">just right</em>
          <br />
          every time
        </h2>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink/75">Every CHAJOY drink is made to order, the way you like it — straight from our menu board.</p>
        <ul className="mt-7 space-y-4">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px] text-ink/85">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-pill">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ "Indulge in the fresh taste of fruits"

export function MatchaBanner({ fromPrice }: { fromPrice: string }) {
  return (
    <section className={`${wrap} pb-20 sm:pb-28`} aria-labelledby="indulge-title">
      <div className="relative mt-10 flex flex-col overflow-visible rounded-[24px] bg-[linear-gradient(90deg,#fde2c6,#f7bfcd)] lg:block lg:min-h-[420px]">
        <div className="absolute -top-10 right-8 z-20 hidden size-[118px] overflow-hidden rounded-2xl shadow-lift ring-4 ring-white sm:block lg:right-16">
          <Image src="/images/brand/matcha-new-product.webp" alt="CHAJOY matcha range poster" fill sizes="118px" className="object-cover object-[50%_40%]" />
        </div>
        <div className="relative h-[280px] overflow-hidden rounded-b-[24px] sm:h-[340px] lg:absolute lg:inset-0 lg:h-auto lg:rounded-[24px]">
          <Image src="/images/renders/banner-matcha.webp" alt="CHAJOY matcha Oreo shake and matcha strawberry sundae — 3D illustration" fill sizes="(min-width:1024px) 1240px, 100vw" className="object-cover object-[70%_50%]" />
        </div>
        <div className="relative z-10 order-first px-6 pb-2 pt-9 sm:px-12 lg:max-w-[540px] lg:py-16 lg:pl-14">
          <h2 id="indulge-title" className="font-display text-[38px] leading-[1.05] text-ink sm:text-[48px]">
            Indulge in <em>the creamy</em>
            <br />
            <em>taste</em> of <em className="text-[#47701f]">matcha</em>
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink/80">Matcha soft serve, matcha sundaes and the Matcha Oreo Shake — our matcha range starts at {fromPrice}.</p>
          <Link href="/menu?q=matcha" className="mt-7 inline-flex items-center gap-6 rounded-full bg-pill py-2.5 pl-5 pr-4 text-sm font-semibold text-ink hover:bg-pill-dark">
            Shop Now <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="absolute bottom-10 right-12 z-10 hidden text-right lg:block">
          <p className="font-display text-[56px] leading-none text-ink">5</p>
          <p className="mt-1 text-xs leading-snug text-ink/75">
            toppings to add
            <br />
            to any milk or fruit tea
          </p>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ "Sippin' on social"

const SOCIAL = [
  { src: "/images/stores/badda.webp", caption: "CHAJOY Badda", alt: "CHAJOY Badda storefront with a green balloon arch" },
  { src: "/images/brand/three-cups.webp", caption: "On the counter", alt: "Three CHAJOY desserts" },
  { src: "/images/brand/cone-in-store.webp", caption: "Cone o'clock", alt: "A CHAJOY ice cream cone held up in store" },
  { src: "/images/stores/bonasree.webp", caption: "CHAJOY Bonasree", alt: "CHAJOY Bonasree shopfront" },
  { src: "/images/brand/store-interior.webp", caption: "Take a seat", alt: "CHAJOY seating area" },
  { src: "/images/stores/rampura.webp", caption: "CHAJOY Rampura", alt: "CHAJOY Rampura shopfront" },
  { src: "/images/brand/matcha-new-product.webp", caption: "New: matcha", alt: "CHAJOY matcha range poster" },
];

export function SocialStrip({ instagram }: { instagram: string }) {
  return (
    <section className="pb-20 sm:pb-28" aria-labelledby="social-title">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-5`}>
        <h2 id="social-title" className="font-display text-[38px] leading-none text-ink sm:text-[46px]">
          <em>Sippin&apos;</em> on social
        </h2>
        <p className="hidden max-w-[210px] border-l border-black/15 pl-4 text-xs leading-relaxed text-ink/70 md:block">Raise your cup and share the joy with CHAJOY.</p>
        <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-display text-xl text-ink hover:underline" style={{ fontWeight: 600 }}>
          <InstagramIcon className="size-6" /> chajoy_bangladesh
        </a>
      </div>
      <div className="mt-9 flex gap-3 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-[max(2rem,calc((100vw-1240px)/2+2rem))] [&::-webkit-scrollbar]:hidden">
        {SOCIAL.map((s) => (
          <a key={s.src} href={instagram} target="_blank" rel="noopener noreferrer" className="group w-[200px] shrink-0 sm:w-[220px]">
            <span className="relative block aspect-[4/5] overflow-hidden rounded-xl">
              <Image src={s.src} alt={s.alt} fill sizes="220px" className="object-cover transition duration-700 group-hover:scale-105" />
            </span>
            <span className="mt-2 flex items-center gap-1.5 text-xs text-ink/70">
              <InstagramIcon className="size-3.5" /> {s.caption}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ "Our customers love us" -> real branches

export type VisitBranch = { slug: string; name: string; address: string; photo: string | null; status: string };

export function VisitUs({ branches }: { branches: VisitBranch[] }) {
  return (
    <section className={`${wrap} pb-20 sm:pb-28`} aria-labelledby="visit-title">
      <div className="rounded-[26px] bg-[linear-gradient(180deg,#fde6ee,#fbd5e2)] px-5 py-12 sm:px-10 sm:py-14">
        <div className="mx-auto mb-2 relative size-9 overflow-hidden rounded-full">
          <Image src="/images/brand/chajoy-logo.webp" alt="" fill sizes="36px" />
        </div>
        <h2 id="visit-title" className="text-center font-display text-[38px] leading-none text-ink sm:text-[46px]">
          Come <em className="text-[#d6336c]">visit</em> us
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {branches.map((b) => (
            <Link key={b.slug} href={`/branches/${b.slug}`} className="group flex flex-col rounded-2xl bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <p className="text-[17px] font-semibold text-ink">{b.name}</p>
              <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-ink/70">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink/45" /> {b.address}
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink/70">
                <Clock className="mt-0.5 size-4 shrink-0 text-ink/45" /> {b.status}
              </p>
              <div className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
                <span className="relative size-10 overflow-hidden rounded-full bg-cream-100">{b.photo && <Image src={b.photo} alt="" fill sizes="40px" className="object-cover" />}</span>
                <span className="text-sm font-medium text-ink">Menu &amp; directions</span>
                <ArrowRight className="ml-auto size-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/branches" className="text-sm font-semibold text-ink underline underline-offset-4">
            See all branches
          </Link>
        </div>
      </div>
    </section>
  );
}
