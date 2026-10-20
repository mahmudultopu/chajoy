import Link from "next/link";
import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { CategoryForm } from "./CategoryForm";

export const metadata = { title: "Categories" };

export default async function Categories() {
  await requireAdminPage("products.manage");
  const cats = await db.select().from(schema.productCategories).orderBy(schema.productCategories.sortOrder);
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/products" className="text-sm text-forest-900/60 hover:text-forest-900">
        ← Products
      </Link>
      <h1 className="font-display text-4xl text-forest-900">Categories</h1>
      <div className="space-y-4">
        {cats.map((c) => (
          <CategoryForm key={c.id} c={c} />
        ))}
        <CategoryForm c={null} />
      </div>
    </div>
  );
}
