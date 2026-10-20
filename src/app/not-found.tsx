import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-4 text-center">
      <Image src="/images/brand/chajoy-logo.webp" alt="CHAJOY" width={88} height={88} className="rounded-full" />
      <p className="mt-6 font-display text-[7rem] leading-none text-matcha-300">404</p>
      <h1 className="mt-2 font-display text-4xl text-forest-900">This cup is empty</h1>
      <p className="mt-3 max-w-md text-forest-900/65">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">
          Go home
        </Link>
        <Link href="/menu" className="btn-ghost">
          See the menu
        </Link>
      </div>
    </main>
  );
}
