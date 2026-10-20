import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/admin";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center bg-forest-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 text-cream-50">
          <Image src="/images/brand/chajoy-logo.webp" alt="" width={48} height={48} className="rounded-full" />
          <div>
            <p className="font-display text-xl">CHAJOY Admin</p>
            <p className="text-sm text-cream-50/60">Staff only</p>
          </div>
        </div>
        <LoginForm />
        <p className="mt-4 text-center text-xs text-cream-50/45">First admin? Create one with <code>npm run admin:create</code>.</p>
      </div>
    </main>
  );
}
