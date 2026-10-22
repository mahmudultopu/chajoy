import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, MapPin } from "lucide-react";
import { InstagramIcon } from "@/components/ui/BrandIcons";

/* Homepage sections, modelled section-for-section on the reference design
   (Alldae), in its colours, with CHAJOY's own products, photos and facts.
   Product pictures are the official CHAJOY menu photos with the menu-board
   background removed (public/images/cutouts). */

export const wrap = "mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8";

export function PillLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-8 rounded-full bg-pill py-3.5 pl-7 pr-5 text-[15px] font-semibold text-ink transition hover:bg-pill-dark ${className}`}>
      {children} <ArrowRight className="size-4" />
    </Link>
  );
}

type Shot = { src: string; alt: string; h: string; x: string; z?: number; rotate?: number };

/** Official product cut-outs arranged like a product splash, each with a soft floor shadow. */
function PhotoStack({ shots, className = "" }: { shots: Shot[]; className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      {shots.map((s) => (
        <div key={s.src} className="absolute bottom-[7%] -translate-x-1/2" style={{ left: s.x, height: s.h, aspectRatio: "0.62", zIndex: s.z ?? 1, rotate: s.rotate ? `${s.rotate}deg` : undefined }}>
          <span aria-hidden className="absolute -bottom-[2%] left-1/2 h-[7%] w-[80%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-md" />
          <Image src={s.src} alt={s.alt} fill priority sizes="(min-width:1024px) 300px, 40vw" className="object-contain object-bottom drop-shadow-[0_18px_22px_rgba(60,50,0,0.22)]" />
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ hero

export function HeroBanner({ itemCount, copy }: { itemCount: number; copy: { headline: string; headlineAccent: string; subhead: string } }) {
  const shots: Shot[] = [
    { src: "/images/cutouts/hq/chocolate-oreo-crumb-sundae--original.webp", alt: "CHAJOY Chocolate Oreo Crumb Sundae", h: "74%", x: "21%", rotate: -7 },
    { src: "/images/cutouts/hq/boba-milk-tea.webp", alt: "CHAJOY Boba Milk Tea", h: "82%", x: "50%", z: 3, rotate: 4 },
    { src: "/images/cutouts/hq/strawberry-sundae--matcha.webp", alt: "CHAJOY matcha Strawberry Sundae", h: "72%", x: "80%", rotate: 8 },
  ];
  return (
    <section className={`${wrap} pt-4 sm:pt-5`}>
      <div className="relative flex flex-col overflow-hidden rounded-[22px] bg-[linear-gradient(90deg,#c9e7ba_0%,#d9e187_45%,#fee400_100%)] lg:block lg:min-h-[540px]">
        <div aria-hidden className="absolute right-[24%] top-[18%] hidden size-[440px] rounded-full bg-white/35 blur-3xl lg:block" />
        <div className="relative z-10 px-6 pb-2 pt-9 sm:px-12 sm:pt-12 lg:max-w-[540px] lg:px-14 lg:py-[72px]">
          <h1 className="font-display text-[44px] leading-[1.02] text-ink sm:text-[60px] lg:text-[68px]">
            {copy.headline} <em className="text-[#47701f]">{copy.headlineAccent}</em>
          </h1>
          <p className="mt-6 max-w-[400px] text-[16px] leading-relaxed text-ink/80">{copy.subhead}</p>
          <PillLink href="/menu" className="mt-9">
            Sip Joy
          </PillLink>
        </div>

        <PhotoStack shots={shots} className="relative h-[340px] sm:h-[420px] lg:absolute lg:inset-y-0 lg:left-[38%] lg:right-[14%] lg:h-auto" />
        <div className="pointer-events-none absolute bottom-[4%] left-[2%] z-20 h-[24%] w-[22%] sm:left-[6%] lg:bottom-[5%] lg:left-[29%] lg:h-[28%] lg:w-[11%]">
          <Image src="/images/cutouts/hq/penguin.webp" alt="CHAJOY penguin mascot" fill sizes="160px" className="object-contain drop-shadow-[0_12px_14px_rgba(0,0,0,0.2)]" />
        </div>

        <div className="pointer-events-none absolute right-8 top-10 z-10 hidden flex-col items-center text-center lg:flex">
          <span className="relative block size-[74px] overflow-hidden rounded-full ring-4 ring-white/70">
            <Image src="/images/brand/cone-in-store.webp" alt="" fill sizes="74px" className="object-cover" />
          </span>
          <span className="mt-3 font-display text-[26px] leading-none text-ink" style={{ fontWeight: 600 }}>
            chajoy<span className="text-[#47701f]">.</span>
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-ink/70">Ice cream &amp; tea</span>
        </div>
        <div className="absolute bottom-12 right-10 z-10 hidden text-center lg:block">
          <p className="font-display text-[60px] leading-none text-ink">{itemCount}</p>
          <p className="mt-2 text-[13px] leading-snug text-ink/80">
            drinks &amp; desserts
            <br />
            on our menu
          </p>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ "Huge Benefits inside" -> toppings

const TOPPINGS = [
  { slug: "topping-brown-pearl", label: "Brown Pearl", bg: "#fde0e6", size: 112, drop: 46 },
  { slug: "topping-coconut-jelly", label: "Coconut Jelly", bg: "#dbe5fb", size: 132, drop: 14 },
  { slug: "topping-crispy-crushed-cone", label: "Crushed Cone", bg: "#e3f0c8", size: 150, drop: 0 },
  { slug: "topping-pudding", label: "Pudding", bg: "#fde3cf", size: 132, drop: 14 },
  { slug: "topping-crystal-ball", label: "Crystal Ball", bg: "#e6f1d2", size: 112, drop: 46 },
];

export function ToppingsWave({ price }: { price: string }) {
  return (
    <section className={`${wrap} py-20 sm:py-28`} aria-labelledby="toppings-title">
      <h2 id="toppings-title" className="mx-auto max-w-3xl text-center font-display text-[40px] leading-[1.05] text-ink sm:text-[54px]">
        Tasty toppings{" "}
        <span className="relative inline-block size-[0.85em] translate-y-[0.08em] overflow-hidden rounded-full align-baseline">
          <Image src="/images/brand/chajoy-logo.webp" alt="" fill sizes="56px" />
        </span>{" "}
        inside
        <br />
        every cup of <em className="text-[#f26b1d]">chajoy</em>
      </h2>
      <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {TOPPINGS.map((t) => (
          <li key={t.slug} className="flex flex-col items-center text-center lg:[margin-top:var(--drop)]" style={{ ["--drop" as string]: `${t.drop}px` }}>
            <span className="relative grid place-items-center rounded-full" style={{ background: t.bg, width: t.size, height: t.size }}>
              <span className="relative block size-[78%]">
                <Image src={`/images/cutouts/${t.slug}.webp`} alt={`${t.label} topping`} fill sizes="150px" className="object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.15)]" />
              </span>
            </span>
            <span className="mt-4 font-display text-[22px] leading-tight text-ink">{t.label}</span>
            <span className="mt-1 text-xs text-ink/55">+{price}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ "Drink real fruit every time"

export function JustRight() {
  const points = ["Choose 50%, 75% or 100% sugar", "Less or normal ice — or order milk teas hot", "Add brown pearl, pudding, coconut jelly, crystal ball or crushed cone"];
  return (
    <section className={`${wrap} grid items-center gap-10 pb-20 sm:pb-28 lg:grid-cols-[1.05fr_1fr] lg:gap-20`} aria-labelledby="right-title">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[#b1eae6]">
        <Image src="/images/social/boba-on-table.webp" alt="A CHAJOY Boba Milk Tea on a café table, being photographed on a phone" fill sizes="(min-width:1024px) 640px, 100vw" className="object-cover" />
      </div>
      <div>
        <h2 id="right-title" className="font-display text-[40px] leading-[1.05] text-ink sm:text-[50px]">
          Your next <em>boba</em>
          <br />
          obsession, made just right
        </h2>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/75">Every CHAJOY drink is made to order, the way you like it — straight from our menu board.</p>
        <ul className="mt-7 space-y-4">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[14px] text-ink/85">
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
  const shots: Shot[] = [
    { src: "/images/cutouts/brown-sugar-boba-sundae--matcha.webp", alt: "CHAJOY matcha Brown Sugar Boba Sundae", h: "66%", x: "24%", rotate: -5 },
    { src: "/images/cutouts/hq/strawberry-sundae--matcha.webp", alt: "CHAJOY matcha Strawberry Sundae", h: "84%", x: "50%", z: 3, rotate: 4 },
    { src: "/images/cutouts/matcha-oreo-shake-milkshake.webp", alt: "CHAJOY Matcha Oreo Shake", h: "66%", x: "77%", rotate: 6 },
  ];
  return (
    <section className={`${wrap} pb-20 sm:pb-28`} aria-labelledby="indulge-title">
      <div className="relative mt-12 flex flex-col rounded-[18px] bg-[linear-gradient(90deg,#fbdcb4_0%,#fccfc0_50%,#ffc2c9_100%)] lg:block lg:min-h-[400px]">
        <div className="absolute -top-12 right-8 z-20 hidden size-[112px] overflow-hidden rounded-2xl bg-white p-1.5 shadow-lift sm:block lg:right-14">
          <span className="relative block size-full overflow-hidden rounded-xl">
            <Image src="/images/brand/matcha-new-product.webp" alt="CHAJOY matcha new product poster" fill sizes="112px" className="object-cover object-[50%_40%]" />
          </span>
        </div>
        <div className="relative z-10 px-6 pb-2 pt-10 sm:px-12 lg:max-w-[440px] lg:py-[72px] lg:pl-12">
          <h2 id="indulge-title" className="font-display text-[38px] leading-[1.05] text-ink sm:text-[46px]">
            Indulge in <em>the creamy</em>
            <br />
            <em>taste</em> of matcha
          </h2>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink/80">
            Our matcha range is made to <strong className="font-semibold">refresh</strong> your day and <strong className="font-semibold">satisfy</strong> your cravings — from {fromPrice}.
          </p>
          <Link href="/menu?q=matcha" className="mt-7 inline-flex items-center gap-6 rounded-full bg-pill py-2.5 pl-5 pr-4 text-sm font-semibold text-ink hover:bg-pill-dark">
            Shop Now <ArrowRight className="size-4" />
          </Link>
        </div>
        <PhotoStack shots={shots} className="relative h-[300px] sm:h-[360px] lg:absolute lg:inset-y-0 lg:left-[36%] lg:right-[18%] lg:h-auto" />
        <div className="absolute bottom-12 right-12 z-10 hidden text-center lg:block">
          <p className="font-display text-[54px] leading-none text-ink">5</p>
          <p className="mt-2 text-[12px] leading-snug text-ink/75">
            toppings to add
            <br />
            to any drink
          </p>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ "Sippin' on social"

const SOCIAL = [
  { src: "/images/social/drink-at-counter.webp", caption: "Fresh off the counter", alt: "A CHAJOY fruit tea held up at the counter" },
  { src: "/images/social/blueberry-and-lemon.webp", caption: "Sip the good vibes", alt: "CHAJOY Blueberry Milkshake and Lemon Black Tea" },
  { src: "/images/social/storefront-corner.webp", caption: "CHAJOY Mohammadpur", alt: "CHAJOY corner storefront in Mohammadpur" },
  { src: "/images/social/seating.webp", caption: "Grab a seat", alt: "CHAJOY seating with green chairs and a checked floor" },
  { src: "/images/social/lounge.webp", caption: "Sip, smile, repeat", alt: "CHAJOY lounge with a green sofa" },
  { src: "/images/social/storefront-stairs.webp", caption: "Share cha, share joy", alt: "CHAJOY storefront with the penguin sign" },
  { src: "/images/social/interior-logo.webp", caption: "Hello from the penguin", alt: "CHAJOY interior with the penguin logo" },
  { src: "/images/social/takeaway-bag.webp", caption: "To go", alt: "A CHAJOY takeaway bag on the counter" },
];

export function SocialStrip({ instagram }: { instagram: string }) {
  return (
    <section className="pb-20 sm:pb-28" aria-labelledby="social-title">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-5`}>
        <h2 id="social-title" className="font-display text-[36px] leading-none text-ink sm:text-[42px]">
          <em>Sippin&apos;</em> on social
        </h2>
        <p className="hidden max-w-[210px] text-xs leading-relaxed text-ink/70 md:block">Raise your cup and share the joy with CHAJOY.</p>
        <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-display text-xl text-ink hover:underline" style={{ fontWeight: 600 }}>
          <InstagramIcon className="size-6" /> chajoy_bangladesh
        </a>
      </div>
      <div className="mt-9 flex gap-3 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-[max(2rem,calc((100vw-1240px)/2+2rem))] [&::-webkit-scrollbar]:hidden">
        {SOCIAL.map((s) => (
          <a key={s.src} href={instagram} target="_blank" rel="noopener noreferrer" className="group w-[180px] shrink-0 sm:w-[200px]">
            <span className="relative block aspect-[3/4] overflow-hidden rounded-[10px]">
              <Image src={s.src} alt={s.alt} fill sizes="200px" className="object-cover transition duration-700 group-hover:scale-105" />
            </span>
            <span className="mt-2 flex items-center gap-1.5 text-[11px] text-ink/70">
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
      <div className="rounded-[22px] bg-[linear-gradient(180deg,#ffe9f1_0%,#ffd6e6_100%)] px-5 py-12 sm:px-10 sm:py-14">
        <div className="relative mx-auto mb-3 size-9 overflow-hidden rounded-full">
          <Image src="/images/brand/chajoy-logo.webp" alt="" fill sizes="36px" />
        </div>
        <h2 id="visit-title" className="text-center font-display text-[36px] leading-none text-ink sm:text-[42px]">
          Come <em className="text-[#c2397a]">visit</em> us
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {branches.map((b) => (
            <Link key={b.slug} href={`/branches/${b.slug}`} className="group flex flex-col rounded-[14px] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <p className="text-[16px] font-semibold text-ink">{b.name}</p>
              <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed text-ink/70">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink/45" /> {b.address}
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-ink/70">
                <Clock className="mt-0.5 size-4 shrink-0 text-ink/45" /> {b.status}
              </p>
              <div className="mt-5 flex items-center gap-3 rounded-[10px] bg-[#fff5f8] p-2.5">
                <span className="relative size-9 overflow-hidden rounded-full bg-cream-100">{b.photo && <Image src={b.photo} alt="" fill sizes="36px" className="object-cover" />}</span>
                <span className="text-[13px] font-medium text-ink">Menu &amp; directions</span>
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
