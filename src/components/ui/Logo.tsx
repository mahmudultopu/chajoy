import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";

/** Penguin badge + "chajoy." wordmark (the reference's "alldae." treatment, in CHAJOY colours). */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={clsx("group inline-flex items-center gap-2", className)} aria-label="CHAJOY BD home">
      <Image src="/images/brand/chajoy-logo.webp" alt="" width={38} height={38} priority className="size-[38px] rounded-full transition-transform duration-500 group-hover:rotate-[-8deg]" />
      <span className={clsx("font-display text-[1.6rem] leading-none tracking-tight", light ? "text-pill" : "text-ink")} style={{ fontWeight: 600 }}>
        chajoy<span className="text-matcha-500">.</span>
      </span>
    </Link>
  );
}
