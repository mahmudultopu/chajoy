// Dev helper: screenshot the viewport after scrolling an element into view.
// node scripts/shot-section.mjs <url> <out.png> <css-selector> [width] [height] [waitMs]
import { chromium } from "playwright-core";
const [url, out, sel, w = "1440", h = "900", wait = "4000"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 300)));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
if (sel !== "-") await page.locator(sel).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(errors.length ? errors.slice(0, 10).join("\n") : "no console errors");
await browser.close();
