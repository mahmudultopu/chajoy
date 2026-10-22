/**
 * Admin authentication: role permissions, session cookies and guards for
 * admin pages, route handlers and server actions.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AdminRole } from "@/lib/db/schema";
import { HttpError } from "@/lib/errors";
import { randomToken, sha256 } from "@/lib/tokens";

/**
 * Session cookie name. In production the `__Host-` prefix makes browsers
 * refuse the cookie unless it is Secure, host-only and scoped to "/".
 */
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-cj_admin" : "cj_admin";
const SESSION_HOURS = 12;

/** Which admin roles may perform each action. */
export const PERMISSIONS = {
  "dashboard.view": ["owner", "manager", "branch_staff"],
  "orders.view": ["owner", "manager", "branch_staff"],
  "orders.manage": ["owner", "manager", "branch_staff"],
  "inventory.manage": ["owner", "manager", "branch_staff"],
  "products.manage": ["owner", "manager"],
  "branches.manage": ["owner", "manager"],
  "promotions.manage": ["owner", "manager"],
  "content.manage": ["owner", "manager"],
  "imports.manage": ["owner", "manager"],
  "settings.manage": ["owner"],
  "users.manage": ["owner"],
  "audit.view": ["owner", "manager"],
} as const satisfies Record<string, readonly AdminRole[]>;
export type Permission = keyof typeof PERMISSIONS;

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  /** branch_staff only see and change their own branch */
  branchScope: number | null;
};

/** True when the user's role grants the given permission. */
export function can(user: Pick<AdminUser, "role">, perm: Permission) {
  return (PERMISSIONS[perm] as readonly AdminRole[]).includes(user.role);
}

/** Starts a session: stores a hash of a random token and sets it as a cookie. */
export async function createAdminSession(userId: number) {
  const token = randomToken();
  const h = await headers();
  await db.insert(schema.adminSessions).values({
    id: sha256(token),
    adminUserId: userId,
    expiresAt: new Date(Date.now() + SESSION_HOURS * 3600_000),
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0] || null,
    userAgent: h.get("user-agent")?.slice(0, 200) ?? null,
  });
  await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, userId));
  (await cookies()).set(ADMIN_COOKIE, token, {
    // Not readable from JavaScript.
    httpOnly: true,
    // Admin pages are never reached from other sites, so never send it cross-site.
    sameSite: "strict",
    // HTTPS only in production.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

/** Deletes the current session from the database and clears its cookie. */
export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.delete(schema.adminSessions).where(eq(schema.adminSessions.id, sha256(token)));
  jar.delete(ADMIN_COOKIE);
}

/** Returns the signed-in, active admin for this request, or null. */
export async function currentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ user: schema.adminUsers })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminSessions.adminUserId))
    .where(and(eq(schema.adminSessions.id, sha256(token)), gt(schema.adminSessions.expiresAt, new Date())));
  if (!row || !row.user.isActive) return null;
  const u = row.user;
  return { id: u.id, email: u.email, name: u.name, role: u.role, branchScope: u.role === "branch_staff" ? u.branchId : null };
}

/** For pages: redirect to login, or show 403. */
export async function requireAdminPage(perm: Permission = "dashboard.view"): Promise<AdminUser> {
  const u = await currentAdmin();
  if (!u) redirect("/admin/login");
  if (!can(u, perm)) redirect("/admin?denied=1");
  return u;
}

/** For route handlers and server actions: throw. */
export async function requireAdmin(perm: Permission): Promise<AdminUser> {
  const u = await currentAdmin();
  if (!u) throw new HttpError(401, "Please sign in.");
  if (!can(u, perm)) throw new HttpError(403, "You don't have permission to do that.");
  return u;
}

/** Formats an admin as the actor recorded in audit logs and order history. */
export function asActor(u: AdminUser) {
  return { type: "admin" as const, id: u.id, label: `${u.name} <${u.email}>` };
}
