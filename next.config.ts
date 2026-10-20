import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at
  // runtime rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "sharp", "bcryptjs"],
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/images/**" }, { pathname: "/media/**" }],
    remotePatterns: [
      // admin uploads stored in Vercel Blob
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      ...(process.env.NEXT_PUBLIC_MEDIA_HOST ? [{ protocol: "https" as const, hostname: process.env.NEXT_PUBLIC_MEDIA_HOST }] : []),
    ],
  },
  poweredByHeader: false,
  experimental: {
    // admin photo uploads (≤8 MB, re-encoded on the server) and CSV imports (≤2 MB)
    serverActions: { bodySizeLimit: "9mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Geolocation is requested by the branch finder on this origin only.
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
