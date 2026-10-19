"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { CupSoda, Gauge, History, Megaphone, Receipt, Settings, Store, Tag, Upload } from "lucide-react";

const ICONS = { gauge: Gauge, receipt: Receipt, cup: CupSoda, store: Store, tag: Tag, megaphone: Megaphone, upload: Upload, settings: Settings, history: History } as const;

export function AdminNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0 [&::-webkit-scrollbar]:hidden" aria-label="Admin">
      {items.map((i) => {
        const Icon = ICONS[i.icon as keyof typeof ICONS] ?? Gauge;
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={clsx("flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-matcha-400 text-forest-950" : "text-cream-50/75 hover:bg-white/10 hover:text-cream-50")}
          >
            <Icon className="size-4" /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
