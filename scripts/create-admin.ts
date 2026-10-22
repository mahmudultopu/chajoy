/**
 * CLI: creates the first owner account, or resets an admin's password.
 * Usage: npm run admin:create -- --email you@example.com --name "Your name"
 */

import { arg } from "./_env";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/db";
import { ADMIN_ROLES, type AdminRole } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { randomToken } from "../src/lib/tokens";

/**
 *   npm run admin:create -- --email owner@example.com --name "Owner" [--role owner|manager|branch_staff] [--branch rampura]
 * Password: set ADMIN_PASSWORD in the environment, otherwise a strong one is generated and printed once.
 */
async function main() {
  const email = arg("email")?.toLowerCase();
  const name = arg("name") ?? "CHAJOY Admin";
  const role = (arg("role") ?? "owner") as AdminRole;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Pass --email you@example.com");
  if (!ADMIN_ROLES.includes(role)) throw new Error(`--role must be one of ${ADMIN_ROLES.join(", ")}`);
  let branchId: number | null = null;
  if (role === "branch_staff") {
    const slug = arg("branch");
    const [b] = slug ? await db.select().from(schema.branches).where(eq(schema.branches.slug, slug)) : [];
    if (!b) throw new Error("branch_staff needs --branch <slug>");
    branchId = b.id;
  }
  const password = process.env.ADMIN_PASSWORD || randomToken(15);
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  if (existing) {
    await db.update(schema.adminUsers).set({ name, role, branchId, passwordHash, isActive: true, updatedAt: new Date() }).where(eq(schema.adminUsers.id, existing.id));
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.adminUserId, existing.id));
  } else {
    await db.insert(schema.adminUsers).values({ email, name, role, branchId, passwordHash });
  }
  await db.insert(schema.auditLogs).values({
    actorType: "system",
    actorLabel: "cli",
    action: existing ? "admin.reset" : "admin.created",
    entityType: "admin_user",
    entityId: email,
    summary: `${existing ? "Reset" : "Created"} ${role} ${email} from the command line`,
  });
  console.log(`✓ ${existing ? "updated" : "created"} ${role} ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`  password: ${password}\n  (shown once — change it after signing in)`);
}

main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e.message ?? e);
    await closeDb();
    process.exit(1);
  });
