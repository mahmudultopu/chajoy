/** CLI: checks that the database is reachable and prints row counts. */

import "./_env";
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";

// Quick health check: counts of the main tables.
async function main() {
  const r = await db.execute(sql`select
    (select count(*) from products) as products,
    (select count(*) from product_variants) as variants,
    (select count(*) from branches) as branches,
    (select count(*) from branches where is_sample_config) as sample_branches,
    (select count(*) from admin_users) as admins,
    (select count(*) from orders) as orders,
    (select count(*) from carts) as carts`);
  console.log((r as unknown as { rows: unknown[] }).rows?.[0] ?? r);
}
main().then(closeDb).catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
