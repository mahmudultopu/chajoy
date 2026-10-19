import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AdminRole } from "@/lib/db/schema";
import { HttpError } from "@/lib/errors";
import { randomToken, sha256 } from "@/lib/tokens";

export const ADMIN_COOKIE = "cj_admin";
const SESSION_HOURS = 12;

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

export function can(user: Pick<AdminUser, "role">, perm: Permission) {
  return (PERMISSIONS[perm] as readonly AdminRole[]).includes(user.role);
}

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
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.delete(schema.adminSessions).where(eq(schema.adminSessions.id, sha256(token)));
  jar.delete(ADMIN_COOKIE);
}

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

export function asActor(u: AdminUser) {
  return { type: "admin" as const, id: u.id, label: `${u.name} <${u.email}>` };
}
