import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdminPage, can } from "@/lib/auth/admin";
import { logoutAction } from "@/lib/admin/auth-actions";
import { getBranchById } from "@/lib/services/branches";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · CHAJOY Admin" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage("dashboard.view");
  const branch = admin.branchScope ? await getBranchById(admin.branchScope) : null;
  const items = [
    { href: "/admin", label: "Dashboard", icon: "gauge" },
    { href: "/admin/orders", label: "Orders", icon: "receipt", show: can(admin, "orders.view") },
    { href: "/admin/products", label: "Products", icon: "cup", show: can(admin, "products.manage") },
    { href: "/admin/branches", label: admin.branchScope ? "My branch" : "Branches", icon: "store", show: can(admin, "inventory.manage") },
    { href: "/admin/promotions", label: "Promotions", icon: "tag", show: can(admin, "promotions.manage") },
    { href: "/admin/content", label: "Content", icon: "megaphone", show: can(admin, "content.manage") },
    { href: "/admin/imports", label: "Import / export", icon: "upload", show: can(admin, "imports.manage") },
    { href: "/admin/settings", label: "Settings", icon: "settings", show: can(admin, "settings.manage") || can(admin, "users.manage") },
    { href: "/admin/audit", label: "Audit log", icon: "history", show: can(admin, "audit.view") },
  ].filter((i) => i.show !== false);

  return (
    <div className="min-h-screen bg-cream-100 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-forest-900/10 bg-forest-950 text-cream-50 lg:sticky lg:top-0 lg:h-screen lg:border-0">
        <div className="flex items-center justify-between gap-3 p-4 lg:p-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/images/brand/chajoy-logo.webp" alt="" width={36} height={36} className="rounded-full" />
            <span className="font-display text-lg">CHAJOY Admin</span>
          </Link>
          <Link href="/" className="text-xs text-cream-50/60 hover:text-cream-50 lg:hidden">
            View site
          </Link>
        </div>
        <AdminNav items={items} />
        <div className="hidden border-t border-white/10 p-5 text-sm lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="font-semibold">{admin.name}</p>
          <p className="text-xs text-cream-50/60">
            {admin.role.replace("_", " ")}
            {branch ? ` · ${branch.name}` : ""}
          </p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/" className="text-cream-50/70 hover:text-cream-50">
              View site
            </Link>
            <Link href="/admin/account" className="text-cream-50/70 hover:text-cream-50">
              Password
            </Link>
            <form action={logoutAction}>
              <button className="text-cream-50/70 hover:text-cream-50">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
