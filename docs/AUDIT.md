# Audit of the existing CHAJOY BD website

Audited 19–20 October 2026. Source: https://chajoybd.odoo.com/ and the files it links to. Only publicly accessible pages were read; nothing behind a login was accessed.

## What the Odoo site contains

| Page | Status | Content |
|---|---|---|
| `/` | live | Hero "Every Sip Brings Joy", brand copy, 6 photos, footer |
| `/our-franchises` | live | Branch names with a photo each |
| `/contactus` | live | Contact form; the "Need help?" and "Come Visit Us" sections are unedited Odoo template text (San Francisco directions) |
| `/privacy` | live | Title only, no policy text |
| `/shop`, `/shop/category`, `/blog`, `/event` | **404** | The eCommerce app is not installed/published |

`sitemap.xml` lists only `/`, `/contactus`, `/our-franchises`, `/privacy`.

**Conclusion: the Odoo site has no products, prices, stock or orders to integrate with.** The catalogue came from the official menu board linked in its footer (below).

## Verified business information

| Item | Value | Source |
|---|---|---|
| Brand | CHAJOY / ChaJoy — "Ice cream and tea", Bangla "চা জয়", 冰淇淋·茶饮 | logo, signage photos |
| Tagline | "Every Sip Brings Joy" | homepage hero |
| Slogans | "Follow my cone to joy · Scoop joy sip cha", "CHAJOY一下", "Natural fruit flavor", "So sweet and fruity", "Your Happy Hour Every Hour", "Share Cha. Share Joy" | menu board, Bonasree signage |
| Phone | +880 1339-536491 | header & footer text |
| Email | bdchajoy@gmail.com | header & footer |
| Facebook | facebook.com/profile.php?id=61585587403077 | footer |
| Instagram | instagram.com/chajoy_bangladesh | footer |
| Head office pin | 23.812325, 90.410592 | footer "Head Office" Google Maps link |
| About text | "ChaJoy is a fast-growing international tea, ice cream, and dessert brand…" (3 paragraphs) | homepage |

## Catalogue (official menu board)

Linked as **Menu** in the footer: Google Drive file `1FAgV_3NyDgFCKpUxPo9F25BUy_ZSAxX7` (JPEG, 2048×1118). A copy is in `data/source/official-menu-2026.jpg`. Cross-checked against the "Matcha new product" poster on the homepage (matcha ice cream ৳80, matcha strawberry sundae ৳200, matcha brown sugar boba sundae ৳250 — all consistent).

26 products + 5 toppings, transcribed into `data/catalogue.json`:

| Category | Products (price ৳) |
|---|---|
| Milk tea (cold/hot) | Boba Milk Tea S120/M180 · Classic Milk Tea S110/M150 · Coconut Jelly Milk Tea S110/M160 · Strawberry Bobo Milk Tea S130/M180 |
| Fruit tea (L) | Lemon Green Tea 100 · Fresh Iced Lemon Water 80 · Jasmine Green Tea 100 · Lemon Black Tea 100 · Guava Iced Lemon Green Tea 210 · Shaken Peach Black Tea 240 · Blueberry Fruit Granule Green Tea 220 · Strawberry and Lemon Tea 230 · Jasmine Peach Green Tea 240 |
| Milkshakes | Strawberry Shake S100/M150 · Matcha Oreo Shake M180 · Chocolate Oreo Shaking S120/M180 · Peach Shake S100/M150 · Blueberry Shake S100/M150 · Guava Shake S100/M150 |
| Ice cream | Ice Cream (original/matcha) 80 |
| Sundaes (S, original/matcha) | Strawberry 200 · Blueberry 200 · Peach 200 · Brown Sugar Boba 250 · Chocolate Oreo Crumb 250 · Guava Crispy Cone Crumb 250 |
| Toppings | Brown Pearl, Pudding, Coconut Jelly, Crystal Ball, Crispy Crushed Cone — 30 each |

Cup sizes from the menu's "CUP Type" panel: S 370 ml, M 500 ml, L 700 ml. Sugar levels 50/75/100 %. Ice levels less/normal.

Menu-board typos kept out of product names but noted in descriptions: "Stawberry Shake Milkshake", "Guava Crispy Cone Cruma Sundae".

### Product photos

Each product's photo is cropped from the official menu board (`scripts/menu-images/extract_menu_images.py`, boxes in `data/source/menu-crops.json`). They are genuine CHAJOY images but **low resolution** (the source shows each product at ~50–160 px). Every one is flagged `isLowRes` in the database and in Admin → Products until CHAJOY uploads original photography.

## Branches

From `/our-franchises` (each photo is followed by its branch name, so the mapping is certain):

| Branch | Street address | Source of address |
|---|---|---|
| Mohammadpur | Pervin Plaza, Tajmahal Road, Krishi Market | text printed on the branch photo |
| Rampura | Bayyinah Ideal School, DIT Road | text printed on the branch photo |
| Badda | — not published | |
| Bonasree | House 1, Block F, Road 4, Banasree | text printed on the branch photo |
| Kochukhet | — not published | |
| Mirpur 10 | — not published | |

**Not published anywhere:** exact pins, branch phone numbers, opening hours, delivery areas, delivery fees, minimum order, preparation/delivery times.

Map pins are **approximate area locations** geocoded from OpenStreetMap (© OpenStreetMap contributors, ODbL) and are labelled "approximate" on the site. Delivery is impossible until a branch has an exact, confirmed pin.

## Problems found on the current Odoo site

- Phone links use the Odoo placeholder `tel:+1 555-555-5556` while displaying the real number.
- Header social icons point to `facebook.com/your-page` / `instagram.com/your-page` placeholders.
- `/contactus` still shows Odoo's template FAQ and San Francisco directions.
- `/our-franchises` lists `hello@chajoybd.com`, which differs from the email used everywhere else — needs confirmation.
- `/privacy` has no content.

## Needs verification by CHAJOY

See [REQUIRED-FROM-OWNER.md](REQUIRED-FROM-OWNER.md). The admin dashboard's **Launch checklist** tracks the same items live.
