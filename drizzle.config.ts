import { defineConfig } from "drizzle-kit";

// Migrations are generated from the schema and applied by scripts/migrate.ts,
// which works for both PGlite (local) and node-postgres (DATABASE_URL).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
});
