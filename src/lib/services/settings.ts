import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// Every default here is verified from chajoybd.odoo.com (see docs/AUDIT.md),
// except the payment switches, which stay off until the owner turns them on.
export type SiteSettings = {
  contact: { phone: string; phoneHref: string; email: string };
  social: { facebook: string; instagram: string };
  headOffice: { label: string; latitude: number; longitude: number; mapsUrl: string };
  hero: { eyebrow: string; headline: string; headlineAccent: string; subhead: string };
  story: { title: string; paragraphs: string[] };
  payments: { codEnabled: boolean; sslcommerzEnabled: boolean };
  seo: { title: string; description: string };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  contact: { phone: "+880 1339-536491", phoneHref: "tel:+8801339536491", email: "bdchajoy@gmail.com" },
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61585587403077",
    instagram: "https://www.instagram.com/chajoy_bangladesh/",
  },
  headOffice: {
    label: "CHAJOY head office",
    latitude: 23.812325,
    longitude: 90.410592,
    mapsUrl: "https://maps.app.goo.gl/KCmUEE4FjutAgCwS8",
  },
  hero: {
    eyebrow: "Ice cream & tea · চা জয়",
    headline: "Every Sip",
    headlineAccent: "Brings Joy.",
    subhead:
      "Discover your favourite CHAJOY drinks, explore nearby branches, and get your next refreshing moment delivered to your door.",
  },
  story: {
    title: "Premium quality at an affordable price",
    paragraphs: [
      "ChaJoy is a fast-growing international tea, ice cream, and dessert brand committed to delivering premium quality at an affordable price. Inspired by modern Asian flavors, we offer a wide range of milk teas, fruit teas, ice creams, and signature desserts made with carefully selected ingredients.",
      "At CHAJOY, we combine premium ingredients and modern preparation techniques to create beverages, ice creams and desserts that deliver a unique taste experience. Every product is carefully developed to ensure consistent quality, freshness, and customer satisfaction.",
      "Our mission is to create joyful moments through exceptional taste, innovative products, and outstanding customer service. With a strong focus on quality, consistency, and innovation, ChaJoy continues to expand across Bangladesh while providing an unforgettable experience in every cup and every bite.",
    ],
  },
  payments: { codEnabled: false, sslcommerzEnabled: false },
  seo: {
    title: "CHAJOY BD — Ice Cream & Tea",
    description:
      "Order CHAJOY milk tea, fruit tea, milkshakes, ice cream and sundaes in Dhaka. Find your nearest CHAJOY branch.",
  },
};

export type SettingKey = keyof SiteSettings;

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(schema.siteSettings);
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const r of rows) {
    if (r.key in out && r.value && typeof r.value === "object") {
      out[r.key] = { ...(out[r.key] as object), ...(r.value as object) };
    }
  }
  return out as SiteSettings;
}

export async function setSetting<K extends SettingKey>(key: K, value: SiteSettings[K]) {
  await db
    .insert(schema.siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value, updatedAt: new Date() } });
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SiteSettings[K]> {
  const [row] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, key));
  return { ...DEFAULT_SETTINGS[key], ...((row?.value as object) ?? {}) } as SiteSettings[K];
}
