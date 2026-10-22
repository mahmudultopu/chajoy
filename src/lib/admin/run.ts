/**
 * Shared plumbing for admin server actions: permission checks, error handling
 * and small FormData readers.
 */

import { headers } from "next/headers";
import { ZodError } from "zod";
import { HttpError } from "@/lib/errors";
import { requireAdmin, type AdminUser, type Permission } from "@/lib/auth/admin";
import type { ActionResult } from "@/components/admin/ui";

/** Run an admin server action: permission check, error mapping, client IP for the audit log. */
export async function run(perm: Permission, fn: (admin: AdminUser, ip: string | null) => Promise<string | ActionResult>): Promise<ActionResult> {
  try {
    const admin = await requireAdmin(perm);
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0] || null;
    const r = await fn(admin, ip);
    return typeof r === "string" ? { ok: true, message: r } : r;
  } catch (e) {
    if (e instanceof ZodError) {
      return { ok: false, message: "Please fix the highlighted fields.", fields: Object.fromEntries(e.issues.map((i) => [i.path.join(".") || "form", i.message])) };
    }
    if (e instanceof HttpError) return { ok: false, message: e.message };
    // Next.js redirects/notFound are thrown as errors and must propagate
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, message: "Something went wrong. Nothing was saved." };
  }
}

// FormData helpers
export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
/** Reads a trimmed FormData field, or null when it is empty. */
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
/** Reads a checkbox-style FormData field as a boolean. */
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
/** Reads a numeric FormData field, or null when empty. Rejects non-numbers. */
export const optNum = (fd: FormData, k: string) => {
  const s = str(fd, k);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new HttpError(422, `${k} must be a number.`);
  return n;
};
