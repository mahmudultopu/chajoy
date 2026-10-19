import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/tokens";

export const CUSTOMER_COOKIE = "cj_session";
const SESSION_DAYS = 30;

export type Customer = { id: number; name: string; email: string | null; phone: string | null };

export async function createCustomerSession(customerId: number) {
  const token = randomToken();
  await db.insert(schema.customerSessions).values({
    id: sha256(token),
    customerId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroyCustomerSession() {
  const jar = await cookies();
  const t = jar.get(CUSTOMER_COOKIE)?.value;
  if (t) await db.delete(schema.customerSessions).where(eq(schema.customerSessions.id, sha256(t)));
  jar.delete(CUSTOMER_COOKIE);
}

export async function currentCustomer(): Promise<Customer | null> {
  const t = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!t) return null;
  const [row] = await db
    .select({ c: schema.customers })
    .from(schema.customerSessions)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.customerSessions.customerId))
    .where(and(eq(schema.customerSessions.id, sha256(t)), gt(schema.customerSessions.expiresAt, new Date())));
  return row ? { id: row.c.id, name: row.c.name, email: row.c.email, phone: row.c.phone } : null;
}
