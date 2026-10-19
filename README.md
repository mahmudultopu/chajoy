# CHAJOY BD

Online storefront and back office for **CHAJOY — Ice Cream & Tea** (চা জয়) in Dhaka: the full menu with branch-specific prices and availability, a nearest-branch finder, cart and checkout for pickup or delivery, order tracking, and an admin for products, branches, stock, orders, promotions and content. The homepage has interactive 3D drinks built with three.js.

All product names, sizes and prices come from CHAJOY's official menu board. Anything CHAJOY hasn't published (opening hours, delivery fees, exact branch pins, allergens…) is left empty and flagged rather than guessed — see [docs/AUDIT.md](docs/AUDIT.md) and [docs/REQUIRED-FROM-OWNER.md](docs/REQUIRED-FROM-OWNER.md).

## Quick start (local)

Requires Node.js 20.9+ (tested on 25). No database install needed — local development uses an embedded Postgres (PGlite) stored in `.data/`.

```bash
npm install
npm run db:setup                       # create tables + load the verified catalogue and branches
ADMIN_PASSWORD='choose-a-long-one' npm run admin:create -- --email you@example.com --name "Your Name"
npm run dev                            # http://localhost:3000  ·  admin at /admin
```

Out of the box nothing can be ordered, because no branch has published hours or delivery settings. To try the full ordering flow locally:

```bash
npm run db:demo-ops            # SAMPLE hours/delivery/cash for testing; the site shows a striped "sample settings" banner
npm run db:demo-ops -- --reset # remove them again
```

> **Stop `npm run dev` before running any `db:*` or `admin:*` script.** PGlite allows one process at a time; two processes on the same data folder can corrupt it. (Production uses a normal Postgres server and has no such limit.)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit + database integration tests (Vitest, in-memory Postgres) |
| `npm run test:e2e` | Browser smoke test with Chrome: branch finder → options → cart → delivery checkout (incl. duplicate submit) → admin fulfilment. Needs the app running with sample settings |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run db:seed` | Load/refresh the verified catalogue (`data/catalogue.json`) and branches (`data/branches.json`). Keeps admin edits; `-- --force` overwrites them |
| `npm run db:generate` | Create a migration after editing `src/lib/db/schema.ts` |
| `npm run db:check` | Print row counts (health check) |
| `npm run admin:create` | Create or reset an admin (`--email --name [--role owner\|manager\|branch_staff] [--branch slug]`) |
| `npm run images:extract` | Re-cut product photos from the official menu board (Python + OpenCV) |

## Project layout

```
data/                 verified catalogue & branch data, official menu board + crop boxes
docs/                 audit, architecture, operations guide, deployment, what's still needed
drizzle/              SQL migrations
public/images/        official product crops, store photos, logo
scripts/              migrate, seed, demo settings, admin bootstrap, e2e test, image extraction
src/app/(store)/      storefront pages        src/app/admin/   back office
src/app/api/          JSON APIs (cart, checkout, branches, geocode, orders, payments, export)
src/components/three/ 3D models, scenes and the SceneGate fallback logic
src/lib/              pricing, hours, geo, options, services, auth, payments, CSV import
tests/                Vitest suites
```

## Documentation

- [docs/AUDIT.md](docs/AUDIT.md) — what was found on chajoybd.odoo.com and where every fact came from
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — why standalone (not Odoo-backed), data model, pricing, security, 3D
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — updating products, images, prices, branches, stock and orders
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Postgres, storage, Vercel/VPS, go-live checklist
- [docs/REQUIRED-FROM-OWNER.md](docs/REQUIRED-FROM-OWNER.md) — business details and credentials still needed

## Integration status

| Integration | Status |
|---|---|
| Cash on delivery / at pickup | Working; off until enabled in Admin → Settings |
| SSLCommerz (bKash, Nagad, cards) | Implemented against SSLCommerz's documented v4 API with server-side validation; **not yet tested** — no merchant credentials were available |
| Maps & address search | Working with OpenStreetMap tiles and Nominatim (light-use public services) |
| Email / SMS notifications, phone OTP | Not built (no provider configured) |
| Courier APIs / live tracking | Not built; staff can record a rider or courier tracking link |
| Odoo sync | Not applicable today — the Odoo site has no shop data (see the audit) |
