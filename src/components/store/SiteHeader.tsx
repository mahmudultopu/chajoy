"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { ArrowRight, ChevronDown, MapPin, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useStore } from "./StoreProvider";

export type NavCategory = { slug: string; name: string; image: string | null };

export function SiteHeader({ categories }: { categories: NavCategory[] }) {
  const { itemCount, branch, setCartOpen, setBranchPickerOpen, setSearchOpen } = useStore();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target as HTMLElement)?.closest("input,textarea,select"))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [setSearchOpen]);

  const link = (href: string) => clsx("rounded-full px-3 py-2 text-[15px] font-medium text-ink/85 transition hover:text-ink", pathname === href && "text-ink underline decoration-pill decoration-[3px] underline-offset-[10px]");

  return (
    <header className={clsx("sticky top-0 z-40 bg-white transition-shadow", scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.12)]")}>
      <div className="mx-auto flex h-[74px] w-full max-w-[1240px] items-center gap-3 border-b border-black/[0.06] px-4 sm:px-6 lg:px-8">
        <button className="grid size-10 place-items-center rounded-full ring-1 ring-black/10 lg:hidden" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </button>
        <Logo />

        <nav className="ml-8 hidden items-center gap-2 lg:flex" aria-label="Main">
          <div className="relative" onMouseLeave={() => setMenuOpen(false)}>
            <button
              className={clsx(link("/menu"), "inline-flex items-center gap-1")}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((v) => !v)}
              onMouseEnter={() => setMenuOpen(true)}
            >
              Shop All <ChevronDown className={clsx("size-4 transition", menuOpen && "rotate-180")} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full pt-2">
                <div className="grid w-[520px] grid-cols-2 gap-1 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-black/5">
                  <Link href="/menu" className="col-span-2 flex items-center justify-between rounded-xl bg-pill px-4 py-3 text-ink hover:bg-pill-dark">
                    <span className="font-display text-lg">The full menu</span>
                    <ArrowRight className="size-4" />
                  </Link>
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/menu/${c.slug}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-cream-100">
                      <span className="relative size-11 overflow-hidden rounded-lg bg-cream-100">
                        {c.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image} alt="" className="size-full object-cover" />
                        )}
                      </span>
                      <span className="text-sm font-medium text-ink">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/menu/fruit-tea" className={link("/menu/fruit-tea")}>
            Flavours
          </Link>
          <Link href="/about" className={link("/about")}>
            About Us
          </Link>
          <Link href="/branches" className={link("/branches")}>
            Branches
          </Link>
          <Link href="/offers" className={link("/offers")}>
            Offers
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setBranchPickerOpen(true)} className="mr-1 hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink/70 hover:text-ink xl:flex" title="Choose the branch you order from">
            <MapPin className="size-4 text-matcha-600" />
            {branch ? branch.area : "Choose branch"}
          </button>
          <button onClick={() => setSearchOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-cream-100" aria-label="Search the menu">
            <Search className="size-[19px]" />
          </button>
          <Link href="/account" className="hidden size-10 place-items-center rounded-full hover:bg-cream-100 sm:grid" aria-label="Account">
            <User className="size-[19px]" />
          </Link>
          <button onClick={() => setCartOpen(true)} className="relative grid size-10 place-items-center rounded-full hover:bg-cream-100" aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}>
            <ShoppingBag className="size-[19px]" />
            {itemCount > 0 && (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-berry-500 px-1 text-[10px] font-bold leading-4 text-white" aria-hidden>
                {itemCount}
              </span>
            )}
          </button>
          <Link href="/menu" className="ml-2 hidden items-center gap-6 rounded-full bg-pill py-2.5 pl-5 pr-4 text-[15px] font-semibold text-ink transition hover:bg-pill-dark sm:inline-flex">
            Order Now <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <Logo />
              <button className="grid size-10 place-items-center rounded-full ring-1 ring-black/10" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <button
              onClick={() => {
                setMobileOpen(false);
                setBranchPickerOpen(true);
              }}
              className="mt-5 flex items-center gap-2 rounded-xl bg-pill px-4 py-3 text-left text-sm"
            >
              <MapPin className="size-4" />
              {branch ? (
                <span>
                  Ordering from <strong>{branch.name}</strong>
                </span>
              ) : (
                <strong>Choose your branch</strong>
              )}
            </button>
            <nav className="mt-4 flex flex-col" aria-label="Mobile">
              {[
                ["/", "Home"],
                ["/menu", "Shop all"],
                ...categories.map((c) => [`/menu/${c.slug}`, c.name]),
                ["/offers", "Offers"],
                ["/branches", "Branches"],
                ["/about", "About us"],
                ["/track", "Track an order"],
                ["/account", "Account"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className={clsx("rounded-xl px-4 py-3 font-display text-xl", pathname === href ? "bg-cream-100 text-ink" : "text-ink/85")}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

/** Sticky cart bar on phones once something is in the cart. */
export function MobileCartBar() {
  const { itemCount, setCartOpen, branch } = useStore();
  const pathname = usePathname();
  if (!itemCount || pathname.startsWith("/checkout") || pathname.startsWith("/cart") || pathname.startsWith("/products/")) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-30 sm:hidden">
      <button onClick={() => setCartOpen(true)} className="flex w-full items-center justify-between rounded-full bg-ink px-5 py-3.5 text-white shadow-lift">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingBag className="size-5" /> {itemCount} item{itemCount === 1 ? "" : "s"}
          {branch ? <span className="font-normal text-white/70">· {branch.area}</span> : null}
        </span>
        <span className="rounded-full bg-pill px-3 py-1 text-sm font-bold text-ink">View cart</span>
      </button>
    </div>
  );
}
