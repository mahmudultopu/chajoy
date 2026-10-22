/** API: menu search suggestions. */

import { loadCatalog, searchMenu } from "@/lib/services/catalog";
import { selectedBranchId } from "@/lib/request";
import { handle, json, limit } from "@/lib/http";
import { formatBDT } from "@/lib/money";

/** Always run per request: the response depends on cookies or the query. */
export const dynamic = "force-dynamic";

/** Returns the best matches for `q`. */
export const GET = handle(async (req: Request) => {
  limit(req, "suggest", 120, 60_000);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) return json({ items: [] });
  const all = await loadCatalog(await selectedBranchId());
  const { items, total } = await searchMenu(all, { q, pageSize: 6 });
  return json({
    total,
    items: items.slice(0, 6).map((p) => ({
      slug: p.slug,
      name: p.name,
      nameZh: p.nameZh,
      category: p.category.name,
      image: p.image?.url ?? null,
      price: formatBDT(p.fromPricePaisa),
      multiplePrices: new Set(p.variants.map((v) => v.pricePaisa)).size > 1,
      availability: p.availability,
    })),
  });
});
