/**
 * Server actions for admin sign-in and sign-out.
 * Sign-in is rate limited per IP and per email, and every attempt is audited.
 */

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createAdminSession, destroyAdminSession, currentAdmin } from "@/lib/auth/admin";
import { verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/components/admin/ui";

/**
 * Checks an admin's email and password, starts a session and redirects to the dashboard.
 * Unknown emails are hashed against a dummy so timing doesn't reveal which accounts exist.
 */
export async function loginAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0] || "local";
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const rl = rateLimit(`admin-login:${ip}`, 8, 15 * 60_000);
  const rlEmail = rateLimit(`admin-login-email:${email}`, 8, 15 * 60_000);
  if (!rl.ok || !rlEmail.ok) return { ok: false, message: `Too many attempts. Try again in ${Math.max(rl.retryAfterSec, rlEmail.retryAfterSec)} seconds.` };

  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
  if (!user || !ok || !user.isActive) {
    await audit({ type: "system", label: "admin-login" }, { action: "admin.login_failed", entityType: "admin_user", entityId: email.slice(0, 120), summary: `Failed sign-in for ${email.slice(0, 120)}`, ip });
    return { ok: false, message: "Email or password is incorrect." };
  }
  await createAdminSession(user.id);
  await audit({ type: "admin", id: user.id, label: user.email }, { action: "admin.login", entityType: "admin_user", entityId: user.id, summary: `${user.email} signed in`, ip });
  redirect("/admin");
}

/** Ends the current admin session, records it in the audit log and returns to the login page. */
export async function logoutAction() {
  const u = await currentAdmin();
  await destroyAdminSession();
  if (u) await audit({ type: "admin", id: u.id, label: u.email }, { action: "admin.logout", entityType: "admin_user", entityId: u.id, summary: `${u.email} signed out` });
  redirect("/admin/login");
}
