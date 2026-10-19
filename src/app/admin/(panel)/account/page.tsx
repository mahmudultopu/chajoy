import { requireAdminPage } from "@/lib/auth/admin";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Your password" };

export default async function AdminAccount() {
  const admin = await requireAdminPage("dashboard.view");
  return (
    <div className="max-w-md space-y-6">
      <h1 className="font-display text-4xl font-semibold text-forest-900">Your password</h1>
      <p className="text-sm text-forest-900/60">Signed in as {admin.email}.</p>
      <PasswordForm />
    </div>
  );
}
