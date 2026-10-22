/** Error boundary for storefront pages. */

"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Friendly error message with a retry button. */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <h1 className="font-display text-4xl text-forest-900">Something spilled</h1>
      <p className="mt-3 max-w-md text-forest-900/65">We couldn&apos;t load this page. Please try again — if it keeps happening, contact us.</p>
      {error.digest && <p className="mt-2 text-xs text-forest-900/45">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
