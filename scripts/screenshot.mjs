// Dev helper: node scripts/screenshot.mjs <url> <out.png> [width] [height] [fullPage] [waitMs]
import { chromium } from "playwright-core";
const [url, out, w = "1440", h = "900", full = "1", wait = "3500"] = process.argv.slice(2);
const exe = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ executablePath: exe, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(+wait);
if (full === "1") {
  // scroll through so lazy sections mount
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(250); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(errors.length ? errors.slice(0, 15).join("\n") : "no console errors");
await browser.close();
