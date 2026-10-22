/** CLI: seeds the database from data/catalogue.json and data/branches.json. */

import { arg } from "./_env";
import { closeDb } from "../src/lib/db";
import { seed } from "../src/lib/seed";

seed({ force: arg("force") === "true" })
  .then(closeDb)
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exit(1);
  });
