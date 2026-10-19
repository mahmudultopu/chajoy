import { z } from "zod";
import { db, schema } from "@/lib/db";
import { assertSameOrigin, handle, json, limit, parseJson } from "@/lib/http";

const CONSENT = "I agree to receive CHAJOY news and offers by email. I can unsubscribe at any time.";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  limit(req, "newsletter", 5, 10 * 60_000);
  const { email } = await parseJson(req, z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email.").max(120), consent: z.literal(true) }));
  await db.insert(schema.newsletterSubscribers).values({ email, consentText: CONSENT }).onConflictDoNothing();
  // Stored only; sending newsletters needs an email provider (see docs/REQUIRED-FROM-OWNER.md).
  return json({ ok: true, message: "Thanks — you're on the list." });
});
