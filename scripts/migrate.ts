/** CLI: applies the Drizzle migrations in /drizzle to the configured database. */

import "./_env";
import { closeDb, databaseUrl, getHandle } from "../src/lib/db";

/** Applies pending migrations using the driver for the current database. */
export async function runMigrations() {
  const h = getHandle();
  if (h.kind === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(h.db as never, { migrationsFolder: "drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(h.db, { migrationsFolder: "drizzle" });
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/migrate.ts")) {
  runMigrations()
    .then(async () => {
      console.log(`✓ migrations applied (${databaseUrl().startsWith("pglite") ? databaseUrl() : "postgres"})`);
      await closeDb();
    })
    .catch(async (e) => {
      console.error(e);
      await closeDb();
      process.exit(1);
    });
}
