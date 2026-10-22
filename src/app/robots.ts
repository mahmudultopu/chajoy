/** robots.txt: allow the storefront, keep admin, API and private pages out of search. */

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Builds robots.txt. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/cart", "/orders/", "/account"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
