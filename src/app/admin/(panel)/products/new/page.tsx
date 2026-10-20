import Link from "next/link";
import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { ProductDetailsForm } from "../ProductEditor";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireAdminPage("products.manage");
  const categories = await db.select().from(schema.productCategories).orderBy(schema.productCategories.sortOrder);
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/products" className="text-sm text-forest-900/60 hover:text-forest-900">
        ← Products
      </Link>
      <h1 className="font-display text-4xl text-forest-900">New product</h1>
      <p className="text-sm text-forest-900/60">New products start unavailable at every branch until you switch them on.</p>
      <ProductDetailsForm product={null} categories={categories} />
    </div>
  );
}
