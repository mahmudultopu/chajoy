import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createCustomerSession, currentCustomer, destroyCustomerSession } from "@/lib/auth/customer";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { assertSameOrigin, handle, HttpError, json, limit, parseJson } from "@/lib/http";
import { bdPhone, passwordSchema } from "@/lib/validation";

const register = z.object({
  action: z.literal("register"),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: bdPhone.optional(),
  password: passwordSchema,
  marketingConsent: z.boolean().default(false),
});
const login = z.object({ action: z.literal("login"), email: z.string().trim().toLowerCase().email(), password: z.string().max(200) });
const logout = z.object({ action: z.literal("logout") });
const body = z.discriminatedUnion("action", [register, login, logout]);

export const GET = handle(async () => json({ customer: await currentCustomer() }));

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const b = await parseJson(req, body);
  if (b.action === "logout") {
    await destroyCustomerSession();
    return json({ ok: true });
  }
  limit(req, `account-${b.action}`, 10, 15 * 60_000);
  if (b.action === "register") {
    const [exists] = await db.select({ id: schema.customers.id }).from(schema.customers).where(eq(schema.customers.email, b.email));
    if (exists) throw new HttpError(409, "An account with that email already exists. Try signing in.");
    const [c] = await db
      .insert(schema.customers)
      .values({ name: b.name, email: b.email, phone: b.phone ?? null, passwordHash: await hashPassword(b.password), marketingConsent: b.marketingConsent })
      .returning();
    await createCustomerSession(c.id);
    return json({ customer: { id: c.id, name: c.name, email: c.email } }, { status: 201 });
  }
  const [c] = await db.select().from(schema.customers).where(eq(schema.customers.email, b.email));
  const ok = c?.passwordHash ? await verifyPassword(b.password, c.passwordHash) : await verifyAgainstDummy(b.password);
  if (!c || !ok) throw new HttpError(401, "Email or password is incorrect.");
  await createCustomerSession(c.id);
  return json({ customer: { id: c.id, name: c.name, email: c.email } });
});
