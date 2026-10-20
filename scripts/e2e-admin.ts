/**
 * Browser test of the back office: changes made in /admin must show up on the
 * storefront. Cleans up after itself. Same requirements as e2e-smoke.ts.
 *
 *   npm run test:e2e:admin
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = path.resolve(process.env.E2E_SHOTS ?? ".data/e2e");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "owner@chajoy.test", password: process.env.E2E_ADMIN_PASSWORD ?? "Demo-Owner-Pass-2026" };
fs.mkdirSync(SHOTS, { recursive: true });

const results: { name: string; ok: boolean }[] = [];
let active: Page | null = null;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    if (active) await active.screenshot({ path: path.join(SHOTS, `ADMIN-FAILED-${name.replace(/[^a-z0-9]+/gi, "-")}.png`), fullPage: true, caret: "initial" }).catch(() => {});
    results.push({ name, ok: false });
    console.log(`  ✗ ${name}\n      ${(e as Error).message.split("\n").slice(0, 3).join(" / ")}`);
  }
}
function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}
async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
}
const today = () => new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + 30 * 3600_000).toISOString().slice(0, 10);

/** Remove anything a previous (possibly interrupted) run left behind. */
async function cleanup(admin: Page) {
  // uploaded test image
  await visit(admin, `${BASE}/admin/products`);
  await admin.getByRole("link", { name: /Classic Milk Tea/ }).first().click();
  await admin.getByText("Upload a photo").waitFor();
  const card = admin.locator("li").filter({ has: admin.locator('input[value="E2E upload test image"]') });
  if (await card.count()) {
    await card.first().getByLabel("delete").check();
    await card.first().getByRole("button", { name: "Save" }).click();
    await card.first().waitFor({ state: "detached", timeout: 30000 });
  }
  // promotion(s)
  for (let i = 0; i < 5; i++) {
    await visit(admin, `${BASE}/admin/promotions`);
    const link = admin.getByRole("link", { name: /E2E ten percent/ });
    if (!(await link.count())) break;
    await link.first().click();
    admin.once("dialog", (d) => d.accept());
    await admin.getByRole("button", { name: "Delete promotion" }).click();
    await admin.waitForURL(`${BASE}/admin/promotions`);
  }
  // announcement(s)
  for (let i = 0; i < 5; i++) {
    await visit(admin, `${BASE}/admin/content`);
    const ann = admin.locator("form").filter({ has: admin.locator('input[value="E2E: new matcha range now at every branch"]') });
    if (!(await ann.count())) break;
    await ann.first().getByLabel("Delete").check();
    await ann.first().getByRole("button", { name: "Save" }).click();
    await ann.first().waitFor({ state: "detached", timeout: 30000 });
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const admin = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const shop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  active = admin;
  try {
    await check("sign in", async () => {
      await visit(admin, `${BASE}/admin/login`);
      await admin.getByLabel("Email").fill(ADMIN.email);
      await admin.getByLabel("Password").fill(ADMIN.password);
      await admin.getByRole("button", { name: "Sign in" }).click();
      await admin.waitForURL(`${BASE}/admin`);
      await cleanup(admin);
    });

    await check("announcement shows in the storefront bar", async () => {
      await visit(admin, `${BASE}/admin/content`);
      const form = admin.locator("form").filter({ has: admin.getByRole("button", { name: "Add announcement" }) });
      await form.getByLabel("Message").fill("E2E: new matcha range now at every branch");
      await form.getByRole("button", { name: "Add announcement" }).click();
      await admin.getByText("Announcement saved.").waitFor();
      active = shop;
      await visit(shop, BASE);
      await shop.getByText("E2E: new matcha range now at every branch").first().waitFor();
      active = admin;
    });

    await check("promotion code applies at checkout and appears on /offers", async () => {
      await visit(admin, `${BASE}/admin/promotions/new`);
      await admin.getByLabel("Title").fill("E2E ten percent");
      await admin.getByLabel("Starts (Dhaka)").fill(today());
      await admin.getByLabel("Ends (Dhaka, inclusive)").fill(tomorrow());
      await admin.getByLabel("Terms shown to customers").fill("Test promotion created by the automated admin test.");
      await admin.getByLabel("Amount").fill("10");
      await admin.getByLabel("Code (blank = automatic)").fill("E2ETEN");
      await admin.getByText("Active", { exact: true }).click();
      await admin.getByRole("button", { name: "Create promotion" }).click();
      await admin.waitForURL(/\/admin\/promotions\?saved=1/);

      active = shop;
      await visit(shop, `${BASE}/offers`);
      await shop.getByRole("heading", { name: "E2E ten percent" }).waitFor();
      // put something in the cart at Rampura and apply the code
      await visit(shop, `${BASE}/branches/rampura`);
      const btn = shop.getByRole("button", { name: /Order from this branch|ordering from here/i });
      if (await btn.isEnabled()) await btn.click();
      await shop.waitForTimeout(800);
      await visit(shop, `${BASE}/products/classic-milk-tea`);
      await shop.getByRole("button", { name: /Add to cart/ }).click();
      await shop.getByText("Added to your cart").waitFor();
      await visit(shop, `${BASE}/checkout`);
      await shop.getByLabel("Discount code").fill("e2eten");
      await shop.getByRole("button", { name: "Apply" }).click();
      await shop.getByText("Code E2ETEN applied.").waitFor();
      await shop.getByText("−৳11").first().waitFor(); // 10% of ৳110
      await shop.screenshot({ path: path.join(SHOTS, "admin-promo-at-checkout.png"), caret: "initial" });
      active = admin;
    });

    await check("uploaded product photo appears on the product page", async () => {
      await visit(admin, `${BASE}/admin/products`);
      await admin.getByRole("link", { name: /Classic Milk Tea/ }).first().click();
      await admin.getByText("Upload a photo").waitFor();
      const upload = admin.locator("form").filter({ hasText: "Upload a photo" });
      await upload.locator('input[type="file"]').setInputFiles(path.resolve("public/images/brand/three-cups.webp"));
      await upload.getByLabel("Alt text").fill("E2E upload test image");
      await upload.getByLabel("Order").fill("1");
      await upload.getByRole("button", { name: "Upload" }).click();
      await admin.getByText("Image uploaded.").waitFor({ timeout: 30000 });
      active = shop;
      await visit(shop, `${BASE}/products/classic-milk-tea`);
      // the gallery leads with the 3D illustration; open the uploaded photo
      await shop.getByRole("button", { name: "Show photo: E2E upload test image" }).click();
      const src = await shop.getByAltText("E2E upload test image").first().getAttribute("src");
      // local disk serves /media/…; Vercel Blob serves *.blob.vercel-storage.com (both via next/image)
      assert(src && /media|blob\.vercel-storage/.test(decodeURIComponent(src)), `expected uploaded image, got ${src}`);
      active = admin;
    });

    await check("branch availability change is respected by the storefront", async () => {
      await visit(admin, `${BASE}/admin/branches`);
      await admin.getByRole("link", { name: /CHAJOY Badda/ }).click();
      await admin.getByLabel("Lemon Black Tea available").uncheck();
      await admin.getByRole("button", { name: "Save branch menu" }).click();
      await admin.getByText(/Saved \d+ change/).waitFor();
      active = shop;
      await visit(shop, `${BASE}/branches/badda`);
      const unavailableSection = shop.locator("section", { hasText: "Currently unavailable at this branch" });
      await unavailableSection.getByText("Lemon Black Tea").first().waitFor();
      active = admin;
      await admin.getByLabel("Lemon Black Tea available").check();
      await admin.getByRole("button", { name: "Save branch menu" }).click();
      await admin.getByText(/Saved \d+ change/).waitFor();
    });

    await check("every change is in the audit log", async () => {
      await visit(admin, `${BASE}/admin/audit?q=E2E`);
      await admin.getByText(/promotion “E2E ten percent”/).first().waitFor();
      await visit(admin, `${BASE}/admin/audit?q=branch.menu`);
      await admin.getByText(/CHAJOY Badda: \d+ menu\/stock change/).first().waitFor();
    });

    await check("clean up test data", () => cleanup(admin));
  } finally {
    await browser.close();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} admin checks passed.`);
    if (failed.length) process.exitCode = 1;
  }
}

main();
