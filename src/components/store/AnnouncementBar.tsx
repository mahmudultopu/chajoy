/** Announcement bar at the top of the storefront. */

import Link from "next/link";

type Announcement = { id: number; message: string; linkUrl: string | null; linkLabel: string | null };

/** Shows live announcements, and a notice while sample settings are in use. */
export function AnnouncementBar({ items, sampleMode }: { items: Announcement[]; sampleMode: boolean }) {
  return (
    <>
      {sampleMode && (
        <div className="bg-[repeating-linear-gradient(135deg,#f6d33c_0_14px,#fbe57e_14px_28px)] px-4 py-1.5 text-center text-xs font-semibold text-forest-950" role="note">
          Sample operating settings are on (opening hours, delivery &amp; cash payment) — for testing only, not CHAJOY&apos;s real service details.
        </div>
      )}
      {items.length > 0 && (
        <div className="overflow-hidden bg-forest-900 text-cream-50" role="region" aria-label="Announcements">
          {items.length === 1 ? (
            <p className="px-4 py-2 text-center text-sm">
              {items[0].message}{" "}
              {items[0].linkUrl && (
                <Link href={items[0].linkUrl} className="font-semibold text-matcha-300 underline underline-offset-2">
                  {items[0].linkLabel ?? "Learn more"}
                </Link>
              )}
            </p>
          ) : (
            <div className="flex w-max animate-marquee gap-12 py-2 text-sm motion-reduce:animate-none" style={{ ["--marquee-duration" as string]: `${items.length * 12}s` }}>
              {[...items, ...items].map((a, i) => (
                <span key={`${a.id}-${i}`} className="whitespace-nowrap" aria-hidden={i >= items.length}>
                  <span className="mr-3 text-matcha-300">✺</span>
                  {a.message}
                  {a.linkUrl && (
                    <Link href={a.linkUrl} className="ml-2 font-semibold text-matcha-300 underline underline-offset-2" tabIndex={i >= items.length ? -1 : 0}>
                      {a.linkLabel ?? "Learn more"}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
