import type { CartLineOptions, OpeningHours, ProductOptionConfig } from "@/lib/db/schema";
import { getOpenStatus, describeOpenStatus } from "@/lib/hours";
import { describeOptions, normalizeOptions } from "@/lib/options";
import { formatBDT, percentOf } from "@/lib/money";
import { formatDistance } from "@/lib/geo";

// Pure pricing. The browser never decides a price: the cart page, checkout
// and order creation all call quote() with data loaded on the server.

export type BranchSnapshot = {
  id: number;
  name: string;
  isActive: boolean;
  temporarilyClosed: boolean;
  acceptsOnlineOrders: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeePaisa: number | null;
  deliveryRadiusKm: number | null;
  minOrderPaisa: number | null;
  locationPrecision: "exact" | "approximate" | "unknown";
  openingHours: OpeningHours | null;
  isSampleConfig: boolean;
};

export type VariantSnapshot = {
  id: number;
  sizeCode: string;
  label: string;
  pricePaisa: number; // effective price at this branch
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
};

export type ProductSnapshot = {
  id: number;
  slug: string;
  name: string;
  status: "active" | "inactive" | "unavailable";
  isAddon: boolean;
  optionConfig: ProductOptionConfig;
  availableAtBranch: boolean;
  variants: Map<number, VariantSnapshot>;
};

export type CatalogSnapshot = {
  products: Map<number, ProductSnapshot>;
  /** add-on product id -> { name, price at branch, available at branch } */
  toppings: Map<number, { name: string; pricePaisa: number; available: boolean }>;
};

export type DiscountCandidate = {
  ruleId: number;
  promotionId: number;
  title: string;
  code: string | null;
  kind: "percent" | "fixed";
  value: number;
  minSubtotalPaisa: number;
  maxDiscountPaisa: number | null;
  branchIds: number[] | null;
  fulfilment: "any" | "pickup" | "delivery";
  usageLimit: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
};

export type CartLineInput = {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
  options: CartLineOptions;
};

export type QuoteInput = {
  lines: CartLineInput[];
  catalog: CatalogSnapshot;
  branch: BranchSnapshot | null;
  fulfilment: "pickup" | "delivery" | null;
  /** straight-line km from the branch pin to the customer's delivery pin */
  deliveryDistanceKm?: number | null;
  discounts: DiscountCandidate[];
  code?: string | null;
  now: Date;
};

export type QuoteLine = {
  id: number;
  productId: number;
  variantId: number;
  slug: string;
  productName: string;
  variantLabel: string;
  sizeCode: string;
  quantity: number;
  options: CartLineOptions;
  optionsLabel: string;
  basePricePaisa: number;
  toppingsPricePaisa: number;
  unitPricePaisa: number;
  lineTotalPaisa: number;
  status: "ok" | "unavailable" | "insufficient_stock";
  message?: string;
};

export type Blocker = { code: string; message: string };

export type Quote = {
  lines: QuoteLine[];
  subtotalPaisa: number;
  discountPaisa: number;
  appliedDiscount: { ruleId: number; promotionId: number; title: string; code: string | null } | null;
  codeError: string | null;
  deliveryFeePaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  blockers: Blocker[];
  canCheckout: boolean;
};

export const MAX_LINE_QTY = 20;

export function quote(input: QuoteInput): Quote {
  const { catalog, branch, fulfilment, now } = input;
  const blockers: Blocker[] = [];
  const lines: QuoteLine[] = [];
  const qtyByVariant = new Map<number, number>();

  for (const l of input.lines) qtyByVariant.set(l.variantId, (qtyByVariant.get(l.variantId) ?? 0) + l.quantity);

  const availableToppings = new Set(
    [...catalog.toppings.entries()].filter(([, t]) => t.available).map(([id]) => id),
  );
  const allToppings = new Set(catalog.toppings.keys());

  for (const l of input.lines) {
    const p = catalog.products.get(l.productId);
    const v = p?.variants.get(l.variantId);
    const base: QuoteLine = {
      id: l.id,
      productId: l.productId,
      variantId: l.variantId,
      slug: p?.slug ?? "",
      productName: p?.name ?? "Item no longer on the menu",
      variantLabel: v?.label ?? "",
      sizeCode: v?.sizeCode ?? "",
      quantity: l.quantity,
      options: l.options,
      optionsLabel: "",
      basePricePaisa: v?.pricePaisa ?? 0,
      toppingsPricePaisa: 0,
      unitPricePaisa: 0,
      lineTotalPaisa: 0,
      status: "ok",
    };

    if (!p || !v || p.isAddon) {
      lines.push({ ...base, status: "unavailable", message: "No longer on the menu." });
      continue;
    }
    base.optionsLabel = describeOptions(l.options, (id) => catalog.toppings.get(id)?.name);
    if (p.status !== "active" || !v.isActive) {
      lines.push({ ...base, status: "unavailable", message: "Currently unavailable." });
      continue;
    }
    if (!branch) {
      // no branch yet: show menu prices but nothing is orderable
      const tp = (l.options.toppings ?? []).reduce((s, id) => s + (catalog.toppings.get(id)?.pricePaisa ?? 0), 0);
      const unit = v.pricePaisa + tp;
      lines.push({ ...base, toppingsPricePaisa: tp, unitPricePaisa: unit, lineTotalPaisa: unit * l.quantity });
      continue;
    }
    if (!p.availableAtBranch) {
      lines.push({ ...base, status: "unavailable", message: "Currently unavailable at this branch." });
      continue;
    }
    // Re-check options against today's product rules (they may have changed since it was added).
    const norm = normalizeOptions(p.optionConfig, l.options, allToppings);
    if (!norm.ok) {
      lines.push({ ...base, status: "unavailable", message: `${norm.error} Please re-add this item.` });
      continue;
    }
    const missingTopping = (l.options.toppings ?? []).find((id) => !availableToppings.has(id));
    if (missingTopping !== undefined) {
      const name = catalog.toppings.get(missingTopping)?.name ?? "A topping";
      lines.push({ ...base, status: "unavailable", message: `${name} is currently unavailable at this branch.` });
      continue;
    }
    if (l.quantity < 1 || l.quantity > MAX_LINE_QTY || !Number.isInteger(l.quantity)) {
      lines.push({ ...base, status: "unavailable", message: `Quantity must be 1–${MAX_LINE_QTY}.` });
      continue;
    }
    const toppingsPricePaisa = (l.options.toppings ?? []).reduce((s, id) => s + catalog.toppings.get(id)!.pricePaisa, 0);
    const unit = v.pricePaisa + toppingsPricePaisa;
    const line: QuoteLine = {
      ...base,
      toppingsPricePaisa,
      unitPricePaisa: unit,
      lineTotalPaisa: unit * l.quantity,
    };
    if (v.trackStock && v.stockQty !== null && (qtyByVariant.get(v.id) ?? 0) > v.stockQty) {
      line.status = v.stockQty <= 0 ? "unavailable" : "insufficient_stock";
      line.message = v.stockQty <= 0 ? "Out of stock at this branch." : `Only ${v.stockQty} left at this branch.`;
    }
    lines.push(line);
  }

  const okLines = lines.filter((l) => l.status === "ok");
  const subtotalPaisa = okLines.reduce((s, l) => s + l.lineTotalPaisa, 0);

  // ---- branch & fulfilment checks
  if (input.lines.length === 0) blockers.push({ code: "empty", message: "Your cart is empty." });
  if (!branch) {
    blockers.push({ code: "no_branch", message: "Choose a CHAJOY branch to order from." });
  } else {
    if (!branch.isActive) blockers.push({ code: "branch_inactive", message: `${branch.name} isn't taking orders.` });
    else if (branch.temporarilyClosed)
      blockers.push({ code: "branch_closed", message: `${branch.name} is temporarily closed.` });
    else if (!branch.acceptsOnlineOrders)
      blockers.push({ code: "no_online_orders", message: `${branch.name} isn't taking online orders yet.` });
    else {
      const st = getOpenStatus(branch.openingHours, now);
      if (st.state === "unknown")
        blockers.push({ code: "hours_unknown", message: `${branch.name} hasn't published opening hours, so online ordering is paused.` });
      else if (st.state === "closed")
        blockers.push({ code: "branch_shut", message: `${branch.name} is closed right now (${describeOpenStatus(st)}).` });
    }
    if (fulfilment === "pickup" && !branch.pickupEnabled)
      blockers.push({ code: "no_pickup", message: `Pickup isn't available at ${branch.name}.` });
    if (fulfilment === "delivery") {
      if (!branch.deliveryEnabled || branch.deliveryFeePaisa === null || branch.deliveryRadiusKm === null)
        blockers.push({ code: "no_delivery", message: `Delivery isn't available from ${branch.name}.` });
      else if (branch.locationPrecision !== "exact")
        blockers.push({
          code: "delivery_zone_unverified",
          message: `${branch.name}'s exact location hasn't been confirmed, so delivery distance can't be checked yet.`,
        });
      else if (input.deliveryDistanceKm === null || input.deliveryDistanceKm === undefined)
        blockers.push({ code: "delivery_location_missing", message: "Set your delivery location on the map." });
      else if (input.deliveryDistanceKm > branch.deliveryRadiusKm)
        blockers.push({
          code: "outside_delivery_zone",
          message: `That address is about ${formatDistance(input.deliveryDistanceKm)} away in a straight line; ${branch.name} delivers within ${branch.deliveryRadiusKm} km.`,
        });
    }
    if (!fulfilment) blockers.push({ code: "no_fulfilment", message: "Choose pickup or delivery." });
    if (branch.minOrderPaisa && subtotalPaisa < branch.minOrderPaisa)
      blockers.push({ code: "min_order", message: `Minimum order at ${branch.name} is ${formatBDT(branch.minOrderPaisa)}.` });
  }
  if (lines.some((l) => l.status !== "ok"))
    blockers.push({ code: "unavailable_items", message: "Some items can't be ordered from this branch. Remove or change them to continue." });

  // ---- discounts (one per order: an entered code, otherwise the best automatic offer)
  let appliedDiscount: Quote["appliedDiscount"] = null;
  let discountPaisa = 0;
  let codeError: string | null = null;
  const eligible = (d: DiscountCandidate): string | null => {
    if (!d.isActive || now < d.startsAt || now > d.endsAt) return "This offer isn't active.";
    if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return "This offer has been fully redeemed.";
    if (d.branchIds && (!branch || !d.branchIds.includes(branch.id))) return "This offer isn't valid at this branch.";
    if (d.fulfilment !== "any" && d.fulfilment !== fulfilment) return `This offer is for ${d.fulfilment} orders only.`;
    if (subtotalPaisa < d.minSubtotalPaisa) return `Spend at least ${formatBDT(d.minSubtotalPaisa)} to use this offer.`;
    return null;
  };
  const amount = (d: DiscountCandidate) => {
    let a = d.kind === "percent" ? percentOf(subtotalPaisa, d.value) : d.value;
    if (d.maxDiscountPaisa !== null) a = Math.min(a, d.maxDiscountPaisa);
    return Math.max(0, Math.min(a, subtotalPaisa));
  };
  const code = input.code?.trim();
  if (code) {
    const d = input.discounts.find((x) => x.code && x.code.toLowerCase() === code.toLowerCase());
    if (!d) codeError = "That code isn't valid.";
    else {
      codeError = eligible(d);
      if (!codeError) {
        discountPaisa = amount(d);
        appliedDiscount = { ruleId: d.ruleId, promotionId: d.promotionId, title: d.title, code: d.code };
      }
    }
  }
  if (!appliedDiscount && !code) {
    for (const d of input.discounts.filter((x) => !x.code)) {
      if (eligible(d)) continue;
      const a = amount(d);
      if (a > discountPaisa) {
        discountPaisa = a;
        appliedDiscount = { ruleId: d.ruleId, promotionId: d.promotionId, title: d.title, code: null };
      }
    }
  }

  const deliveryFeePaisa = fulfilment === "delivery" && branch?.deliveryFeePaisa ? branch.deliveryFeePaisa : 0;
  const taxPaisa = 0; // menu prices are treated as final until CHAJOY confirms VAT handling
  const totalPaisa = subtotalPaisa - discountPaisa + deliveryFeePaisa + taxPaisa;

  return {
    lines,
    subtotalPaisa,
    discountPaisa,
    appliedDiscount,
    codeError,
    deliveryFeePaisa,
    taxPaisa,
    totalPaisa,
    blockers,
    canCheckout: blockers.length === 0,
  };
}
