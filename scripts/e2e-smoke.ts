/**
 * End-to-end smoke test in a real browser (Chrome via playwright-core).
 *
 * Needs: the app running (BASE_URL, default http://localhost:3000), sample
 * operating settings (`npm run db:demo-ops`) and an owner account
 * (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD). Screenshots go to E2E_SHOTS (default .data/e2e).
 *
 *   npm run test:e2e
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = path.resolve(process.env.E2E_SHOTS ?? ".data/e2e");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "owner@chajoy.test", password: process.env.E2E_ADMIN_PASSWORD ?? "Demo-Owner-Pass-2026" };
// a point ~0.6 km from the Rampura pin
const CUSTOMER = { latitude: 23.7655, longitude: 90.4189 };

fs.mkdirSync(SHOTS, { recursive: true });
let step = 0;
let activePage: Page | null = null;
const results: { name: string; ok: boolean; detail?: string }[] = [];

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    if (activePage) await activePage.screenshot({ path: path.join(SHOTS, `FAILED-${name.replace(/[^a-z0-9]+/gi, "-")}.png`), fullPage: true }).catch(() => {});
    results.push({ name, ok: false, detail: (e as Error).message.split("\n")[0] });
    console.log(`  ✗ ${name}\n      ${(e as Error).message.split("\n").slice(0, 4).join(" / ")}`);
    throw e;
  }
}
// caret: "initial" — Playwright otherwise injects caret-color styles, which can race hydration
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(SHOTS, `${String(++step).padStart(2, "0")}-${name}.png`), fullPage: false, caret: "initial" });
/** Navigate and let the page hydrate; map tiles can keep the network busy, so idle is best-effort. */
async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--enable-webgl", "--ignore-gpu-blocklist"] });
  const errors: string[] = [];
  try {
    // ------------------------------------------------------------ customer (phone-sized)
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, geolocation: CUSTOMER, permissions: ["geolocation"], isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    activePage = page;
    page.on("pageerror", (e) => errors.push(`pageerror ${e.message}`));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource|tile\.openstreetmap/.test(m.text()) && errors.push(`[${page.url()}] console ${m.text().slice(0, 4000)}`));

    await check("home page renders the hero and menu", async () => {
      await visit(page, BASE);
      const h1 = await page.getByRole("heading", { level: 1 }).textContent();
      assert(h1?.includes("Brings Joy."), `hero headline missing: ${h1}`);
      await shot(page, "home-mobile");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 1, `horizontal overflow of ${overflow}px on mobile`);
    });

    await check("branch finder ranks branches from the device location", async () => {
      await visit(page, `${BASE}/branches`);
      await page.getByRole("button", { name: "Use my location" }).click();
      await page.getByText("Recommended:").waitFor({ timeout: 15000 });
      await page.getByText("Finding the nearest branches…").waitFor({ state: "detached" }).catch(() => {});
      const first = await page.locator('ul[aria-label="CHAJOY branches"] > li h3').first().textContent();
      assert(first?.includes("Rampura"), `nearest branch should be Rampura, got ${first}`);
      await shot(page, "branch-finder");
      await page.locator('ul[aria-label="CHAJOY branches"] > li').first().getByRole("button", { name: /Order from this branch/ }).click();
      await page.getByText(/Ordering from CHAJOY Rampura/).first().waitFor({ timeout: 10000 });
    });

    await check("product page: choose options and add to cart", async () => {
      await visit(page, `${BASE}/products/boba-milk-tea`);
      await page.getByText("Available at").waitFor();
      await page.getByRole("button", { name: /Medium · 500 ml/ }).click();
      await page.getByRole("button", { name: "75%" }).click();
      await page.getByRole("button", { name: "Less ice" }).click();
      await page.locator("label", { hasText: "Pudding" }).click();
      await page.getByRole("button", { name: "More" }).click();
      await shot(page, "product-options");
      const label = await page.getByRole("button", { name: /Add to cart/ }).textContent();
      assert(label?.includes("৳420"), `expected ৳420 for 2 × (180 + 30), got "${label}"`);
      await page.getByRole("button", { name: /Add to cart/ }).click();
      await page.getByText("Added to your cart").waitFor();
    });

    await check("cart shows server-priced lines", async () => {
      await visit(page, `${BASE}/cart`);
      await page.getByText("Medium · 500 ml · Cold · 75% sugar · Less ice · + Pudding").waitFor();
      assert(await page.getByText("৳420").first().isVisible(), "cart total should be ৳420");
      await shot(page, "cart");
    });

    let orderUrl = "";
    await check("checkout: delivery with a map pin, duplicate click creates one order", async () => {
      await visit(page, `${BASE}/checkout`);
      await page.getByRole("radio", { name: /Delivery/ }).click();
      await page.getByLabel("Name").fill("E2E Customer");
      await page.getByLabel("Mobile number").fill("01712-345678");
      await page.getByLabel("House, road & area").fill("House 5, DIT Road, Rampura");
      await page.getByRole("button", { name: "Use my location" }).click();
      await page.getByText(/in a straight line/).waitFor({ timeout: 15000 });
      await page.getByRole("radio", { name: /Cash/ }).click();
      await page.getByText("৳480").first().waitFor(); // 420 + 60 sample delivery fee
      await shot(page, "checkout");
      // Replay the checkout request to the server twice (same body, same idempotency
      // key) to prove the server never creates a second order.
      const statuses: number[] = [];
      await page.route("**/api/checkout", async (route) => {
        const [a, b] = await Promise.all([route.fetch(), route.fetch()]);
        statuses.push(a.status(), b.status());
        await route.fulfill({ response: a.status() === 201 ? a : b });
      });
      await page.getByRole("button", { name: /Place order/ }).dblclick();
      await page.waitForURL(/\/orders\/CJ/, { timeout: 30000 });
      assert(statuses.sort().join(",") === "200,201", `expected one created (201) and one duplicate (200), got ${statuses}`);
      orderUrl = page.url();
      await page.getByText("Thank you, your order is in!").waitFor();
      await shot(page, "order-placed");
    });

    // ------------------------------------------------------------ admin (desktop)
    const admin = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    activePage = admin;
    admin.on("pageerror", (e) => errors.push(`admin pageerror ${e.message}`));
    const orderNumber = decodeURIComponent(new URL(orderUrl).pathname.split("/").pop()!);

    await check("admin sign-in", async () => {
      await visit(admin, `${BASE}/admin/login`);
      await admin.getByLabel("Email").fill(ADMIN.email);
      await admin.getByLabel("Password").fill(ADMIN.password);
      await admin.getByRole("button", { name: "Sign in" }).click();
      await admin.waitForURL(`${BASE}/admin`);
      await admin.getByText("Launch checklist").waitFor();
      await shot(admin, "admin-dashboard");
    });

    await check("exactly one order exists for the double submit", async () => {
      await visit(admin, `${BASE}/admin/orders?q=E2E%20Customer`);
      const rows = await admin.locator("tbody tr", { hasText: "E2E Customer" }).count();
      assert(rows >= 1, "order not listed");
      const matches = await admin.locator("tbody tr", { hasText: orderNumber }).count();
      assert(matches === 1, `expected 1 row for ${orderNumber}, got ${matches}`);
    });

    await check("admin moves the order through to delivered with cash collected", async () => {
      await admin.locator("a", { hasText: orderNumber }).click();
      await admin.getByText("Update status").waitFor();
      for (const next of ["Confirmed", "Being prepared", "Ready for dispatch", "Out for delivery", "Delivered"]) {
        await admin.getByLabel("Move to").selectOption({ label: next });
        if (next === "Delivered") await admin.getByLabel(/Cash collected/).check();
        await admin.getByRole("button", { name: "Update order" }).click();
        await admin.getByText("Order updated.").waitFor();
        await admin.reload({ waitUntil: "load" });
      }
      assert(await admin.getByText("Cash collected").first().isVisible(), "payment should show cash collected");
      await shot(admin, "admin-order");
    });

    await check("customer order page reflects the update", async () => {
      activePage = page;
      await visit(page, orderUrl);
      await page.getByRole("heading", { name: "Delivered" }).waitFor();
      await shot(page, "order-delivered");
    });

    await check("unauthenticated users can't open admin", async () => {
      const anon = await browser.newPage();
      await anon.goto(`${BASE}/admin/orders`);
      assert(anon.url().endsWith("/admin/login"), `expected redirect to login, got ${anon.url()}`);
      const res = await anon.request.get(`${BASE}/api/admin/export/products.csv`);
      assert(res.status() === 401, `export should be 401, got ${res.status()}`);
    });

    await check("no client-side errors", async () => {
      if (errors.length) fs.writeFileSync(path.join(SHOTS, "client-errors.txt"), errors.join("\n\n---\n\n"));
      assert(errors.length === 0, `${errors.length} client error(s) — see client-errors.txt. First: ${errors[0]?.slice(0, 160)}`);
    });
  } finally {
    await browser.close();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: ${SHOTS}`);
    if (failed.length) process.exitCode = 1;
  }
}

main().catch(() => {
  process.exitCode = 1;
});
