import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { db, schema } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import { Badge } from "@/components/admin/Badge";
import { BulkStatus } from "./BulkStatus";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  await requireAdminPage("products.manage");
  const sp = await searchParams;
  const [products, categories, bps, branches] = await Promise.all([
    db.query.products.findMany({ with: { category: true, variants: true, images: true }, orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.id)] }),
    db.select().from(schema.productCategories).orderBy(schema.productCategories.sortOrder),
    db.select().from(schema.branchProducts),
    db.select().from(schema.branches),
  ]);
  const q = sp.q?.toLowerCase().trim();
  const list = products.filter((p) => (!sp.category || p.category.slug === sp.category) && (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q) || (p.nameZh ?? "").includes(q)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-forest-900">Products</h1>
        <div className="flex gap-2">
          <Link href="/admin/products/categories" className="btn-ghost py-2.5">
            Categories
          </Link>
          <Link href="/admin/products/new" className="btn-primary py-2.5">
            New product
          </Link>
        </div>
      </div>
      <form className="flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search products" className="input max-w-xs py-2" />
        <select name="category" defaultValue={sp.category ?? ""} className="input w-auto py-2">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn-ghost py-2">Filter</button>
      </form>
      <BulkStatus>
        <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-forest-900/5">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-forest-900/10 text-xs uppercase tracking-wide text-forest-900/55">
              <tr>
                <th className="w-8 px-4 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-2 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Prices</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Branches</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const img = p.images.sort((a, b) => a.sortOrder - b.sortOrder)[0];
                const at = bps.filter((b) => b.productId === p.id && b.isAvailable).length;
                return (
                  <tr key={p.id} className="border-b border-forest-900/5 hover:bg-cream-100">
                    <td className="px-4 py-2">
                      <input type="checkbox" name="id" value={p.id} aria-label={`Select ${p.name}`} className="size-4 accent-forest-800" />
                    </td>
                    <td className="px-2 py-2">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-cream-100">{img && <Image src={img.url} alt="" fill sizes="44px" className="menu-photo object-contain" />}</span>
                        <span>
                          <span className="font-semibold text-forest-900 hover:underline">{p.name}</span>
                          <span className="block text-xs text-forest-900/50">{p.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2">{p.category.name}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {p.variants
                        .filter((v) => v.isActive)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((v) => `${v.sizeCode === "ONE" ? "" : v.sizeCode + " "}${formatBDT(v.pricePaisa)}`)
                        .join(" · ")}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={p.status === "active" ? "green" : p.status === "unavailable" ? "yellow" : "grey"}>{p.status}</Badge>
                      {p.isFeatured && <Badge className="ml-1">featured</Badge>}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {at}/{branches.length}
                    </td>
                    <td className="space-x-1 px-4 py-2">
                      {p.verification.status === "verified" ? <Badge tone="green">verified</Badge> : <Badge tone="yellow">needs verification</Badge>}
                      {p.images.length > 0 && p.images.every((i) => i.isLowRes) && <Badge tone="yellow">low-res photo</Badge>}
                      {!p.allergensVerified && !p.isAddon && <Badge>no allergen info</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BulkStatus>
    </div>
  );
}
