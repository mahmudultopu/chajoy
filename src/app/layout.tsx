import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
// Supplies the taka sign (৳) and Bangla text, which the Latin fonts don't contain.
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["500", "700"], variable: "--font-bengali", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "CHAJOY BD — Ice Cream & Tea", template: "%s · CHAJOY BD" },
  description: "Order CHAJOY milk tea, fruit tea, milkshakes, ice cream and sundaes in Dhaka. Find your nearest CHAJOY branch.",
  applicationName: "CHAJOY BD",
  openGraph: { type: "website", siteName: "CHAJOY BD", locale: "en_BD", images: ["/images/brand/three-cups.webp"] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#10291a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} ${bengali.variable}`}>
      <body>{children}</body>
    </html>
  );
}
