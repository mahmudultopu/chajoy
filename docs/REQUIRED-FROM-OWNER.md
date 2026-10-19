# What CHAJOY still needs to provide

Everything below was not published anywhere public, so the site ships with it **empty or switched off** rather than guessed. Each item can be entered in the admin (or by CSV import) — no code changes needed.

## Business details (Admin → Branches)

For each of the 6 branches:

- [ ] Exact map pin (latitude/longitude), then set precision to **exact**
- [ ] Street address for Badda, Kochukhet, Mirpur 10 (and confirm the other three)
- [ ] Branch phone number
- [ ] Opening hours for each day
- [ ] Whether it takes online orders, pickup and/or delivery
- [ ] Delivery radius (km), delivery fee, minimum order — only if it delivers
- [ ] Typical preparation time (optional) and delivery time (only if you can stand behind it)
- [ ] Which menu items it actually sells, and any branch-specific prices (Admin → Branches → menu table, or the inventory CSV)

Also confirm which email is current: `bdchajoy@gmail.com` (used site-wide) or `hello@chajoybd.com` (on the franchise page).

## Menu (Admin → Products)

- [ ] Original, high-resolution photos of every product (the current ones are cropped from the menu board)
- [ ] Ingredients and allergen information (shown to customers only when marked verified)
- [ ] Which drinks accept sugar/ice choices and toppings (seeded: milk tea and fruit tea)
- [ ] Whether menu prices include VAT (seeded: the menu price is the final price)
- [ ] Optional official 3D model files (.glb) — the site uses clearly-labelled 3D illustrations meanwhile

## Policies (Admin → Content)

Drafts exist for privacy, terms, delivery and refunds. Replace every "[To be confirmed by CHAJOY]" — ideally reviewed by a lawyer — then publish.

## Accounts & credentials

| Service | Needed for | What to send / set |
|---|---|---|
| **SSLCommerz** merchant account | Online payment (bKash, Nagad, Rocket, cards) | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`; test in sandbox first, then `SSLCOMMERZ_SANDBOX=false` |
| Direct bKash / Nagad merchant APIs | Only if you prefer them to SSLCommerz | Merchant app keys; an adapter would need to be added (not built) |
| **PostgreSQL** (Supabase / Neon) | Production database | `DATABASE_URL` |
| **Object storage** (Supabase Storage) | Admin image uploads on serverless hosting | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, bucket name |
| Map tiles / geocoding provider | Production map traffic (OSM's free servers are for light use) | Tile URL + key, Nominatim-compatible geocoder URL |
| Email provider (e.g. Resend, SES) | Order emails, newsletter sending | Not built yet — the newsletter form only stores consented addresses |
| SMS provider (e.g. SSL Wireless, Twilio) | Phone OTP sign-in, SMS order updates | Not built — phone sign-in is not offered |
| Delivery provider (Pathao, RedX, Paperfly…) | Courier dispatch & live tracking | Not built — staff can record a rider or a courier tracking link per order |
| Domain + hosting | Going live | e.g. Vercel project + `NEXT_PUBLIC_SITE_URL` |

## Decisions to confirm

- Cancellation and refund rules (who can cancel, until when, how refunds are paid)
- Whether cash on delivery is offered (switched off by default; Admin → Settings)
- Staff accounts and roles (Admin → Settings): owner, managers, and one branch-staff login per branch
