/**
 * Captures the README screenshots from a running site.
 * Usage: node scripts/screenshots-readme.mjs [baseUrl]  (default: the live site)
 * Requires Google Chrome; writes WebP files to docs/screenshots/.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";

const base = process.argv[2] ?? "https://chajoy-bd.vercel.app";
const shots = [
  { name: "home", path: "/", w: 1440, h: 900 },
  { name: "menu", path: "/menu", w: 1440, h: 900 },
  { name: "product", path: "/products/boba-milk-tea", w: 1440, h: 900 },
  { name: "branches", path: "/branches", w: 1440, h: 900 },
  { name: "mobile", path: "/", w: 390, h: 844 },
];

// Uses the installed Google Chrome; set CHROME_PATH to override.
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.w < 500 ? 2 : 1 });
  await page.goto(base + s.path, { waitUntil: "load", timeout: 120_000 });
  // Hide the testing banner so screenshots show the real design.
  await page.addStyleTag({ content: '[class*="repeating-linear-gradient"]{display:none!important}' });
  await page.waitForTimeout(3000);
  const png = await page.screenshot();
  await sharp(png).webp({ quality: 82 }).toFile(`docs/screenshots/${s.name}.webp`);
  await page.close();
  console.log("saved", s.name);
}
await browser.close();
