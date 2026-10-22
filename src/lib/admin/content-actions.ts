/**
 * Server actions for site content and settings: promotions, announcements,
 * homepage copy, payment switches, policy pages and admin user accounts.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { asActor } from "@/lib/auth/admin";
import { audit } from "@/lib/audit";
import { parseTakaInput } from "@/lib/money";
import { getSettings, setSetting } from "@/lib/services/settings";
import { isSslcommerzConfigured } from "@/lib/payments/sslcommerz";
import { hashPassword } from "@/lib/auth/password";
import { HttpError } from "@/lib/errors";
import { randomToken } from "@/lib/tokens";
import { run, bool, optStr, str } from "./run";
import { httpsUrl } from "@/lib/validation";
import type { ActionResult } from "@/components/admin/ui";

const dhakaDate = (s: string, endOfDay = false) => {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(s)) throw new HttpError(422, `Invalid date "${s}".`);
  const withTime = s.length === 10 ? `${s}T${endOfDay ? "23:59:59" : "00:00:00"}` : `${s}:00`;
  return new Date(`${withTime}+06:00`);
};

// ---------------------------------------------------------------- promotions

export async function savePromotion(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("promotions.manage", async (admin, ip) => {
    const id = Number(str(fd, "id")) || null;
    const startsAt = dhakaDate(str(fd, "startsAt"));
    const endsAt = dhakaDate(str(fd, "endsAt"), true);
    if (!startsAt || !endsAt) throw new HttpError(422, "Set the start and end dates.");
    if (endsAt <= startsAt) throw new HttpError(422, "The end date must be after the start date.");
    const p = z
      .object({ title: z.string().min(3).max(100), description: z.string().max(400).nullable(), terms: z.string().min(10, "Write the offer terms customers will see").max(1500) })
      .parse({ title: str(fd, "title"), description: optStr(fd, "description"), terms: str(fd, "terms") });
    const kind = z.enum(["percent", "fixed"]).parse(str(fd, "kind"));
    const rawValue = str(fd, "value");
    const value = kind === "percent" ? Math.round(Number(rawValue) * 100) : parseTakaInput(rawValue);
    if (!value || value <= 0 || (kind === "percent" && value > 10000)) throw new HttpError(422, kind === "percent" ? "Percent must be between 0 and 100." : "Enter a discount amount in taka.");
    const code = optStr(fd, "code")?.toUpperCase() ?? null;
    if (code && !/^[A-Z0-9-]{3,30}$/.test(code)) throw new HttpError(422, "Codes use 3–30 letters, numbers or dashes.");
    const branchIds = fd.getAll("branchIds").map(Number).filter(Boolean);
    const rule = {
      code,
      kind,
      value,
      minSubtotalPaisa: parseTakaInput(str(fd, "minSubtotal") || "0") ?? 0,
      maxDiscountPaisa: str(fd, "maxDiscount") ? parseTakaInput(str(fd, "maxDiscount")) : null,
      branchIds: branchIds.length ? branchIds : null,
      fulfilment: z.enum(["any", "pickup", "delivery"]).parse(str(fd, "fulfilment") || "any"),
      usageLimit: str(fd, "usageLimit") ? Math.max(1, Math.trunc(Number(str(fd, "usageLimit")))) : null,
      isActive: true,
    };
    await db.transaction(async (tx) => {
      let promoId = id;
      if (id) await tx.update(schema.promotions).set({ ...p, startsAt, endsAt, isActive: bool(fd, "isActive"), updatedAt: new Date() }).where(eq(schema.promotions.id, id));
      else promoId = (await tx.insert(schema.promotions).values({ ...p, startsAt, endsAt, isActive: bool(fd, "isActive") }).returning())[0].id;
      const [existingRule] = await tx.select().from(schema.discountRules).where(eq(schema.discountRules.promotionId, promoId!));
      if (code) {
        const [clash] = await tx.select().from(schema.discountRules).where(eq(schema.discountRules.code, code));
        if (clash && clash.promotionId !== promoId) throw new HttpError(409, `Code ${code} is already used by another promotion.`);
      }
      if (existingRule) await tx.update(schema.discountRules).set({ ...rule, updatedAt: new Date() }).where(eq(schema.discountRules.id, existingRule.id));
      else await tx.insert(schema.discountRules).values({ ...rule, promotionId: promoId! });
      await audit(asActor(admin), { action: id ? "promotion.update" : "promotion.create", entityType: "promotion", entityId: promoId, summary: `${id ? "Updated" : "Created"} promotion “${p.title}”`, diff: { ...rule, startsAt, endsAt }, ip }, tx);
    });
    revalidatePath("/", "layout");
    if (!id) redirect("/admin/promotions?saved=1");
    return "Promotion saved.";
  });
}

/** Deletes a promotion, or deactivates it instead when existing orders reference it. */
export async function deletePromotion(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("promotions.manage", async (admin, ip) => {
    const id = Number(str(fd, "id"));
    const used = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.promotionId, id)).limit(1);
    if (used.length) {
      await db.update(schema.promotions).set({ isActive: false }).where(eq(schema.promotions.id, id));
      await audit(asActor(admin), { action: "promotion.deactivate", entityType: "promotion", entityId: id, summary: "Promotion switched off (kept because orders used it)", ip });
      revalidatePath("/", "layout");
      return "Promotion switched off. It's kept because past orders used it.";
    }
    await db.delete(schema.promotions).where(eq(schema.promotions.id, id));
    await audit(asActor(admin), { action: "promotion.delete", entityType: "promotion", entityId: id, summary: "Promotion deleted", ip });
    revalidatePath("/", "layout");
    redirect("/admin/promotions");
  });
}

// ---------------------------------------------------------------- announcements

export async function saveAnnouncement(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("content.manage", async (admin, ip) => {
    const id = Number(str(fd, "id")) || null;
    if (id && bool(fd, "delete")) {
      await db.delete(schema.announcements).where(eq(schema.announcements.id, id));
      await audit(asActor(admin), { action: "announcement.delete", entityType: "announcement", entityId: id, summary: "Announcement deleted", ip });
      revalidatePath("/", "layout");
      return "Announcement deleted.";
    }
    const v = {
      message: z.string().min(3).max(160).parse(str(fd, "message")),
      linkUrl: optStr(fd, "linkUrl"),
      linkLabel: optStr(fd, "linkLabel"),
      branchId: Number(str(fd, "branchId")) || null,
      startsAt: dhakaDate(str(fd, "startsAt")),
      endsAt: dhakaDate(str(fd, "endsAt"), true),
      isActive: bool(fd, "isActive"),
      sortOrder: Number(str(fd, "sortOrder")) || 0,
    };
    if (v.linkUrl && !/^(\/|https:\/\/)/.test(v.linkUrl)) throw new HttpError(422, "Links must start with / or https://");
    if (id) await db.update(schema.announcements).set({ ...v, updatedAt: new Date() }).where(eq(schema.announcements.id, id));
    else await db.insert(schema.announcements).values(v);
    await audit(asActor(admin), { action: id ? "announcement.update" : "announcement.create", entityType: "announcement", entityId: id, summary: v.message, ip });
    revalidatePath("/", "layout");
    return "Announcement saved.";
  });
}

// ---------------------------------------------------------------- settings & pages

export async function saveSiteContent(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("content.manage", async (admin, ip) => {
    const s = await getSettings();
    const hero = {
      eyebrow: str(fd, "hero.eyebrow") || s.hero.eyebrow,
      headline: z.string().min(2).max(40).parse(str(fd, "hero.headline")),
      headlineAccent: z.string().max(40).parse(str(fd, "hero.headlineAccent")),
      subhead: z.string().min(10).max(300).parse(str(fd, "hero.subhead")),
    };
    const contact = {
      phone: z.string().min(6).max(30).parse(str(fd, "contact.phone")),
      phoneHref: `tel:${str(fd, "contact.phone").replace(/[^\d+]/g, "")}`,
      email: z.string().email().parse(str(fd, "contact.email")),
    };
    const social = { facebook: httpsUrl.parse(str(fd, "social.facebook")), instagram: httpsUrl.parse(str(fd, "social.instagram")) };
    const story = { title: z.string().min(3).max(80).parse(str(fd, "story.title")), paragraphs: str(fd, "story.paragraphs").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) };
    await setSetting("hero", hero);
    await setSetting("contact", contact);
    await setSetting("social", social);
    await setSetting("story", story);
    await audit(asActor(admin), { action: "settings.content", entityType: "settings", entityId: "content", summary: "Homepage, contact and social settings updated", ip });
    revalidatePath("/", "layout");
    return "Site content saved.";
  });
}

/** Turns cash on delivery and SSLCommerz on or off. Online payment needs gateway credentials first. */
export async function savePayments(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("settings.manage", async (admin, ip) => {
    const ssl = bool(fd, "sslcommerzEnabled");
    if (ssl && !isSslcommerzConfigured()) throw new HttpError(409, "Add SSLCommerz credentials to the server environment before enabling online payment.");
    const payments = { codEnabled: bool(fd, "codEnabled"), sslcommerzEnabled: ssl };
    await setSetting("payments", payments);
    await audit(asActor(admin), { action: "settings.payments", entityType: "settings", entityId: "payments", summary: `Payments: cash ${payments.codEnabled ? "on" : "off"}, online ${payments.sslcommerzEnabled ? "on" : "off"}`, ip });
    revalidatePath("/", "layout");
    return "Payment settings saved.";
  });
}

/** Saves a content page (policies, about) as a draft or publishes it. */
export async function savePage(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("content.manage", async (admin, ip) => {
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(str(fd, "slug"));
    const title = z.string().min(2).max(100).parse(str(fd, "title"));
    const body = z.string().min(10).max(30000).parse(String(fd.get("body") ?? ""));
    const status = bool(fd, "publish") ? ("published" as const) : ("draft" as const);
    await db
      .insert(schema.contentPages)
      .values({ slug, title, body, status })
      .onConflictDoUpdate({ target: schema.contentPages.slug, set: { title, body, status, updatedAt: new Date() } });
    await audit(asActor(admin), { action: "page.save", entityType: "page", entityId: slug, summary: `${title} saved as ${status}`, ip });
    revalidatePath(`/policies/${slug}`);
    return `Page saved (${status}).`;
  });
}

// ---------------------------------------------------------------- admin users

export async function saveAdminUser(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("users.manage", async (admin, ip) => {
    const id = Number(str(fd, "id")) || null;
    const v = z
      .object({ email: z.string().trim().toLowerCase().email(), name: z.string().min(2).max(80), role: z.enum(["owner", "manager", "branch_staff"]), branchId: z.number().int().positive().nullable() })
      .parse({ email: str(fd, "email"), name: str(fd, "name"), role: str(fd, "role"), branchId: Number(str(fd, "branchId")) || null });
    if (v.role === "branch_staff" && !v.branchId) throw new HttpError(422, "Branch staff need a branch.");
    if (id === admin.id && (v.role !== "owner" || !bool(fd, "isActive"))) throw new HttpError(409, "You can't demote or deactivate your own account.");
    let message = "User saved.";
    if (id) {
      await db.update(schema.adminUsers).set({ ...v, branchId: v.role === "branch_staff" ? v.branchId : null, isActive: bool(fd, "isActive"), updatedAt: new Date() }).where(eq(schema.adminUsers.id, id));
      if (!bool(fd, "isActive")) await db.delete(schema.adminSessions).where(eq(schema.adminSessions.adminUserId, id));
    } else {
      const [exists] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, v.email));
      if (exists) throw new HttpError(409, "That email already has an account.");
      const password = randomToken(12);
      await db.insert(schema.adminUsers).values({ ...v, branchId: v.role === "branch_staff" ? v.branchId : null, passwordHash: await hashPassword(password) });
      message = `User created. Temporary password (shown once): ${password}`;
    }
    await audit(asActor(admin), { action: id ? "admin_user.update" : "admin_user.create", entityType: "admin_user", entityId: id ?? v.email, summary: `${id ? "Updated" : "Created"} ${v.role} ${v.email}`, ip });
    revalidatePath("/admin/users");
    return message;
  });
}

/** Lets the signed-in admin set a new password (minimum 12 characters). */
export async function changeOwnPassword(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("dashboard.view", async (admin, ip) => {
    const pw = z.string().min(12, "Use at least 12 characters.").max(200).parse(str(fd, "password"));
    if (pw !== str(fd, "confirm")) throw new HttpError(422, "The passwords don't match.");
    await db.update(schema.adminUsers).set({ passwordHash: await hashPassword(pw), updatedAt: new Date() }).where(eq(schema.adminUsers.id, admin.id));
    await audit(asActor(admin), { action: "admin_user.password", entityType: "admin_user", entityId: admin.id, summary: "Changed own password", ip });
    return "Password changed.";
  });
}
