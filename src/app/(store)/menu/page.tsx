import type { Metadata } from "next";
import { MenuView, type MenuSearchParams } from "@/components/menu/MenuView";

export const metadata: Metadata = {
  title: "Menu",
  description: "The full CHAJOY menu: boba milk tea, fruit teas, milkshakes, matcha ice cream and sundaes, with prices in taka.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage({ searchParams }: { searchParams: Promise<MenuSearchParams> }) {
  return <MenuView category={null} searchParams={await searchParams} />;
}
