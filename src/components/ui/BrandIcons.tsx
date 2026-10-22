// Simple brand marks (lucide no longer ships brand icons).

export function InstagramIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Facebook logo icon. */
export function FacebookIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-7.3h2.46l.37-2.86H13.5V9.02c0-.83.23-1.39 1.42-1.39h1.51V5.07A20.6 20.6 0 0 0 14.23 5C12.04 5 10.55 6.33 10.55 8.78v2.06H8.08v2.86h2.47V21h2.95Z" />
    </svg>
  );
}
