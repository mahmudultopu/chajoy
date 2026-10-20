/**
 * Render studio product images from the 3D models.
 *
 *   npm run dev            (in another terminal)
 *   npm run images:render  [-- slug1 slug2 ...]
 *
 * Writes public/images/renders/<slug>.webp: 1000×1000 product shots on bright
 * backdrops, transparent ingredient "bubbles", and transparent wide
 * compositions (hero, banners). They are illustrations and are labelled as
 * such on the site.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright-core";
import { BUBBLE_PRESETS, COMPOSITIONS, RENDER_PRESETS } from "../src/components/three/render-presets";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = path.resolve("public/images/renders");
const SRC = 1600; // render size; downsampled for anti-aliasing
const SIZE = 1000;

type Job = { slug: string; alpha: boolean; flavour?: "matcha" };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const jobs: Job[] = [
    ...Object.keys(RENDER_PRESETS).map((slug) => ({ slug, alpha: false })),
    ...Object.keys(RENDER_PRESETS)
      .filter((s) => s.endsWith("-sundae"))
      .map((slug) => ({ slug, alpha: false, flavour: "matcha" as const })),
    ...Object.keys(BUBBLE_PRESETS).map((slug) => ({ slug, alpha: true })),
    ...Object.keys(COMPOSITIONS).map((slug) => ({ slug, alpha: false })),
  ].filter((j) => !only.length || only.includes(j.slug));

  const browser = await chromium.launch({ executablePath: CHROME, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
  const page = await browser.newPage({ viewport: { width: SRC, height: SRC }, deviceScaleFactor: 1 });
  for (const j of jobs) {
    const name = j.flavour ? `${j.slug}--matcha` : j.slug;
    const comp = COMPOSITIONS[j.slug];
    const srcW = comp ? Math.round(comp.width * 1.2) : SRC;
    await page.setViewportSize({ width: srcW, height: srcW });
    const url = `${BASE}/render/${j.slug}?w=${srcW}${j.flavour ? `&flavour=${j.flavour}` : ""}`;
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => (window as unknown as { __renderReady?: boolean }).__renderReady === true, null, { timeout: 120000 });
    const png = await page.locator("#stage").screenshot({ omitBackground: j.alpha, type: "png" });
    const [w, h] = comp ? [comp.width, comp.height] : [SIZE, SIZE];
    await sharp(png).resize(w, h, { kernel: "lanczos3" }).webp({ quality: 88, alphaQuality: 90 }).toFile(path.join(OUT, `${name}.webp`));
    console.log("✓", name);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
