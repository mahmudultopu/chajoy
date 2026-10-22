/** Storefront layout: announcement bar, header, footer, cart drawer and dialogs. */

import { StoreProvider } from "@/components/store/StoreProvider";
import { SiteHeader, MobileCartBar } from "@/components/store/SiteHeader";
import { SiteFooter } from "@/components/store/SiteFooter";
import { CartDrawer } from "@/components/store/CartDrawer";
import { BranchPickerDialog } from "@/components/store/BranchPickerDialog";
import { SearchDialog } from "@/components/store/SearchDialog";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Toaster } from "@/components/ui/Toaster";
import { getSettings } from "@/lib/services/settings";
import { listBranches } from "@/lib/services/branches";
import { listCategories, loadCatalog } from "@/lib/services/catalog";
import { liveAnnouncements } from "@/lib/services/promotions";
import { cartLines } from "@/lib/services/cart";
import { currentCart, selectedBranch } from "@/lib/request";

/** Wraps every storefront page with shared chrome and store state. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, branches, categories, catalog, branch, cart] = await Promise.all([
    getSettings(),
    listBranches(),
    listCategories(),
    loadCatalog(null),
    selectedBranch(),
    currentCart(),
  ]);
  const [announcements, lines] = await Promise.all([liveAnnouncements(new Date(), branch?.id ?? null), cart ? cartLines(cart.id) : Promise.resolve([])]);
  const sellable = categories.filter((c) => !c.isAddonCategory);
  const navCategories = sellable.map((c) => ({
    slug: c.slug,
    name: c.name,
    image: catalog.find((p) => p.category.slug === c.slug && p.image)?.image?.url ?? null,
  }));

  return (
    <StoreProvider
      initialBranch={branch ? { id: branch.id, name: branch.name, slug: branch.slug, area: branch.area } : null}
      initialCount={lines.reduce((s, l) => s + l.quantity, 0)}
    >
      <a href="#main" className="sr-only z-50 rounded-full bg-forest-900 px-4 py-2 text-cream-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <AnnouncementBar items={announcements} sampleMode={branches.some((b) => b.isSampleConfig)} />
      <SiteHeader categories={navCategories} />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} categories={sellable.map((c) => ({ slug: c.slug, name: c.name }))} branches={branches.map((b) => ({ slug: b.slug, name: b.name }))} />
      <CartDrawer />
      <BranchPickerDialog />
      <SearchDialog />
      <MobileCartBar />
      <Toaster />
    </StoreProvider>
  );
}
