import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { DiscountCandidate } from "@/lib/pricing";

/** Rules of promotions whose window includes `now`. Eligibility is decided in pricing.quote(). */
export async function activeDiscountCandidates(now = new Date()): Promise<DiscountCandidate[]> {
  const rows = await db
    .select({ rule: schema.discountRules, promo: schema.promotions })
    .from(schema.discountRules)
    .innerJoin(schema.promotions, eq(schema.promotions.id, schema.discountRules.promotionId))
    .where(and(eq(schema.promotions.isActive, true), eq(schema.discountRules.isActive, true), lte(schema.promotions.startsAt, now), gte(schema.promotions.endsAt, now)));
  return rows.map(({ rule, promo }) => ({
    ruleId: rule.id,
    promotionId: promo.id,
    title: promo.title,
    code: rule.code,
    kind: rule.kind,
    value: rule.value,
    minSubtotalPaisa: rule.minSubtotalPaisa,
    maxDiscountPaisa: rule.maxDiscountPaisa,
    branchIds: rule.branchIds ?? null,
    fulfilment: rule.fulfilment,
    usageLimit: rule.usageLimit,
    usedCount: rule.usedCount,
    startsAt: promo.startsAt,
    endsAt: promo.endsAt,
    isActive: promo.isActive && rule.isActive,
  }));
}

/** Promotions to show customers: active, inside their dates. Never expired ones. */
export async function livePromotions(now = new Date()) {
  return db.query.promotions.findMany({
    where: and(eq(schema.promotions.isActive, true), lte(schema.promotions.startsAt, now), gte(schema.promotions.endsAt, now)),
    with: { rules: { where: eq(schema.discountRules.isActive, true) } },
    orderBy: desc(schema.promotions.startsAt),
  });
}

export async function liveAnnouncements(now = new Date(), branchId: number | null = null) {
  const rows = await db.select().from(schema.announcements).where(eq(schema.announcements.isActive, true)).orderBy(schema.announcements.sortOrder);
  return rows.filter(
    (a) =>
      (!a.startsAt || a.startsAt <= now) &&
      (!a.endsAt || a.endsAt >= now) &&
      (a.branchId === null || a.branchId === branchId),
  );
}
