# Architecture

## Decision: standalone app (Option B), Odoo-ready later

The Odoo site has the Website app only — no eCommerce, no product records, no inventory (see [AUDIT.md](AUDIT.md)). There is nothing to treat as a source of truth, and running Odoo eCommerce as a headless backend would add licence, hosting and sync cost before CHAJOY has an online catalogue at all.

So this is a self-contained Next.js + PostgreSQL application that owns catalogue, branches, stock, carts and orders. If CHAJOY later adopts Odoo Inventory/POS, the clean seams for a sync are:

- `src/lib/csv-import.ts` — the same validation can sit behind an Odoo XML-RPC/JSON-RPC pull
- `orders` + `order_items` (immutable snapshots) — push to Odoo `sale.order` from a background job
- `branch_inventory` — the one table an Odoo stock sync would write to

Odoo credentials would live only in server environment variables, never in browser code.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4 with design tokens in `src/app/globals.css` |
| 3D | three.js, React Three Fiber 9, drei; GSAP ScrollTrigger for scroll-linked motion |
| Maps | Leaflet + OpenStreetMap tiles; Nominatim geocoding through a server proxy |
| Database | PostgreSQL via Drizzle ORM. Local dev/tests use **PGlite** (Postgres compiled to WASM, in-process) |
| Validation | Zod on every API body, server action and import row |
| Auth | Own sessions: random token in an httpOnly cookie, SHA-256 hash in the DB; bcrypt passwords |
| Payments | SSLCommerz hosted checkout (bKash/Nagad/cards) + cash |
| Tests | Vitest (unit + DB integration on in-memory PGlite), Playwright-driven browser smoke test |

## Request flow

```
Browser ──► Server Components (read: catalogue, branch, cart via cookies)
        ──► /api/* route handlers (cart, quote, checkout, branches, geocode, orders, payments)
        ──► Server Actions under /admin (each checks role + validates + writes audit log)
                     │
                     ▼
        src/lib/services/*  ──►  src/lib/pricing.ts (pure)  ──►  Drizzle  ──►  Postgres / PGlite
```

### Pricing is server-authoritative

`src/lib/pricing.ts#quote()` is a pure function that takes a catalogue snapshot for one branch (prices after branch overrides, availability, stock), the cart lines, the branch's operating settings, the delivery distance and the active discounts. It returns priced lines, blockers and totals. The cart drawer, cart page, checkout totals and order creation all call it with data loaded on the server; the browser never sends a price.

### Placing an order (`src/lib/services/orders.ts#placeOrder`)

1. Return the existing order if the idempotency key was already used (double-submits, retries).
2. Re-load the cart, branch, catalogue and discounts; recompute the quote. Any blocker aborts.
3. In one transaction: conditionally decrement tracked stock (`stock_qty >= qty`, so concurrent checkouts can't oversell), consume the discount (respecting `usage_limit`), insert the order, line snapshots, status history, payment and delivery rows, clear the cart, write the audit log.
4. A unique-key race on the idempotency key returns the winning order.

Order lines keep the product name, size, options, unit price and quantity at the time of purchase, so later menu edits never rewrite history.

### Branch recommendation (`src/lib/services/branches.ts#rankBranches`)

Sorts by great-circle distance (labelled "straight line" in the UI — never "driving distance"), then recommends the nearest branch that can take the order *now*: active, not temporarily closed, taking online orders, open by its published hours, offering the requested fulfilment, and able to make every item in the cart. Approximate pins are labelled; delivery requires an exact pin.

### Opening hours

Stored per weekday in Asia/Dhaka time (UTC+6, no DST), intervals may cross midnight. Unknown hours mean "not taking online orders" rather than "open".

## Data model

26 tables (see `src/lib/db/schema.ts`, migration in `drizzle/`):

- Catalogue: `product_categories`, `products`, `product_images` (with source, usage rights, low-res flag), `product_variants`
- Branches: `branches`, `branch_products` (offered/not), `branch_inventory` (price override, stock)
- Customers: `customers`, `customer_sessions`, `customer_addresses`
- Carts: `carts`, `cart_items`
- Orders: `orders`, `order_items`, `order_status_history`, `payments`, `deliveries`
- Marketing & content: `promotions`, `discount_rules`, `announcements`, `site_settings`, `content_pages`, `newsletter_subscribers`
- Admin: `admin_users`, `admin_sessions`, `audit_logs`

Money is integer **paisa** everywhere (`৳180` = `18000`).

## Security

- Admin pages call `requireAdminPage(permission)`; every server action and admin API calls `requireAdmin(permission)`. Roles: owner, manager, branch_staff. Branch staff are scoped to their own branch in queries *and* in every mutation.
- Cookies: httpOnly, SameSite=Lax, Secure in production. Session tokens are stored hashed.
- State-changing JSON APIs check `Origin`; server actions have Next.js' built-in origin check.
- Rate limits on checkout, login, order lookup, geocoding and quotes (in-memory — use Redis/Upstash with multiple instances).
- SSLCommerz callbacks are never trusted: a server-to-server validation call checks status, transaction id, amount and currency before an order is marked paid; settlement is idempotent.
- Uploaded images are re-encoded with sharp (strips metadata, rejects non-images). Links entered by staff must be https.
- Guest orders are visible only with the access link, to the signed-in owner, to the browser that placed them, or by order number + matching phone.
- Customer location is used in the browser and for ranking requests; it is not stored unless used as a delivery address.

## 3D system (`src/components/three/`)

- Procedural models (`models.tsx`): tapered cup with transmission glass + condensation normal map, brown-sugar "tiger" liquid, boba pearls, ice, CHAJOY print; soft-serve swirl surface; sundae; fruit garnish. Textures are drawn on canvas at runtime (`textures.ts`) — no model downloads.
- `SceneGate` mounts a scene only near the viewport, pauses it off-screen, honours `prefers-reduced-motion`, falls back to real photos without WebGL / in Lite mode / on weak devices.
- The hero uses two canvases with the headline between them; the back layer is CSS-blurred for a cheap depth-of-field that keeps transparency.
- Every 3D view is labelled "3D illustration". Products can point at an official `.glb` instead (Admin → Products).
