/**
 * Next.js configuration for the CHAJOY BD storefront and admin.
 *
 * Besides build options, this file sets the HTTP security headers that every
 * response carries (see `securityHeaders` below).
 */
import type { NextConfig } from "next";

/** True for `next dev`; development needs a looser script policy for hot reload. */
const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy: only this site may run scripts, load styles and
 * be connected to. External images are limited to the map tiles and the
 * Vercel Blob store that holds admin uploads.
 */
const contentSecurityPolicy = [
  // Everything defaults to this origin only.
  "default-src 'self'",
  // Next.js inlines small bootstrap scripts; dev also needs eval for hot reload.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind and component styles are inlined by Next.js.
  "style-src 'self' 'unsafe-inline'",
  // Product photos, OpenStreetMap tiles and admin uploads.
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.public.blob.vercel-storage.com",
  // Fonts are self-hosted by next/font.
  "font-src 'self' data:",
  // API calls go to this origin only (dev adds the hot-reload socket).
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  // three.js may create workers from blobs.
  "worker-src 'self' blob:",
  // No plugins, no <base> hijacking, no embedding of other sites.
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'none'",
  // Forms only post here or to the SSLCommerz payment gateway.
  "form-action 'self' https://*.sslcommerz.com",
  // Nobody may frame this site (clickjacking protection).
  "frame-ancestors 'none'",
  // Upgrade any stray http:// sub-resource in production.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** Headers added to every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Browsers must not guess content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Legacy clickjacking protection for browsers without frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  // Keep other sites' windows from scripting ours.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Geolocation is requested by the branch finder on this origin only.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()" },
  // Force HTTPS for two years once the site has been seen over HTTPS.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at
  // runtime rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "sharp", "bcryptjs"],
  images: {
    formats: ["image/avif", "image/webp"],
    // 90 for hero / product photography, 75 elsewhere.
    qualities: [75, 90],
    localPatterns: [{ pathname: "/images/**" }, { pathname: "/media/**" }],
    remotePatterns: [
      // Admin uploads stored in Vercel Blob.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Optional custom media host.
      ...(process.env.NEXT_PUBLIC_MEDIA_HOST ? [{ protocol: "https" as const, hostname: process.env.NEXT_PUBLIC_MEDIA_HOST }] : []),
    ],
  },
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  // Hide the floating dev-mode badge.
  devIndicators: false,
  // Don't let `next dev` write editor-assistant instruction files into the repo.
  agentRules: false,
  experimental: {
    // Admin photo uploads (≤8 MB, re-encoded on the server) and CSV imports (≤2 MB).
    serverActions: { bodySizeLimit: "9mb" },
  },
  // Apply the security headers to every route.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
