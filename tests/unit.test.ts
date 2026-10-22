/** Unit tests for money, phone numbers, options, hours and order status rules. */

import { describe, expect, it } from "vitest";
import { formatBDT, paisaToDecimalString, parseTakaInput, percentOf } from "@/lib/money";
import { formatDistance, haversineKm, isInBangladesh } from "@/lib/geo";
import { getOpenStatus, validateHours } from "@/lib/hours";
import { normalizeOptions, optionsKey } from "@/lib/options";
import { allowedTransitions, canTransition } from "@/lib/order-status";
import { amountMatches } from "@/lib/payments/sslcommerz";
import { normalizeBdPhone } from "@/lib/validation";

describe("money", () => {
  it("parses taka input without float drift", () => {
    expect(parseTakaInput("180")).toBe(18000);
    expect(parseTakaInput("৳1,250.5")).toBe(125050);
    expect(parseTakaInput("0.1")).toBe(10);
    expect(parseTakaInput("12.345")).toBeNull();
    expect(parseTakaInput("-5")).toBeNull();
  });
  it("formats BDT", () => {
    expect(formatBDT(18000)).toBe("৳180");
    expect(formatBDT(125050)).toBe("৳1,250.50");
    expect(formatBDT(1234567800)).toBe("৳1,23,45,678");
    expect(paisaToDecimalString(18005)).toBe("180.05");
  });
  it("percent discounts round down", () => {
    expect(percentOf(33300, 1000)).toBe(3330);
    expect(percentOf(999, 1500)).toBe(149);
  });
});

describe("geo", () => {
  it("haversine matches a known Dhaka distance", () => {
    // Rampura area pin -> Banasree area pin, ~1.1 km
    const d = haversineKm({ lat: 23.7626126, lng: 90.4205675 }, { lat: 23.7617123, lng: 90.4312774 });
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });
  it("formats distances", () => {
    expect(formatDistance(0.42)).toBe("400 m");
    expect(formatDistance(2.345)).toBe("2.3 km");
    expect(formatDistance(14.6)).toBe("15 km");
  });
  it("bounds check", () => {
    expect(isInBangladesh({ lat: 23.81, lng: 90.41 })).toBe(true);
    expect(isInBangladesh({ lat: 51.5, lng: -0.12 })).toBe(false);
  });
});

describe("opening hours (Asia/Dhaka, UTC+6)", () => {
  const hours = { mon: [["10:00", "23:00"]] as [string, string][], tue: [["18:00", "02:00"]] as [string, string][] };
  // 2026-10-19 is a Monday
  const at = (iso: string) => new Date(iso);
  it("open during the day", () => {
    expect(getOpenStatus(hours, at("2026-10-19T06:00:00Z")).state).toBe("open"); // 12:00 Dhaka
  });
  it("closed before opening shows next opening", () => {
    const s = getOpenStatus(hours, at("2026-10-19T02:00:00Z")); // 08:00 Dhaka Monday
    expect(s).toEqual({ state: "closed", opensAt: "10 am", opensDay: null });
  });
  it("handles intervals that cross midnight", () => {
    expect(getOpenStatus(hours, at("2026-10-20T19:30:00Z")).state).toBe("open"); // Wed 01:30 Dhaka, from Tue 18:00–02:00
    expect(getOpenStatus(hours, at("2026-10-20T20:30:00Z")).state).toBe("closed"); // Wed 02:30
  });
  it("unknown when no hours are published", () => {
    expect(getOpenStatus(null).state).toBe("unknown");
    expect(getOpenStatus({}).state).toBe("unknown");
  });
  it("validates hours shape", () => {
    expect(validateHours(hours)).toBe(true);
    expect(validateHours({ mon: [["25:00", "10:00"]] })).toBe(false);
    expect(validateHours({ funday: [] })).toBe(false);
  });
});

describe("drink options", () => {
  const milkTea = { temperatures: ["cold", "hot"] as ("cold" | "hot")[], sugar: true, ice: true, toppings: true };
  const toppings = new Set([101, 102]);
  it("fills defaults", () => {
    expect(normalizeOptions(milkTea, {}, toppings)).toEqual({ ok: true, options: { temperature: "cold", sugar: 100, ice: "normal" } });
  });
  it("drops ice for hot drinks", () => {
    const r = normalizeOptions(milkTea, { temperature: "hot", ice: "less" }, toppings);
    expect(r).toEqual({ ok: true, options: { temperature: "hot", sugar: 100 } });
  });
  it("rejects options the product doesn't offer", () => {
    expect(normalizeOptions({}, { toppings: [101] }, toppings).ok).toBe(false);
    expect(normalizeOptions({ flavours: ["original", "matcha"] }, { flavour: "chocolate" }, toppings).ok).toBe(false);
    expect(normalizeOptions(milkTea, { sugar: 30 }, toppings).ok).toBe(false);
    expect(normalizeOptions(milkTea, { toppings: [999] }, toppings).ok).toBe(false);
  });
  it("dedupes toppings and gives a stable key", () => {
    const a = normalizeOptions(milkTea, { toppings: [102, 101, 102] }, toppings);
    const b = normalizeOptions(milkTea, { toppings: [101, 102] }, toppings);
    expect(a.ok && b.ok && optionsKey(a.options) === optionsKey(b.options)).toBe(true);
  });
});

describe("order status machine", () => {
  const base = { fulfilmentMethod: "pickup" as const, paymentStatus: "pending" as const };
  it("follows the pickup flow", () => {
    expect(allowedTransitions({ ...base, status: "ready" })).toEqual(["completed", "cancelled"]);
    expect(canTransition({ ...base, status: "ready" }, "out_for_delivery")).toBe(false);
  });
  it("follows the delivery flow", () => {
    expect(allowedTransitions({ ...base, fulfilmentMethod: "delivery", status: "ready" })).toEqual(["out_for_delivery", "cancelled"]);
  });
  it("only refunds money that was received", () => {
    expect(canTransition({ ...base, status: "cancelled" }, "refunded")).toBe(false);
    expect(canTransition({ ...base, paymentStatus: "paid", status: "cancelled" }, "refunded")).toBe(true);
  });
  it("cannot skip steps", () => {
    expect(canTransition({ ...base, status: "pending_confirmation" }, "completed")).toBe(false);
  });
});

describe("validation helpers", () => {
  it("normalises Bangladeshi mobile numbers", () => {
    expect(normalizeBdPhone("01712-345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("+880 1339 536491")).toBe("+8801339536491");
    expect(normalizeBdPhone("01212345678")).toBeNull();
    expect(normalizeBdPhone("12345")).toBeNull();
  });
  it("matches gateway amounts exactly", () => {
    expect(amountMatches("180.00", 18000)).toBe(true);
    expect(amountMatches("180.5", 18050)).toBe(true);
    expect(amountMatches("179.99", 18000)).toBe(false);
    expect(amountMatches(null, 18000)).toBe(false);
  });
});
