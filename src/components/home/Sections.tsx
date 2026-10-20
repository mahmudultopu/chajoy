import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { formatBDT } from "@/lib/money";
import { tint } from "@/lib/color";
import { FacebookIcon, InstagramIcon } from "@/components/ui/BrandIcons";

/** Slogans as printed on CHAJOY's menu board and shop signage. */
const SLOGANS = ["Scoop joy, sip cha", "Share Cha. Share Joy", "CHAJOY一下", "Natural fruit flavour", "Your happy hour, every hour", "চা জয়", "Follow my cone to joy"];

export function Marquee() {
  const row = [...SLOGANS, ...SLOGANS];
  return (
    <div className="relative z-10 -mt-px overflow-hidden border-y border-forest-900/10 bg-matcha-400 py-4 text-forest-950" aria-label="CHAJOY slogans">
      <div className="flex w-max animate-marquee items-center gap-10 motion-reduce:animate-none" style={{ ["--marquee-duration" as string]: "48s" }}>
        {row.map((s, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-3xl italic sm:text-4xl" aria-hidden={i >= SLOGANS.length}>
            {s}
            <svg viewBox="0 0 24 24" className="size-6 shrink-0 fill-forest-900" aria-hidden>
              <path d="M12 0l2.4 8.2L22 6l-5.6 6L22 18l-7.6-2.2L12 24l-2.4-8.2L2 18l5.6-6L2 6l7.6 2.2z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, accent, children, align = "left" }: { eyebrow?: string; title: string; accent?: string; children?: React.ReactNode; align?: "left" | "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="font-display text-4xl leading-[1.02] tracking-tight text-forest-900 sm:text-5xl lg:text-6xl">
        {title} {accent && <em className="font-medium text-matcha-600">{accent}</em>}
      </h2>
      {children && <div className="mt-4 text-base leading-relaxed text-forest-900/70 sm:text-lg">{children}</div>}
    </div>
  );
}

export type CategoryTile = { slug: string; name: string; menuName: string | null; accent: string | null; image: string | null; count: number; fromPaisa: number };

export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  const spans = ["lg:col-span-2 lg:row-span-2", "", "", "", ""];
  return (
    <section className="container-x py-20 sm:py-28" aria-labelledby="cat-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div id="cat-title">
          <SectionHeading eyebrow="Explore by category" title="Pick your" accent="kind of joy." />
        </div>
        <Link href="/menu" className="btn-ghost">
          Full menu <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-10 grid auto-rows-[220px] grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[250px] lg:grid-cols-4">
        {tiles.map((t, i) => (
          <Link
            key={t.slug}
            href={`/menu/${t.slug}`}
            className={`group relative isolate col-span-2 overflow-hidden rounded-4xl p-5 ring-1 ring-forest-900/5 transition hover:-translate-y-1 hover:shadow-lift sm:col-span-1 sm:p-6 ${spans[i] ?? ""}`}
            style={{ background: tint(t.accent, 26) }}
          >
            {t.image && (
              <Image
                src={t.image}
                alt=""
                fill
                sizes="(min-width:1024px) 40vw, 90vw"
                className={`menu-photo -z-10 object-contain transition duration-700 group-hover:scale-110 group-hover:rotate-[-3deg] ${i === 0 ? "object-right-bottom p-6 pl-[35%]" : "object-right p-4 pl-[45%]"}`}
              />
            )}
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-forest-900/55">{t.menuName}</p>
                <h3 className={`mt-1 font-display leading-none text-forest-900 ${i === 0 ? "text-4xl sm:text-5xl" : "text-3xl"}`}>{t.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-forest-900">
                  {t.count} item{t.count === 1 ? "" : "s"} · from {formatBDT(t.fromPaisa)}
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-forest-900 text-cream-50 transition group-hover:bg-matcha-600">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StorySection({ title, paragraphs, branchCount }: { title: string; paragraphs: string[]; branchCount: number }) {
  return (
    <section className="relative overflow-hidden bg-cream-200/60 py-20 sm:py-28" aria-labelledby="story-title">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div className="relative grid grid-cols-5 gap-3">
          <div className="relative col-span-3 aspect-[3/4] overflow-hidden rounded-4xl shadow-lift">
            <Image src="/images/brand/store-interior.webp" alt="Inside a CHAJOY store: green chairs, checkerboard floor and a penguin mural" fill sizes="(min-width:1024px) 30vw, 60vw" className="object-cover" />
          </div>
          <div className="col-span-2 flex flex-col gap-3 pt-14">
            <div className="relative aspect-square overflow-hidden rounded-4xl shadow-soft">
              <Image src="/images/brand/cone-in-store.webp" alt="A CHAJOY ice cream cone held up in store" fill sizes="20vw" className="object-cover" />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-4xl shadow-soft">
              <Image src="/images/brand/prep-counter.webp" alt="CHAJOY cones being prepared at the counter" fill sizes="20vw" className="object-cover" />
            </div>
          </div>
          <div className="absolute -bottom-5 left-6 rounded-3xl bg-forest-900 px-5 py-4 text-cream-50 shadow-lift">
            <p className="font-display text-4xl">{branchCount}</p>
            <p className="text-xs text-cream-50/70">branches across Dhaka</p>
          </div>
        </div>
        <div id="story-title">
          <SectionHeading eyebrow="Our story" title={title.split(" at ")[0]} accent={title.includes(" at ") ? `at ${title.split(" at ")[1]}` : undefined} />
          <div className="mt-6 space-y-4 text-base leading-relaxed text-forest-900/75 sm:text-lg">
            {paragraphs.slice(0, 2).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Link href="/about" className="btn-primary mt-8">
            Read our story <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SocialSection({ instagram, facebook }: { instagram: string; facebook: string }) {
  const tiles = [
    { src: "/images/stores/badda.webp", alt: "CHAJOY Badda storefront with a green balloon arch" },
    { src: "/images/brand/matcha-new-product.webp", alt: "CHAJOY matcha range poster: matcha ice cream, strawberry sundae and brown sugar boba sundae" },
    { src: "/images/brand/three-cups.webp", alt: "Three CHAJOY desserts on a counter" },
    { src: "/images/stores/bonasree.webp", alt: "CHAJOY Bonasree shopfront" },
    { src: "/images/stores/rampura.webp", alt: "CHAJOY Rampura shopfront" },
  ];
  return (
    <section className="py-20 sm:py-28" aria-labelledby="social-title">
      <div className="container-x flex flex-wrap items-end justify-between gap-6">
        <div id="social-title">
          <SectionHeading eyebrow="@chajoy_bangladesh" title="Sippin’ on" accent="social." />
        </div>
        <div className="flex gap-2">
          <a href={instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <InstagramIcon className="size-4" /> Instagram
          </a>
          <a href={facebook} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <FacebookIcon className="size-4" /> Facebook
          </a>
        </div>
      </div>
      <div className="mt-10 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:px-6 lg:justify-center lg:px-8 [&::-webkit-scrollbar]:hidden">
        {tiles.map((t, i) => (
          <a
            key={t.src}
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative aspect-[4/5] w-[62vw] shrink-0 snap-center overflow-hidden rounded-4xl ring-1 ring-forest-900/5 transition hover:-translate-y-1 sm:w-[260px] ${i % 2 ? "lg:mt-10" : ""}`}
          >
            <Image src={t.src} alt={t.alt} fill sizes="260px" className="object-cover transition duration-700 hover:scale-105" />
          </a>
        ))}
      </div>
      <p className="container-x mt-2 text-xs text-forest-900/50">Photos from CHAJOY&apos;s own website and stores.</p>
    </section>
  );
}
