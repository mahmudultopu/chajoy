import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/cart", "/orders/", "/account"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
