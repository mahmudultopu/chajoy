import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export { schema };
export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * DATABASE_URL:
 *   unset / "pglite://.data/pglite"  -> embedded Postgres (PGlite) on disk, for local dev
 *   "pglite://memory"                -> in-memory PGlite, for tests
 *   "postgres://..."                 -> real PostgreSQL (Supabase, Neon, RDS...) for production
 *
 * PGlite is a single-process database, so the instance lives on globalThis:
 * Next.js can load this module more than once in one process (RSC, route
 * handlers), and two instances must never open the same data directory.
 */
type Handle = { db: DB; kind: "pglite" | "postgres"; close: () => Promise<void> };
const g = globalThis as unknown as { __chajoyDb?: Handle };

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "pglite://.data/pglite";
}

function open(): Handle {
  const url = databaseUrl();
  if (url.startsWith("pglite://")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    const target = url.slice("pglite://".length);
    let client: InstanceType<typeof PGlite>;
    if (target === "memory") {
      client = new PGlite();
    } else {
      const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), target);
      fs.mkdirSync(dir, { recursive: true });
      client = new PGlite(dir);
    }
    const db = drizzlePglite({ client, schema, casing: "snake_case" }) as unknown as DB;
    return { db, kind: "pglite", close: () => client.close() };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg");
  // DATABASE_SSL: "disable" | "require" (encrypted, no CA check) | "verify" (needs DATABASE_CA_CERT)
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const sslMode = process.env.DATABASE_SSL ?? (local ? "disable" : "require");
  const ssl =
    sslMode === "disable"
      ? undefined
      : sslMode === "verify"
        ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT }
        : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5), ssl });
  const db = drizzlePg({ client: pool, schema, casing: "snake_case" });
  return { db, kind: "postgres", close: () => pool.end() };
}

export function getHandle(): Handle {
  if (!g.__chajoyDb) g.__chajoyDb = open();
  return g.__chajoyDb;
}

export const db: DB = new Proxy({} as DB, {
  get(_t, prop) {
    const real = getHandle().db as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export async function closeDb() {
  if (g.__chajoyDb) {
    await g.__chajoyDb.close();
    g.__chajoyDb = undefined;
  }
}
