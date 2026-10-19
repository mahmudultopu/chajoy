import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/services/settings";
import { FacebookIcon, InstagramIcon } from "@/components/ui/BrandIcons";
import { LiteModeToggle, NewsletterForm } from "./FooterClient";

export function SiteFooter({
  settings,
  categories,
  branches,
}: {
  settings: SiteSettings;
  categories: { slug: string; name: string }[];
  branches: { slug: string; name: string }[];
}) {
  return (
    <footer className="relative mt-24 overflow-hidden bg-forest-950 text-cream-50">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-matcha-500/15 blur-3xl" />
      <div className="container-x relative grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/images/brand/chajoy-logo.webp" alt="CHAJOY ice cream and tea logo" width={64} height={64} className="rounded-full" />
            <div>
              <p className="font-display text-2xl font-bold">CHAJOY</p>
              <p className="text-sm text-cream-50/60">Ice cream &amp; tea · চা জয়</p>
            </div>
          </div>
          <p className="mt-6 max-w-sm font-display text-3xl font-semibold leading-tight">
            Every sip <em className="text-matcha-300">brings joy.</em>
          </p>
          <div className="mt-8 max-w-sm">
            <p className="mb-3 text-sm font-semibold">News and offers in your inbox</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-matcha-300">Menu</p>
            <ul className="space-y-2.5 text-sm text-cream-50/75">
              <li>
                <Link href="/menu" className="hover:text-cream-50">
                  Shop all
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/menu/${c.slug}`} className="hover:text-cream-50">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/offers" className="hover:text-cream-50">
                  Offers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-matcha-300">Branches</p>
            <ul className="space-y-2.5 text-sm text-cream-50/75">
              {branches.map((b) => (
                <li key={b.slug}>
                  <Link href={`/branches/${b.slug}`} className="hover:text-cream-50">
                    {b.name.replace(/^CHAJOY\s+/, "")}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/branches" className="font-semibold text-cream-50 hover:underline">
                  Find the nearest →
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-matcha-300">Help</p>
            <ul className="space-y-2.5 text-sm text-cream-50/75">
              <li>
                <Link href="/track" className="hover:text-cream-50">
                  Track an order
                </Link>
              </li>
              <li>
                <Link href="/policies/delivery" className="hover:text-cream-50">
                  Delivery policy
                </Link>
              </li>
              <li>
                <Link href="/policies/refunds" className="hover:text-cream-50">
                  Refund policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cream-50">
                  Customer support
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-cream-50">
                  Your account
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-matcha-300">Contact</p>
            <ul className="space-y-3 text-sm text-cream-50/75">
              <li>
                <a href={settings.contact.phoneHref} className="flex items-start gap-2 hover:text-cream-50">
                  <Phone className="mt-0.5 size-4 shrink-0" /> {settings.contact.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.contact.email}`} className="flex items-start gap-2 break-all hover:text-cream-50">
                  <Mail className="mt-0.5 size-4 shrink-0" /> {settings.contact.email}
                </a>
              </li>
              <li>
                <a href={settings.headOffice.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 hover:text-cream-50">
                  <MapPin className="mt-0.5 size-4 shrink-0" /> Head office on Google Maps
                </a>
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <a href={settings.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="CHAJOY on Facebook" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <FacebookIcon />
              </a>
              <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="CHAJOY on Instagram" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <InstagramIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-cream-50/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CHAJOY BD. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/policies/privacy" className="hover:text-cream-50">
              Privacy
            </Link>
            <Link href="/policies/terms" className="hover:text-cream-50">
              Terms
            </Link>
            <LiteModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
