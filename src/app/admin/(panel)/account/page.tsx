/** Admin: change your password. */

import { requireAdminPage } from "@/lib/auth/admin";
import { PasswordForm } from "./PasswordForm";

/** Page title and search-engine settings. */
export const metadata = { title: "Your password" };

/** Renders the password form for the signed-in admin. */
export default async function AdminAccount() {
  const admin = await requireAdminPage("dashboard.view");
  return (
    <div className="max-w-md space-y-6">
      <h1 className="font-display text-4xl text-forest-900">Your password</h1>
      <p className="text-sm text-forest-900/60">Signed in as {admin.email}.</p>
      <PasswordForm />
    </div>
  );
}
