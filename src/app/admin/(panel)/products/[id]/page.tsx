import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { BranchAvailabilityForm, ImagesForm, ProductDetailsForm, VariantsForm } from "../ProductEditor";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdminPage("products.manage");
  const id = Number((await params).id);
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: true, images: true } });
  if (!p) notFound();
  const [categories, branches, bps] = await Promise.all([
    db.select().from(schema.productCategories).orderBy(schema.productCategories.sortOrder),
    db.select().from(schema.branches).orderBy(schema.branches.name),
    db.select().from(schema.branchProducts).where(eq(schema.branchProducts.productId, id)),
  ]);
  const created = (await searchParams).created;
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-forest-900/60 hover:text-forest-900">
        ← Products
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-forest-900">{p.name}</h1>
        <Link href={`/products/${p.slug}`} target="_blank" className="btn-ghost py-2.5">
          View on site
        </Link>
      </div>
      {created && <p className="rounded-2xl bg-matcha-100 px-4 py-3 text-sm">Product created. Add its sizes and prices, a photo, and choose which branches sell it.</p>}
      <VariantsForm productId={p.id} variants={p.variants.sort((a, b) => a.sortOrder - b.sortOrder)} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <ProductDetailsForm product={p} categories={categories} />
        <BranchAvailabilityForm productId={p.id} branches={branches.map((b) => ({ id: b.id, name: b.name, available: bps.some((x) => x.branchId === b.id && x.isAvailable) }))} />
      </div>
      <ImagesForm productId={p.id} images={p.images.sort((a, b) => a.sortOrder - b.sortOrder)} />
    </div>
  );
}
