import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { runMigrations } from "../scripts/migrate";
import { seed } from "@/lib/seed";
import { addToCart, buildCartView, createCart, setCartBranch, setCartFulfilment } from "@/lib/services/cart";
import { placeOrder } from "@/lib/services/orders";
import { loadCatalog, searchMenu } from "@/lib/services/catalog";
import { rankBranches } from "@/lib/services/branches";
import { setSetting, getSettings } from "@/lib/services/settings";
import { transitionOrder } from "@/lib/services/orders";
import type { CheckoutInput } from "@/lib/validation";

const allDay: [string, string][] = [["00:00", "23:59"]];
const NOW = new Date("2026-10-19T08:00:00Z");
let ids: { rampura: number; badda: number; boba: number; bobaM: number; bobaS: number; pudding: number; lemonWater: number; lemonWaterL: number };

async function product(slug: string) {
  const p = await db.query.products.findFirst({ where: eq(schema.products.slug, slug), with: { variants: true } });
  return p!;
}

beforeAll(async () => {
  await runMigrations();
  await seed({ log: () => {} });
  const branches = await db.select().from(schema.branches);
  const rampura = branches.find((b) => b.slug === "rampura")!;
  const badda = branches.find((b) => b.slug === "badda")!;
  // Configure Rampura as an operating branch for the test (exact pin, hours, delivery)
  await db
    .update(schema.branches)
    .set({ acceptsOnlineOrders: true, pickupEnabled: true, deliveryEnabled: true, deliveryFeePaisa: 6000, deliveryRadiusKm: 4, locationPrecision: "exact", openingHours: { sun: allDay, mon: allDay, tue: allDay, wed: allDay, thu: allDay, fri: allDay, sat: allDay } })
    .where(eq(schema.branches.id, rampura.id));
  await setSetting("payments", { ...(await getSettings()).payments, codEnabled: true });
  const boba = await product("boba-milk-tea");
  const pudding = await product("topping-pudding");
  const lemon = await product("fresh-iced-lemon-water");
  ids = {
    rampura: rampura.id,
    badda: badda.id,
    boba: boba.id,
    bobaM: boba.variants.find((v) => v.sizeCode === "M")!.id,
    bobaS: boba.variants.find((v) => v.sizeCode === "S")!.id,
    pudding: pudding.id,
    lemonWater: lemon.id,
    lemonWaterL: lemon.variants[0].id,
  };
});

const checkout = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  idempotencyKey: randomUUID(),
  branchId: ids.rampura,
  fulfilment: "pickup",
  name: "Test Customer",
  phone: "+8801712345678",
  paymentMethod: "cod",
  ...over,
});

describe("seeded catalogue", () => {
  it("has the verified menu prices", async () => {
    const all = await loadCatalog(null);
    const boba = all.find((p) => p.slug === "boba-milk-tea")!;
    expect(boba.variants.map((v) => [v.sizeCode, v.pricePaisa])).toEqual([
      ["S", 12000],
      ["M", 18000],
    ]);
    expect(all.find((p) => p.slug === "jasmine-peach-green-tea")!.fromPricePaisa).toBe(24000);
    expect(all.filter((p) => !p.isAddon)).toHaveLength(26);
    expect(boba.image?.url).toBe("/images/products/boba-milk-tea.webp");
  });

  it("search and filters work on real records", async () => {
    const all = await loadCatalog(null);
    expect((await searchMenu(all, { q: "boba" })).items.map((p) => p.slug)).toEqual(
      expect.arrayContaining(["boba-milk-tea", "brown-sugar-boba-sundae", "strawberry-bobo-milk-tea"]),
    );
    expect((await searchMenu(all, { q: "黑糖" })).items.map((p) => p.slug)).toContain("boba-milk-tea");
    expect((await searchMenu(all, { q: "peach tea" })).items[0].slug).toMatch(/peach/);
    const cheap = await searchMenu(all, { maxPaisa: 10000, sort: "price_asc", pageSize: 48 });
    expect(cheap.items.every((p) => p.variants.some((v) => v.pricePaisa <= 10000))).toBe(true);
    expect(cheap.items[0].fromPricePaisa).toBe(8000);
    expect((await searchMenu(all, { size: "L", pageSize: 48 })).total).toBe(9);
    expect((await searchMenu(all, { q: "pizza" })).total).toBe(0);
  });
});

describe("branch-specific catalogue", () => {
  it("uses branch price overrides and availability", async () => {
    await db.insert(schema.branchInventory).values({ branchId: ids.badda, variantId: ids.bobaM, pricePaisa: 19000 }).onConflictDoNothing();
    await db.update(schema.branchProducts).set({ isAvailable: false }).where(and(eq(schema.branchProducts.branchId, ids.badda), eq(schema.branchProducts.productId, ids.lemonWater)));
    const badda = await loadCatalog(ids.badda);
    expect(badda.find((p) => p.id === ids.boba)!.variants.find((v) => v.id === ids.bobaM)!.pricePaisa).toBe(19000);
    expect(badda.find((p) => p.id === ids.lemonWater)!.availability).toBe("unavailable_at_branch");
    const rampura = await loadCatalog(ids.rampura);
    expect(rampura.find((p) => p.id === ids.boba)!.variants.find((v) => v.id === ids.bobaM)!.pricePaisa).toBe(18000);
  });

  it("recommends the nearest branch that can fulfil the order", async () => {
    // Customer standing right by the Badda pin, wanting lemon water: Badda can't make it, Rampura can.
    const r = await rankBranches({ origin: { lat: 23.7765, lng: 90.4463 }, productIds: [ids.lemonWater], fulfilment: "pickup", now: NOW });
    expect(r.branches[0].slug).toBe("badda");
    expect(r.branches[0].canOrderNow).toBe(false);
    expect(r.recommendedId).toBe(ids.rampura);
    expect(r.branches.every((b, i, a) => i === 0 || (a[i - 1].distanceKm ?? Infinity) <= (b.distanceKm ?? Infinity))).toBe(true);
  });
});

describe("cart and checkout", () => {
  it("computes totals on the server and places an order", async () => {
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaM, quantity: 2, options: { temperature: "cold", sugar: 75, toppings: [ids.pudding] } });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaM, quantity: 1, options: { temperature: "cold", sugar: 75, toppings: [ids.pudding] } });
    const view = await buildCartView(await setCartFulfilment(cart, "pickup"), { now: NOW });
    expect(view.quote.lines).toHaveLength(1); // same choices merged into one line
    expect(view.quote.lines[0].quantity).toBe(3);
    expect(view.quote.subtotalPaisa).toBe(3 * (18000 + 3000));
    expect(view.quote.canCheckout).toBe(true);

    const placed = await placeOrder(cart, checkout(), { customerId: null, ip: null, now: NOW });
    const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, placed.orderId), with: { items: true, payments: true } });
    expect(order!.totalPaisa).toBe(63000);
    expect(order!.items[0]).toMatchObject({ productName: "Boba Milk Tea", unitPricePaisa: 21000, quantity: 3, sizeCode: "M" });
    expect(order!.paymentStatus).toBe("pending");
    expect(order!.payments[0].status).toBe("pending");
    expect(placed.orderNumber).toMatch(/^CJ261019-[0-9A-Z]{5}$/);
    // cart emptied
    expect((await buildCartView(cart, { now: NOW })).itemCount).toBe(0);
  });

  it("a repeated submission does not create a second order", async () => {
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaS, quantity: 1, options: {} });
    const input = checkout();
    const [a, b] = await Promise.all([
      placeOrder(cart, input, { customerId: null, ip: null, now: NOW }),
      placeOrder(cart, input, { customerId: null, ip: null, now: NOW }).catch((e) => e),
    ]);
    const second = b instanceof Error ? await placeOrder(cart, input, { customerId: null, ip: null, now: NOW }) : b;
    expect(second.orderNumber).toBe(a.orderNumber);
    const count = await db.select().from(schema.orders).where(eq(schema.orders.idempotencyKey, input.idempotencyKey));
    expect(count).toHaveLength(1);
  });

  it("unavailable products can't be ordered from that branch", async () => {
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.lemonWater, variantId: ids.lemonWaterL, quantity: 1, options: {} });
    // switch to Badda, where lemon water is switched off
    const moved = await setCartBranch(cart, ids.badda);
    const view = await buildCartView(moved, { now: NOW, fulfilment: "pickup" });
    expect(view.quote.lines[0].status).toBe("unavailable");
    expect(view.quote.canCheckout).toBe(false);
    await expect(placeOrder(moved, checkout({ branchId: ids.badda }), { customerId: null, ip: null, now: NOW })).rejects.toThrow();
    await expect(addToCart(moved, { productId: ids.lemonWater, variantId: ids.lemonWaterL, quantity: 1, options: {} })).rejects.toThrow(/unavailable at this branch/);
  });

  it("rejects a checkout for a branch other than the cart's", async () => {
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaS, quantity: 1, options: {} });
    await expect(placeOrder(cart, checkout({ branchId: ids.badda }), { customerId: null, ip: null, now: NOW })).rejects.toThrow(/branch changed/);
  });

  it("checks the delivery zone on the server", async () => {
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaS, quantity: 1, options: {} });
    const far = { addressLine: "House 1, Road 1, Uttara", city: "Dhaka", latitude: 23.8759, longitude: 90.3795 };
    await expect(placeOrder(cart, checkout({ fulfilment: "delivery", delivery: far }), { customerId: null, ip: null, now: NOW })).rejects.toThrow(/delivers within 4 km/);
    const near = { addressLine: "House 5, DIT Road, Rampura", city: "Dhaka", latitude: 23.7655, longitude: 90.4189 };
    const ok = await placeOrder(cart, checkout({ fulfilment: "delivery", delivery: near }), { customerId: null, ip: null, now: NOW });
    const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, ok.orderId), with: { delivery: true } });
    expect(o!.deliveryFeePaisa).toBe(6000);
    expect(o!.totalPaisa).toBe(12000 + 6000);
    expect(o!.delivery!.status).toBe("pending");
  });

  it("decrements tracked stock and never oversells", async () => {
    await db.insert(schema.branchInventory).values({ branchId: ids.rampura, variantId: ids.bobaS, trackStock: true, stockQty: 1 }).onConflictDoUpdate({
      target: [schema.branchInventory.branchId, schema.branchInventory.variantId],
      set: { trackStock: true, stockQty: 1 },
    });
    const a = await createCart({ branchId: ids.rampura });
    const b = await createCart({ branchId: ids.rampura });
    await addToCart(a.cart, { productId: ids.boba, variantId: ids.bobaS, quantity: 1, options: {} });
    await addToCart(b.cart, { productId: ids.boba, variantId: ids.bobaS, quantity: 1, options: {} });
    const results = await Promise.allSettled([
      placeOrder(a.cart, checkout(), { customerId: null, ip: null, now: NOW }),
      placeOrder(b.cart, checkout(), { customerId: null, ip: null, now: NOW }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [inv] = await db.select().from(schema.branchInventory).where(and(eq(schema.branchInventory.branchId, ids.rampura), eq(schema.branchInventory.variantId, ids.bobaS)));
    expect(inv.stockQty).toBe(0);
    await db.update(schema.branchInventory).set({ trackStock: false }).where(eq(schema.branchInventory.id, inv.id));
  });

  it("refuses cash orders when cash isn't enabled", async () => {
    await setSetting("payments", { codEnabled: false, sslcommerzEnabled: false });
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaS, quantity: 1, options: {} });
    await expect(placeOrder(cart, checkout(), { customerId: null, ip: null, now: NOW })).rejects.toThrow(/Cash payment isn't available/);
    await expect(placeOrder(cart, checkout({ paymentMethod: "sslcommerz" }), { customerId: null, ip: null, now: NOW })).rejects.toThrow(/Online payment isn't available/);
    await setSetting("payments", { codEnabled: true, sslcommerzEnabled: false });
  });
});

describe("order workflow", () => {
  it("moves through statuses and marks cash collected on handover", async () => {
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaM, quantity: 1, options: {} });
    const placed = await placeOrder(cart, checkout(), { customerId: null, ip: null, now: NOW });
    const actor = { type: "admin" as const, id: 1, label: "test" };
    for (const s of ["confirmed", "preparing", "ready"] as const) await transitionOrder(placed.orderId, s, actor);
    await expect(transitionOrder(placed.orderId, "out_for_delivery", actor)).rejects.toThrow(); // pickup order
    await transitionOrder(placed.orderId, "completed", actor, { cashCollected: true });
    const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, placed.orderId), with: { history: true } });
    expect(o!.status).toBe("completed");
    expect(o!.paymentStatus).toBe("paid");
    expect(o!.history.map((h) => h.status)).toEqual(["pending_confirmation", "confirmed", "preparing", "ready", "completed"]);
  });

  it("branch staff can't touch another branch's orders", async () => {
    const { cart } = await createCart({ branchId: ids.rampura });
    await addToCart(cart, { productId: ids.boba, variantId: ids.bobaM, quantity: 1, options: {} });
    const placed = await placeOrder(cart, checkout(), { customerId: null, ip: null, now: NOW });
    await expect(
      transitionOrder(placed.orderId, "confirmed", { type: "admin", id: 2, label: "staff" }, { branchScope: ids.badda }),
    ).rejects.toThrow(/another branch/);
  });
});
