// Address / area / landmark search for the branch finder and delivery pin.
// Default provider: OpenStreetMap Nominatim (free, attribution required,
// max ~1 request/second, must send an identifying User-Agent). For heavier
// traffic point GEOCODER_URL at a commercial Nominatim-compatible service.

export type GeoResult = { label: string; lat: number; lng: number };

const g = globalThis as unknown as { __geoCache?: Map<string, { at: number; data: GeoResult[] }>; __geoLast?: number };
const cache = (g.__geoCache ??= new Map());
const TTL = 24 * 3600_000;

/** Looks up an address or landmark and returns matching places, using a short-lived cache. */
export async function geocode(query: string): Promise<GeoResult[]> {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 120);
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  // Respect the provider's 1 req/s policy across this process.
  const wait = (g.__geoLast ?? 0) + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  g.__geoLast = Date.now();

  const base = process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org";
  const url = new URL("/search", base);
  url.search = new URLSearchParams({
    q: /dhaka|bangladesh/i.test(q) ? q : `${q}, Dhaka`,
    format: "jsonv2",
    limit: "6",
    countrycodes: "bd",
    addressdetails: "0",
    "accept-language": "en",
  }).toString();
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.GEOCODER_USER_AGENT ?? "CHAJOY-BD-website/1.0 (+https://chajoybd.odoo.com)",
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  const data = rows.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) })).filter((r) => Number.isFinite(r.lat));
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return data;
}
