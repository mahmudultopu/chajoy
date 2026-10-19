import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={clsx("group inline-flex items-center gap-2.5", className)} aria-label="CHAJOY BD home">
      <Image
        src="/images/brand/chajoy-logo.webp"
        alt=""
        width={44}
        height={44}
        priority
        className="size-11 rounded-full transition-transform duration-500 group-hover:rotate-[-8deg]"
      />
      <span className={clsx("hidden font-display text-[1.35rem] font-bold leading-none tracking-tight sm:block", light ? "text-cream-50" : "text-forest-900")}>
        CHAJOY<span className="ml-1 align-top text-[0.6rem] font-sans font-bold tracking-[0.2em] text-matcha-600">BD</span>
      </span>
    </Link>
  );
}
