/**
 * Branch data access: listing, lookups, the public branch shape and ranking
 * branches by distance and by whether they can fulfil the visitor's order.
 */

import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { haversineKm, type LatLng } from "@/lib/geo";
import { getOpenStatus, describeOpenStatus, type OpenStatus } from "@/lib/hours";
import type { BranchSnapshot } from "@/lib/pricing";

export type Branch = typeof schema.branches.$inferSelect;

export type PublicBranch = {
  id: number;
  slug: string;
  name: string;
  area: string;
  addressLine: string | null;
  city: string;
  addressVerified: boolean;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: "exact" | "approximate" | "unknown";
  locationSource: string | null;
  phone: string | null;
  openingHours: Branch["openingHours"];
  open: OpenStatus;
  openLabel: string;
  temporarilyClosed: boolean;
  closureNote: string | null;
  acceptsOnlineOrders: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeePaisa: number | null;
  deliveryRadiusKm: number | null;
  deliveryAreas: string[] | null;
  minOrderPaisa: number | null;
  prepTimeMinutes: number | null;
  deliveryTimeMinutes: number | null;
  photoUrl: string | null;
  isSampleConfig: boolean;
};

/** Converts a branch row into the safe public shape, with its open/closed status. */
export function toPublicBranch(b: Branch, now = new Date()): PublicBranch {
  const open = getOpenStatus(b.openingHours, now);
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    area: b.area,
    addressLine: b.addressLine,
    city: b.city,
    addressVerified: b.addressVerified,
    latitude: b.latitude,
    longitude: b.longitude,
    locationPrecision: b.locationPrecision,
    locationSource: b.locationSource,
    phone: b.phone,
    openingHours: b.openingHours,
    open,
    openLabel: b.temporarilyClosed ? "Temporarily closed" : describeOpenStatus(open),
    temporarilyClosed: b.temporarilyClosed,
    closureNote: b.closureNote,
    acceptsOnlineOrders: b.acceptsOnlineOrders,
    pickupEnabled: b.pickupEnabled,
    deliveryEnabled: b.deliveryEnabled && b.deliveryFeePaisa !== null && b.deliveryRadiusKm !== null,
    deliveryFeePaisa: b.deliveryFeePaisa,
    deliveryRadiusKm: b.deliveryRadiusKm,
    deliveryAreas: b.deliveryAreas ?? null,
    minOrderPaisa: b.minOrderPaisa,
    prepTimeMinutes: b.prepTimeMinutes,
    deliveryTimeMinutes: b.deliveryTimeMinutes,
    photoUrl: b.photoUrl,
    isSampleConfig: b.isSampleConfig,
  };
}

/** The branch fields the pricing engine needs. */
export function toBranchSnapshot(b: Branch): BranchSnapshot {
  return {
    id: b.id,
    name: b.name,
    isActive: b.isActive,
    temporarilyClosed: b.temporarilyClosed,
    acceptsOnlineOrders: b.acceptsOnlineOrders,
    pickupEnabled: b.pickupEnabled,
    deliveryEnabled: b.deliveryEnabled,
    deliveryFeePaisa: b.deliveryFeePaisa,
    deliveryRadiusKm: b.deliveryRadiusKm,
    minOrderPaisa: b.minOrderPaisa,
    locationPrecision: b.locationPrecision,
    openingHours: b.openingHours,
    isSampleConfig: b.isSampleConfig,
  };
}

/** All active branches, sorted by name. */
export async function listBranches(): Promise<Branch[]> {
  return db.select().from(schema.branches).where(eq(schema.branches.isActive, true)).orderBy(asc(schema.branches.name));
}

/** An active branch by id, or null. */
export async function getBranchById(id: number | null | undefined): Promise<Branch | null> {
  if (!id) return null;
  const [b] = await db.select().from(schema.branches).where(eq(schema.branches.id, id));
  return b && b.isActive ? b : null;
}

/** An active branch by slug, or null. */
export async function getBranchBySlug(slug: string): Promise<Branch | null> {
  const [b] = await db.select().from(schema.branches).where(eq(schema.branches.slug, slug));
  return b && b.isActive ? b : null;
}

export type RankedBranch = PublicBranch & {
  distanceKm: number | null;
  distanceApprox: boolean;
  canOrderNow: boolean;
  /** why online ordering isn't possible right now, if it isn't */
  reasons: string[];
  /** cart items this branch can't make */
  missingItems: string[];
  deliversToYou: boolean | null; // null = can't tell
};

/**
 * Rank branches by straight-line distance and say whether each can take this
 * order. The recommendation is the nearest branch that can fulfil it, not just
 * the nearest pin.
 */
export async function rankBranches(opts: {
  origin: LatLng | null;
  productIds?: number[];
  fulfilment?: "pickup" | "delivery" | null;
  now?: Date;
}): Promise<{ branches: RankedBranch[]; recommendedId: number | null }> {
  const now = opts.now ?? new Date();
  const all = await listBranches();
  const wanted = [...new Set(opts.productIds ?? [])];
  let availability = new Map<number, Set<number>>();
  let names = new Map<number, string>();
  if (wanted.length) {
    const rows = await db.select().from(schema.branchProducts);
    const prods = await db.select({ id: schema.products.id, name: schema.products.name, status: schema.products.status }).from(schema.products);
    names = new Map(prods.map((p) => [p.id, p.name]));
    const inactive = new Set(prods.filter((p) => p.status !== "active").map((p) => p.id));
    availability = new Map();
    for (const r of rows) {
      if (!r.isAvailable || inactive.has(r.productId)) continue;
      if (!availability.has(r.branchId)) availability.set(r.branchId, new Set());
      availability.get(r.branchId)!.add(r.productId);
    }
  }

  const ranked: RankedBranch[] = all.map((b) => {
    const pub = toPublicBranch(b, now);
    const hasPin = b.latitude !== null && b.longitude !== null;
    const distanceKm = opts.origin && hasPin ? haversineKm(opts.origin, { lat: b.latitude!, lng: b.longitude! }) : null;
    const reasons: string[] = [];
    if (b.temporarilyClosed) reasons.push("Temporarily closed");
    else if (!b.acceptsOnlineOrders) reasons.push("Not taking online orders yet");
    else if (pub.open.state === "unknown") reasons.push("Opening hours not published");
    else if (pub.open.state === "closed") reasons.push(pub.openLabel);
    const fulfil = opts.fulfilment;
    if (fulfil === "pickup" && !b.pickupEnabled) reasons.push("No pickup");
    let deliversToYou: boolean | null = null;
    if (fulfil === "delivery") {
      if (!pub.deliveryEnabled) {
        reasons.push("No delivery");
        deliversToYou = false;
      } else if (b.locationPrecision === "exact" && distanceKm !== null) {
        deliversToYou = distanceKm <= b.deliveryRadiusKm!;
        if (!deliversToYou) reasons.push(`Outside its ${b.deliveryRadiusKm} km delivery area`);
      } else {
        reasons.push("Delivery area can't be checked yet");
      }
    }
    const have = availability.get(b.id) ?? new Set<number>();
    const missingItems = wanted.filter((id) => !have.has(id)).map((id) => names.get(id) ?? "An item");
    if (missingItems.length) reasons.push(`Can't make: ${missingItems.join(", ")}`);
    return {
      ...pub,
      distanceKm,
      distanceApprox: b.locationPrecision !== "exact",
      canOrderNow: reasons.length === 0,
      reasons,
      missingItems,
      deliversToYou,
    };
  });

  ranked.sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name);
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });
  const recommended = ranked.find((b) => b.canOrderNow && (opts.origin ? b.distanceKm !== null : true));
  return { branches: ranked, recommendedId: recommended?.id ?? null };
}
