"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, MapPin, Menu, Search, ShoppingBag, User, X } from "lucide-react";
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
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target as HTMLElement)?.closest("input,textarea"))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [setSearchOpen]);

  const link = (href: string) =>
    clsx("rounded-full px-3.5 py-2 text-sm font-semibold transition", pathname === href ? "bg-matcha-100 text-forest-900" : "text-forest-900/80 hover:bg-white hover:text-forest-900");

  return (
    <header className={clsx("sticky top-0 z-40 transition-[background,box-shadow]", scrolled ? "bg-cream-50/85 shadow-soft backdrop-blur-xl" : "bg-cream-100/70 backdrop-blur-md")}>
      <div className="container-x flex h-[68px] items-center gap-3">
        <button className="grid size-10 place-items-center rounded-full ring-1 ring-forest-900/10 lg:hidden" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </button>
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          <Link href="/" className={link("/")}>
            Home
          </Link>
          <div className="relative" onMouseLeave={() => setMenuOpen(false)}>
            <button
              className={clsx(link("/menu"), "inline-flex items-center gap-1")}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((v) => !v)}
              onMouseEnter={() => setMenuOpen(true)}
            >
              Menu <ChevronDown className={clsx("size-4 transition", menuOpen && "rotate-180")} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full pt-2">
                <div className="grid w-[520px] grid-cols-2 gap-1 rounded-4xl bg-white p-3 shadow-lift ring-1 ring-forest-900/5">
                  <Link href="/menu" className="col-span-2 rounded-2xl bg-forest-900 px-4 py-3 text-cream-50 hover:bg-forest-800">
                    <span className="font-display text-lg font-semibold">Shop the full menu</span>
                    <span className="block text-xs text-cream-50/70">Everything on the CHAJOY menu board</span>
                  </Link>
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/menu/${c.slug}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-matcha-50">
                      <span className="relative size-11 overflow-hidden rounded-xl bg-matcha-50">
                        {c.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image} alt="" className="menu-photo size-full object-contain" />
                        )}
                      </span>
                      <span className="text-sm font-semibold text-forest-900">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/offers" className={link("/offers")}>
            Offers
          </Link>
          <Link href="/branches" className={link("/branches")}>
            Find a branch
          </Link>
          <Link href="/about" className={link("/about")}>
            Our story
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setBranchPickerOpen(true)}
            className="hidden max-w-[220px] items-center gap-2 rounded-full bg-white px-3.5 py-2 text-left text-sm ring-1 ring-forest-900/10 hover:ring-matcha-400 md:flex"
          >
            <MapPin className="size-4 shrink-0 text-matcha-600" />
            <span className="truncate">
              {branch ? (
                <>
                  <span className="text-forest-900/55">From </span>
                  <strong className="text-forest-900">{branch.area}</strong>
                </>
              ) : (
                <strong className="text-forest-900">Choose branch</strong>
              )}
            </span>
          </button>
          <button onClick={() => setSearchOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-white" aria-label="Search the menu">
            <Search className="size-5" />
          </button>
          <Link href="/account" className="hidden size-10 place-items-center rounded-full hover:bg-white sm:grid" aria-label="Account">
            <User className="size-5" />
          </Link>
          <button
            onClick={() => setCartOpen(true)}
            className="relative inline-flex h-10 items-center gap-2 rounded-full bg-forest-900 pl-3.5 pr-4 text-sm font-semibold text-cream-50 hover:bg-forest-800"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          >
            <ShoppingBag className="size-[18px]" />
            <span className="tabular-nums" aria-hidden>
              {itemCount}
            </span>
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-forest-950/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-cream-50 p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <Logo />
              <button className="grid size-10 place-items-center rounded-full ring-1 ring-forest-900/10" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <button
              onClick={() => {
                setMobileOpen(false);
                setBranchPickerOpen(true);
              }}
              className="mt-5 flex items-center gap-2 rounded-2xl bg-matcha-100 px-4 py-3 text-left text-sm"
            >
              <MapPin className="size-4 text-matcha-700" />
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
                ["/branches", "Find a branch"],
                ["/about", "Our story"],
                ["/track", "Track an order"],
                ["/account", "Account"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className={clsx("rounded-2xl px-4 py-3 font-display text-lg font-semibold", pathname === href ? "bg-white text-forest-900" : "text-forest-900/85")}>
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
  if (!itemCount || pathname.startsWith("/checkout") || pathname.startsWith("/cart")) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-30 sm:hidden">
      <button onClick={() => setCartOpen(true)} className="flex w-full items-center justify-between rounded-full bg-forest-900 px-5 py-3.5 text-cream-50 shadow-lift">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingBag className="size-5" /> {itemCount} item{itemCount === 1 ? "" : "s"}
          {branch ? <span className="font-normal text-cream-50/70">· {branch.area}</span> : null}
        </span>
        <span className="text-sm font-bold text-matcha-300">View cart</span>
      </button>
    </div>
  );
}
