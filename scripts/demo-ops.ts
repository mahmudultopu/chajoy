/**
 * CLI: fills a local database with demo orders so the admin dashboard has data.
 * Never run this against production.
 */

import { arg } from "./_env";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/db";
import { getSettings, setSetting } from "../src/lib/services/settings";

/**
 * LOCAL TESTING ONLY. CHAJOY hasn't published hours, delivery areas or fees,
 * so out of the box nothing can be ordered. This fills obviously-sample values
 * so the full ordering flow can be exercised, and flags every affected branch
 * as `isSampleConfig` — the storefront then shows a "sample settings" banner
 * and orders are marked as sample orders.
 *
 *   npm run db:demo-ops            enable sample settings
 *   npm run db:demo-ops -- --reset remove them again
 */
async function main() {
  if (process.env.NODE_ENV === "production" && arg("allow-production") !== "true") {
    throw new Error("Refusing to write sample operating settings in production.");
  }
  const reset = arg("reset") === "true";
  const branches = await db.select().from(schema.branches);
  for (const b of branches) {
    if (reset) {
      if (!b.isSampleConfig) continue;
      await db
        .update(schema.branches)
        .set({
          acceptsOnlineOrders: false,
          pickupEnabled: false,
          deliveryEnabled: false,
          deliveryFeePaisa: null,
          deliveryRadiusKm: null,
          prepTimeMinutes: null,
          openingHours: null,
          locationPrecision: "approximate",
          isSampleConfig: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.branches.id, b.id));
      continue;
    }
    const allDay: [string, string][] = [["00:00", "23:59"]];
    const deliveryPilot = ["mohammadpur", "rampura"].includes(b.slug);
    await db
      .update(schema.branches)
      .set({
        acceptsOnlineOrders: true,
        pickupEnabled: true,
        openingHours: { sun: allDay, mon: allDay, tue: allDay, wed: allDay, thu: allDay, fri: allDay, sat: allDay },
        prepTimeMinutes: 15,
        deliveryEnabled: deliveryPilot,
        deliveryFeePaisa: deliveryPilot ? 6000 : null,
        deliveryRadiusKm: deliveryPilot ? 5 : null,
        // the approximate pin is treated as exact ONLY so delivery checks can be tested
        locationPrecision: deliveryPilot ? "exact" : b.locationPrecision,
        isSampleConfig: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.branches.id, b.id));
  }
  const s = await getSettings();
  await setSetting("payments", { ...s.payments, codEnabled: !reset });
  console.log(
    reset
      ? "✓ sample operating settings removed"
      : "✓ SAMPLE settings applied: all branches take pickup orders 24h, Mohammadpur & Rampura deliver within 5 km for ৳60, cash enabled. For testing only.",
  );
}

main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exit(1);
  });
