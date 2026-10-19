import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/services/settings";
import { FacebookIcon, InstagramIcon } from "@/components/ui/BrandIcons";

export const metadata: Metadata = { title: "Contact & support", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getSettings();
  const items = [
    { icon: Phone, label: "Call us", value: s.contact.phone, href: s.contact.phoneHref },
    { icon: Mail, label: "Email", value: s.contact.email, href: `mailto:${s.contact.email}` },
    { icon: MapPin, label: "Head office", value: "Open in Google Maps", href: s.headOffice.mapsUrl },
  ];
  return (
    <div className="container-x py-12 sm:py-16">
      <p className="eyebrow">Customer support</p>
      <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-forest-900 sm:text-6xl">We&apos;re here to help</h1>
      <p className="mt-4 max-w-xl text-forest-900/70">
        For a question about an order, have your order number ready (it starts with CJ). You can also{" "}
        <Link href="/track" className="font-semibold underline">
          track your order
        </Link>{" "}
        any time.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {items.map(({ icon: Icon, label, value, href }) => (
          <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="card block p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
            <Icon className="size-6 text-matcha-600" />
            <p className="mt-4 text-sm font-semibold text-forest-900/60">{label}</p>
            <p className="mt-1 break-words font-display text-xl font-semibold text-forest-900">{value}</p>
          </a>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <a href={s.social.facebook} target="_blank" rel="noopener noreferrer" className="btn-ghost">
          <FacebookIcon className="size-4" /> Facebook
        </a>
        <a href={s.social.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost">
          <InstagramIcon className="size-4" /> Instagram
        </a>
      </div>
    </div>
  );
}
