# Running the shop: products, prices, branches, stock and orders

Sign in at **/admin**. What you can see depends on your role:

| Role | Can do |
|---|---|
| Owner | Everything, including payments and staff accounts |
| Manager | Products, branches, prices, stock, orders, promotions, content, imports, audit log |
| Branch staff | Orders and stock/availability for their own branch only |

Every change is recorded in **Audit log** with who did it and when.

## Products

**Admin → Products → (product)**

- **Sizes & prices** — the menu price for each size in taka. Removing a size that has been ordered before hides it instead of deleting it.
- **Details** — name, 中文 menu name, category, description, status:
  - *Active* — on sale
  - *Temporarily unavailable* — shown but can't be ordered anywhere
  - *Inactive* — hidden
- **Customer choices** — cold/hot, original/matcha, sugar, ice, toppings.
- **Ingredients / Allergens** — only shown to customers when "Verified by CHAJOY" is ticked.
- **Available at** — which branches sell it. New products start unavailable everywhere.
- **Images** — upload JPEG/PNG/WebP/AVIF up to 8 MB; it's converted to WebP. Pick *Official CHAJOY photo* for real photography, set the flavour if it shows only original or matcha, and record the source and usage rights. Lower "Order" numbers show first. Delete the low-res menu-board crops once you have originals (re-running the seed would re-add them, so prefer giving your photos a lower order number).

**Toppings** are products in the *Toppings* category; their price is the add-on price.

**Categories:** Admin → Products → Categories.

## Branches

**Admin → Branches → (branch)**

1. **Map pin** — click the map or type coordinates. Choose *Exact* only once someone has confirmed the shop's position. Delivery can't be switched on with an approximate pin.
2. **Opening hours** — per day, Dhaka time. A closing time earlier than opening (16:00 → 01:00) means after midnight. Without hours, the branch can't take online orders.
3. **Ordering & delivery** — online orders, pickup, delivery (needs fee + radius), minimum order, prep/delivery times.
4. **Temporarily closed** — hides the branch from ordering immediately; add a closure note.

Saving the form clears the *sample settings* flag left by `npm run db:demo-ops`.

### Branch menu, prices & stock

At the bottom of each branch page:

- **Available** — whether this branch sells the product at all.
- **Branch ৳** — an optional price for this branch; leave empty to use the menu price.
- **Track stock / Stock** — for countable items only. Tracked items are sold out at 0, are decremented when an order is placed, and are put back if the order is cancelled before preparation. Items at or below 5 show on the dashboard's inventory alerts.

Branch staff can change availability and stock for their branch; prices need a manager.

## Bulk edits with CSV

**Admin → Import / export.** Export a file, edit it in Excel/Sheets, save as CSV (UTF-8), upload with *Apply* unticked to preview, then upload again with *Apply* ticked. If any row has a problem nothing is imported and you get the row numbers.

| File | Columns |
|---|---|
| products | `slug,name,name_zh,category,size,size_label,volume_ml,price_bdt,status,featured,description` (one row per size) |
| branches | `slug,name,area,address_line,city,latitude,longitude,location_precision,phone,opening_hours,is_active` |
| inventory | `branch_slug,product_slug,size,available,price_bdt,track_stock,stock_qty` |

Opening hours in CSV: `mon=10:00-23:00; tue=10:00-23:00; fri=closed`.

## Orders

**Admin → Orders.** New orders arrive as *Waiting for the branch to confirm*, also listed on the dashboard.

1. Check the payment line. For *Pay online*, don't start until it says **Paid online**.
2. Move the order forward: Confirmed → Being prepared → Ready → (Out for delivery → Delivered) or (Collected). Only valid next steps are offered.
3. For cash orders, tick **Cash collected** when completing, or use **Mark cash as collected**.
4. For delivery, record the rider or courier. Add a tracking link only if a real courier provides one — customers see it on their order page.
5. **Cancel** from any step before completion. **Refund** is only offered when money was actually received; process the money itself in SSLCommerz or by cash, then record it here.

Customers follow their order on its page (it refreshes automatically) or via **Track an order** with their order number and phone.

## Promotions & announcements

- **Admin → Promotions** — percent or taka off, optional code (blank = applied automatically), minimum order, cap, branches, pickup/delivery only, usage limit, dates. Only one discount applies per order. Customers only see promotions that are active *and* inside their dates.
- **Admin → Content** — the announcement bar (dates, optional link, optional branch), homepage hero text, contact details, social links, the "Our story" text, and the policy pages (draft/published).

## Payments

**Admin → Settings** (owner): switch cash and online payment on or off. Online payment can only be enabled once SSLCommerz credentials are in the server environment. Start with `SSLCOMMERZ_SANDBOX=true` and place test orders before going live.

## Staff accounts

**Admin → Settings → Staff accounts** (owner): add people with a role; a temporary password is shown once. Deactivating someone signs them out immediately. Everyone can change their own password under *Password* in the sidebar.

The very first owner is created from the command line: `npm run admin:create -- --email you@example.com --name "Your Name"`.
