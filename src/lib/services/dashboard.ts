/**
 * Figures for the admin dashboard: sales, order counts, best sellers and a
 * launch checklist, optionally limited to one branch.
 */

import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hasAnyHours } from "@/lib/hours";
import { getSettings } from "@/lib/services/settings";
import { isSslcommerzConfigured } from "@/lib/payments/sslcommerz";

const DHAKA_MS = 6 * 3600_000;

/** Start of "today" in Asia/Dhaka, as a UTC Date. */
export function dhakaDayStart(now = new Date(), daysAgo = 0) {
  const t = new Date(now.getTime() + DHAKA_MS);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - DHAKA_MS - daysAgo * 86_400_000);
}

/** Sales and order figures for the last `days` days, in Dhaka time. */
export async function dashboardMetrics(opts: { branchId: number | null; days: number }) {
  const now = new Date();
  const since = dhakaDayStart(now, opts.days - 1);
  const today = dhakaDayStart(now);
  const scope = opts.branchId ? eq(schema.orders.branchId, opts.branchId) : undefined;
  const live = ne(schema.orders.status, "cancelled");

  const [todayRow] = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${schema.orders.totalPaisa}),0)::int` })
    .from(schema.orders)
    .where(and(gte(schema.orders.createdAt, today), live, scope));

  const [periodRow] = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${schema.orders.totalPaisa}),0)::int` })
    .from(schema.orders)
    .where(and(gte(schema.orders.createdAt, since), live, scope));

  const daily = await db
    .select({
      day: sql<string>`to_char((${schema.orders.createdAt} at time zone 'Asia/Dhaka')::date, 'YYYY-MM-DD')`,
      total: sql<number>`sum(${schema.orders.totalPaisa})::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.orders)
    .where(and(gte(schema.orders.createdAt, since), live, scope))
    .groupBy(sql`1`);
  const series = Array.from({ length: opts.days }, (_, i) => {
    const d = new Date(dhakaDayStart(now, opts.days - 1 - i).getTime() + DHAKA_MS).toISOString().slice(0, 10);
    const r = daily.find((x) => x.day === d);
    return { day: d, totalPaisa: Number(r?.total ?? 0), orders: Number(r?.n ?? 0) };
  });

  const byStatus = await db
    .select({ status: schema.orders.status, n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(gte(schema.orders.createdAt, since), scope))
    .groupBy(schema.orders.status);

  const popular = await db
    .select({ name: schema.orderItems.productName, qty: sql<number>`sum(${schema.orderItems.quantity})::int`, total: sql<number>`sum(${schema.orderItems.lineTotalPaisa})::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(gte(schema.orders.createdAt, since), live, scope))
    .groupBy(schema.orderItems.productName)
    .orderBy(desc(sql`2`))
    .limit(6);

  const byBranch = await db
    .select({ branchId: schema.orders.branchId, name: schema.branches.name, n: sql<number>`count(*)::int`, total: sql<number>`sum(${schema.orders.totalPaisa})::int` })
    .from(schema.orders)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.orders.branchId))
    .where(and(gte(schema.orders.createdAt, since), live, scope))
    .groupBy(schema.orders.branchId, schema.branches.name)
    .orderBy(desc(sql`4`));

  const lowStock = await db
    .select({ branch: schema.branches.name, product: schema.products.name, size: schema.productVariants.sizeCode, qty: schema.branchInventory.stockQty, threshold: schema.branchInventory.lowStockThreshold })
    .from(schema.branchInventory)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.branchInventory.branchId))
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.branchInventory.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(and(eq(schema.branchInventory.trackStock, true), lte(schema.branchInventory.stockQty, schema.branchInventory.lowStockThreshold), opts.branchId ? eq(schema.branchInventory.branchId, opts.branchId) : undefined))
    .limit(20);

  const waiting = await db
    .select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, createdAt: schema.orders.createdAt, branch: schema.branches.name, totalPaisa: schema.orders.totalPaisa, paymentMethod: schema.orders.paymentMethod, paymentStatus: schema.orders.paymentStatus })
    .from(schema.orders)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.orders.branchId))
    .where(and(inArray(schema.orders.status, ["pending_confirmation"]), scope))
    .orderBy(schema.orders.createdAt)
    .limit(10);

  return {
    today: { orders: Number(todayRow?.n ?? 0), totalPaisa: Number(todayRow?.total ?? 0) },
    period: { orders: Number(periodRow?.n ?? 0), totalPaisa: Number(periodRow?.total ?? 0) },
    series,
    byStatus: byStatus.map((r) => ({ status: r.status, n: Number(r.n) })),
    popular: popular.map((p) => ({ name: p.name, qty: Number(p.qty), totalPaisa: Number(p.total) })),
    byBranch: byBranch.map((b) => ({ name: b.name, orders: Number(b.n), totalPaisa: Number(b.total) })),
    lowStock,
    waiting,
  };
}

export type SetupItem = { label: string; detail: string; href: string; done: boolean };

/** What still has to be configured or confirmed before the shop can fully trade online. */
export async function setupChecklist(): Promise<SetupItem[]> {
  const [branches, settings, products, pages] = await Promise.all([
    db.select().from(schema.branches),
    getSettings(),
    db.query.products.findMany({ with: { images: true } }),
    db.select().from(schema.contentPages),
  ]);
  const b = branches.filter((x) => x.isActive);
  const lowRes = products.filter((p) => !p.isAddon && p.images.every((i) => i.isLowRes || i.sourceType === "placeholder")).length;
  const items: SetupItem[] = [
    { label: "Exact branch locations", detail: `${b.filter((x) => x.locationPrecision === "exact" && !x.isSampleConfig).length}/${b.length} branches have a confirmed pin`, href: "/admin/branches", done: b.every((x) => x.locationPrecision === "exact" && !x.isSampleConfig) },
    { label: "Street addresses", detail: `${b.filter((x) => x.addressLine).length}/${b.length} branches have a street address`, href: "/admin/branches", done: b.every((x) => x.addressLine) },
    { label: "Opening hours", detail: `${b.filter((x) => hasAnyHours(x.openingHours) && !x.isSampleConfig).length}/${b.length} branches have real hours`, href: "/admin/branches", done: b.every((x) => hasAnyHours(x.openingHours) && !x.isSampleConfig) },
    { label: "Branch phone numbers", detail: `${b.filter((x) => x.phone).length}/${b.length} branches have a phone number`, href: "/admin/branches", done: b.every((x) => x.phone) },
    { label: "Online ordering", detail: `${b.filter((x) => x.acceptsOnlineOrders && !x.isSampleConfig).length} branch(es) taking online orders with real settings`, href: "/admin/branches", done: b.some((x) => x.acceptsOnlineOrders && !x.isSampleConfig) },
    { label: "Payment methods", detail: `Cash ${settings.payments.codEnabled ? "on" : "off"} · online ${settings.payments.sslcommerzEnabled ? "on" : isSslcommerzConfigured() ? "configured, off" : "not configured"}`, href: "/admin/settings", done: settings.payments.codEnabled || settings.payments.sslcommerzEnabled },
    { label: "Product photography", detail: `${lowRes} products only have low-resolution menu-board photos`, href: "/admin/products", done: lowRes === 0 },
    { label: "Ingredients & allergens", detail: `${products.filter((p) => !p.isAddon && !p.allergensVerified).length} products have no verified allergen info`, href: "/admin/products", done: products.every((p) => p.isAddon || p.allergensVerified) },
    { label: "Policy pages", detail: `${pages.filter((p) => p.status === "draft").length} page(s) still in draft`, href: "/admin/content", done: pages.every((p) => p.status === "published") },
    { label: "Sample settings removed", detail: b.some((x) => x.isSampleConfig) ? "Some branches still use sample hours/delivery from db:demo-ops" : "No sample settings in use", href: "/admin/branches", done: !b.some((x) => x.isSampleConfig) },
  ];
  return items;
}
