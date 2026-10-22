/** 404 page inside the storefront. */

import Link from "next/link";

/** Not-found message with links back to the menu. */
export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <p className="font-display text-[9rem] leading-none text-matcha-300">404</p>
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
    </div>
  );
}
