/**
 * Server actions staff use to work an order: status changes, cash collection,
 * delivery details and internal notes. Branch staff are limited to their own branch.
 */

"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { asActor } from "@/lib/auth/admin";
import { markCashCollected, transitionOrder } from "@/lib/services/orders";
import { HttpError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { run, bool, optStr, str } from "./run";
import { httpsUrl } from "@/lib/validation";
import type { ActionResult } from "@/components/admin/ui";

/** Moves an order to its next status, enforcing the allowed transitions. */
export async function updateOrderStatus(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders.manage", async (admin, ip) => {
    const orderId = Number(str(fd, "orderId"));
    const to = z.enum(ORDER_STATUSES).parse(str(fd, "status"));
    await transitionOrder(orderId, to, asActor(admin), { note: optStr(fd, "note") ?? undefined, cashCollected: bool(fd, "cashCollected"), ip, branchScope: admin.branchScope });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return "Order updated.";
  });
}

/** Records that the cash for a cash-on-delivery or pickup order was received. */
export async function cashCollected(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders.manage", async (admin, ip) => {
    const orderId = Number(str(fd, "orderId"));
    await markCashCollected(orderId, asActor(admin), admin.branchScope, ip);
    revalidatePath(`/admin/orders/${orderId}`);
    return "Cash payment recorded.";
  });
}

/** Updates the rider, delivery method or tracking details of an order. */
export async function updateDelivery(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders.manage", async (admin, ip) => {
    const orderId = Number(str(fd, "orderId"));
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (!o) throw new HttpError(404, "Order not found.");
    if (admin.branchScope && o.branchId !== admin.branchScope) throw new HttpError(403, "This order belongs to another branch.");
    if (o.fulfilmentMethod !== "delivery") throw new HttpError(409, "This is a pickup order.");
    const v = z
      .object({
        method: z.enum(["in_house", "provider", "manual"]),
        providerName: z.string().max(80).nullable(),
        riderName: z.string().max(80).nullable(),
        riderPhone: z.string().max(30).nullable(),
        trackingRef: z.string().max(80).nullable(),
        trackingUrl: httpsUrl.nullable(),
      })
      .parse({
        method: str(fd, "method"),
        providerName: optStr(fd, "providerName"),
        riderName: optStr(fd, "riderName"),
        riderPhone: optStr(fd, "riderPhone"),
        trackingRef: optStr(fd, "trackingRef"),
        trackingUrl: optStr(fd, "trackingUrl"),
      });
    await db
      .update(schema.deliveries)
      .set({ ...v, status: v.riderName || v.providerName ? "assigned" : "pending", assignedAt: v.riderName || v.providerName ? new Date() : null, updatedAt: new Date() })
      .where(eq(schema.deliveries.orderId, orderId));
    await audit(asActor(admin), { action: "delivery.update", entityType: "order", entityId: orderId, summary: `${o.orderNumber}: delivery details updated`, diff: v, ip });
    revalidatePath(`/admin/orders/${orderId}`);
    return "Delivery details saved.";
  });
}

/** Adds an internal staff note to an order's history. */
export async function addOrderNote(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders.manage", async (admin, ip) => {
    const orderId = Number(str(fd, "orderId"));
    const note = z.string().min(1, "Write a note").max(500).parse(str(fd, "note"));
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (!o) throw new HttpError(404, "Order not found.");
    if (admin.branchScope && o.branchId !== admin.branchScope) throw new HttpError(403, "This order belongs to another branch.");
    await db.insert(schema.orderStatusHistory).values({ orderId, status: o.status, note, actor: `admin:${admin.id}` });
    await audit(asActor(admin), { action: "order.note", entityType: "order", entityId: orderId, summary: `${o.orderNumber}: note added`, ip });
    revalidatePath(`/admin/orders/${orderId}`);
    return "Note added.";
  });
}
