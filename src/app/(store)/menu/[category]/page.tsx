/** Menu filtered to one category. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuView, type MenuSearchParams } from "@/components/menu/MenuView";
import { listCategories } from "@/lib/services/catalog";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<MenuSearchParams> };

/** Page title for the category. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const c = (await listCategories()).find((x) => x.slug === category && !x.isAddonCategory);
  if (!c) return { title: "Menu" };
  return { title: c.name, description: c.description ?? undefined, alternates: { canonical: `/menu/${c.slug}` } };
}

/** Renders the menu for one category. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const cats = await listCategories();
  if (!cats.some((c) => c.slug === category && !c.isAddonCategory)) notFound();
  return <MenuView category={category} searchParams={await searchParams} />;
}
