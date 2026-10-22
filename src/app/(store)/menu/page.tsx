/** Full menu page. */

import type { Metadata } from "next";
import { MenuView, type MenuSearchParams } from "@/components/menu/MenuView";

/** Page title and search-engine settings. */
export const metadata: Metadata = {
  title: "Menu",
  description: "The full CHAJOY menu: boba milk tea, fruit teas, milkshakes, matcha ice cream and sundaes, with prices in taka.",
  alternates: { canonical: "/menu" },
};

/** Renders the full menu with filters. */
export default async function MenuPage({ searchParams }: { searchParams: Promise<MenuSearchParams> }) {
  return <MenuView category={null} searchParams={await searchParams} />;
}
