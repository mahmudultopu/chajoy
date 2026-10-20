import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdminPage, can } from "@/lib/auth/admin";
import { BranchForm, BranchMenuForm } from "../BranchEditor";

export const metadata = { title: "Branch" };

export default async function BranchAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const admin = await requireAdminPage("inventory.manage");
  const id = Number((await params).id);
  if (admin.branchScope && admin.branchScope !== id) notFound();
  const [b] = await db.select().from(schema.branches).where(eq(schema.branches.id, id));
  if (!b) notFound();
  const [products, bps, inv] = await Promise.all([
    db.query.products.findMany({ with: { category: true, variants: true }, orderBy: (p, { asc }) => [asc(p.sortOrder)] }),
    db.select().from(schema.branchProducts).where(eq(schema.branchProducts.branchId, id)),
    db.select().from(schema.branchInventory).where(eq(schema.branchInventory.branchId, id)),
  ]);
  const rows = products
    .filter((p) => p.status !== "inactive")
    .map((p) => ({
      productId: p.id,
      name: p.name,
      category: p.category.name,
      available: bps.some((x) => x.productId === p.id && x.isAvailable),
      variants: p.variants
        .filter((v) => v.isActive)
        .sort((a, c) => a.sortOrder - c.sortOrder)
        .map((v) => {
          const i = inv.find((x) => x.variantId === v.id);
          return { id: v.id, sizeCode: v.sizeCode, menuPricePaisa: v.pricePaisa, pricePaisa: i?.pricePaisa ?? null, trackStock: i?.trackStock ?? false, stockQty: i?.stockQty ?? null };
        }),
    }));
  const created = (await searchParams).created;
  return (
    <div className="space-y-6">
      {!admin.branchScope && (
        <Link href="/admin/branches" className="text-sm text-forest-900/60 hover:text-forest-900">
          ← Branches
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-forest-900">{b.name}</h1>
        <Link href={`/branches/${b.slug}`} target="_blank" className="btn-ghost py-2.5">
          View on site
        </Link>
      </div>
      {created && <p className="rounded-2xl bg-matcha-100 px-4 py-3 text-sm">Branch created. Its menu starts empty — switch on what it sells below.</p>}
      {b.verification.notes && <p className="rounded-2xl bg-cream-200 px-4 py-3 text-sm text-forest-900/80">Verification notes: {b.verification.notes}</p>}
      {can(admin, "branches.manage") && <BranchForm b={b} />}
      <BranchMenuForm branchId={b.id} rows={rows} canPrice={can(admin, "branches.manage")} />
    </div>
  );
}
