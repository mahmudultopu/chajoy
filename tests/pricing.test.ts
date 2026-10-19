import { describe, expect, it } from "vitest";
import { quote, type BranchSnapshot, type CatalogSnapshot, type DiscountCandidate, type QuoteInput } from "@/lib/pricing";

const allDay: [string, string][] = [["00:00", "23:59"]];
const branch = (over: Partial<BranchSnapshot> = {}): BranchSnapshot => ({
  id: 1,
  name: "CHAJOY Test",
  isActive: true,
  temporarilyClosed: false,
  acceptsOnlineOrders: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  deliveryFeePaisa: 6000,
  deliveryRadiusKm: 5,
  minOrderPaisa: null,
  locationPrecision: "exact",
  openingHours: { sun: allDay, mon: allDay, tue: allDay, wed: allDay, thu: allDay, fri: allDay, sat: allDay },
  isSampleConfig: false,
  ...over,
});

const catalog = (over: { available?: boolean; stockQty?: number | null; toppingAvailable?: boolean } = {}): CatalogSnapshot => ({
  products: new Map([
    [
      1,
      {
        id: 1,
        slug: "boba-milk-tea",
        name: "Boba Milk Tea",
        status: "active",
        isAddon: false,
        optionConfig: { temperatures: ["cold", "hot"], sugar: true, ice: true, toppings: true },
        availableAtBranch: over.available ?? true,
        variants: new Map([
          [11, { id: 11, sizeCode: "S", label: "Small", pricePaisa: 12000, isActive: true, trackStock: over.stockQty !== undefined && over.stockQty !== null, stockQty: over.stockQty ?? null }],
          [12, { id: 12, sizeCode: "M", label: "Medium", pricePaisa: 18000, isActive: true, trackStock: false, stockQty: null }],
        ]),
      },
    ],
  ]),
  toppings: new Map([[101, { name: "Pudding", pricePaisa: 3000, available: over.toppingAvailable ?? true }]]),
});

const now = new Date("2026-10-19T08:00:00Z");
const base = (over: Partial<QuoteInput> = {}): QuoteInput => ({
  lines: [{ id: 1, productId: 1, variantId: 12, quantity: 2, options: { temperature: "cold", sugar: 100, ice: "normal" } }],
  catalog: catalog(),
  branch: branch(),
  fulfilment: "pickup",
  discounts: [],
  now,
  ...over,
});

const promo = (over: Partial<DiscountCandidate> = {}): DiscountCandidate => ({
  ruleId: 1,
  promotionId: 1,
  title: "Test offer",
  code: null,
  kind: "percent",
  value: 1000,
  minSubtotalPaisa: 0,
  maxDiscountPaisa: null,
  branchIds: null,
  fulfilment: "any",
  usageLimit: null,
  usedCount: 0,
  startsAt: new Date("2026-01-01"),
  endsAt: new Date("2026-12-31"),
  isActive: true,
  ...over,
});

describe("quote()", () => {
  it("totals a simple pickup order", () => {
    const q = quote(base());
    expect(q.subtotalPaisa).toBe(36000);
    expect(q.deliveryFeePaisa).toBe(0);
    expect(q.totalPaisa).toBe(36000);
    expect(q.canCheckout).toBe(true);
  });

  it("adds topping prices per unit", () => {
    const q = quote(base({ lines: [{ id: 1, productId: 1, variantId: 11, quantity: 3, options: { temperature: "cold", sugar: 75, ice: "less", toppings: [101] } }] }));
    expect(q.lines[0].unitPricePaisa).toBe(15000);
    expect(q.subtotalPaisa).toBe(45000);
    expect(q.lines[0].optionsLabel).toBe("Cold · 75% sugar · Less ice · + Pudding");
  });

  it("refuses items the branch doesn't offer", () => {
    const q = quote(base({ catalog: catalog({ available: false }) }));
    expect(q.lines[0].status).toBe("unavailable");
    expect(q.lines[0].message).toBe("Currently unavailable at this branch.");
    expect(q.canCheckout).toBe(false);
    expect(q.subtotalPaisa).toBe(0);
  });

  it("refuses a topping the branch has run out of", () => {
    const q = quote(base({ catalog: catalog({ toppingAvailable: false }), lines: [{ id: 1, productId: 1, variantId: 12, quantity: 1, options: { temperature: "cold", sugar: 100, ice: "normal", toppings: [101] } }] }));
    expect(q.lines[0].status).toBe("unavailable");
    expect(q.canCheckout).toBe(false);
  });

  it("checks tracked stock across lines of the same size", () => {
    const q = quote(
      base({
        catalog: catalog({ stockQty: 3 }),
        lines: [
          { id: 1, productId: 1, variantId: 11, quantity: 2, options: { temperature: "cold", sugar: 100, ice: "normal" } },
          { id: 2, productId: 1, variantId: 11, quantity: 2, options: { temperature: "hot", sugar: 100 } },
        ],
      }),
    );
    expect(q.lines.every((l) => l.status === "insufficient_stock")).toBe(true);
    expect(q.canCheckout).toBe(false);
  });

  it("requires a branch, opening hours and an open branch", () => {
    expect(quote(base({ branch: null })).blockers.map((b) => b.code)).toContain("no_branch");
    expect(quote(base({ branch: branch({ openingHours: null }) })).blockers.map((b) => b.code)).toContain("hours_unknown");
    expect(quote(base({ branch: branch({ openingHours: { mon: [["20:00", "22:00"]] } }) })).blockers.map((b) => b.code)).toContain("branch_shut");
    expect(quote(base({ branch: branch({ acceptsOnlineOrders: false }) })).blockers.map((b) => b.code)).toContain("no_online_orders");
    expect(quote(base({ branch: branch({ temporarilyClosed: true }) })).blockers.map((b) => b.code)).toContain("branch_closed");
  });

  it("delivery: adds the fee inside the zone", () => {
    const q = quote(base({ fulfilment: "delivery", deliveryDistanceKm: 3.2 }));
    expect(q.deliveryFeePaisa).toBe(6000);
    expect(q.totalPaisa).toBe(42000);
    expect(q.canCheckout).toBe(true);
  });

  it("delivery: blocks outside the zone, without a pin, or with an approximate branch pin", () => {
    expect(quote(base({ fulfilment: "delivery", deliveryDistanceKm: 7 })).blockers.map((b) => b.code)).toContain("outside_delivery_zone");
    expect(quote(base({ fulfilment: "delivery", deliveryDistanceKm: null })).blockers.map((b) => b.code)).toContain("delivery_location_missing");
    expect(
      quote(base({ fulfilment: "delivery", deliveryDistanceKm: 1, branch: branch({ locationPrecision: "approximate" }) })).blockers.map((b) => b.code),
    ).toContain("delivery_zone_unverified");
    expect(quote(base({ fulfilment: "delivery", deliveryDistanceKm: 1, branch: branch({ deliveryFeePaisa: null }) })).blockers.map((b) => b.code)).toContain("no_delivery");
  });

  it("enforces a branch minimum order", () => {
    expect(quote(base({ branch: branch({ minOrderPaisa: 50000 }) })).blockers.map((b) => b.code)).toContain("min_order");
  });

  it("applies the best automatic offer", () => {
    const q = quote(base({ discounts: [promo({ ruleId: 1, value: 1000 }), promo({ ruleId: 2, kind: "fixed", value: 5000 })] }));
    expect(q.appliedDiscount?.ruleId).toBe(2);
    expect(q.discountPaisa).toBe(5000);
    expect(q.totalPaisa).toBe(31000);
  });

  it("applies a code and explains why one doesn't apply", () => {
    const d = [promo({ code: "JOY10", value: 1000, maxDiscountPaisa: 2000 })];
    expect(quote(base({ discounts: d, code: "joy10" })).discountPaisa).toBe(2000);
    expect(quote(base({ discounts: d, code: "NOPE" })).codeError).toBe("That code isn't valid.");
    const expired = [promo({ code: "OLD", endsAt: new Date("2026-01-31") })];
    expect(quote(base({ discounts: expired, code: "OLD" })).codeError).toBe("This offer isn't active.");
    const min = [promo({ code: "BIG", minSubtotalPaisa: 100000 })];
    expect(quote(base({ discounts: min, code: "BIG" })).codeError).toMatch(/Spend at least ৳1,000/);
    const limited = [promo({ code: "GONE", usageLimit: 5, usedCount: 5 })];
    expect(quote(base({ discounts: limited, code: "GONE" })).codeError).toBe("This offer has been fully redeemed.");
  });

  it("a discount never makes the total negative", () => {
    const q = quote(base({ discounts: [promo({ kind: "fixed", value: 999999 })] }));
    expect(q.discountPaisa).toBe(36000);
    expect(q.totalPaisa).toBe(0);
  });

  it("rejects tampered quantities", () => {
    const q = quote(base({ lines: [{ id: 1, productId: 1, variantId: 12, quantity: 500, options: { temperature: "cold", sugar: 100, ice: "normal" } }] }));
    expect(q.lines[0].status).toBe("unavailable");
  });
});
