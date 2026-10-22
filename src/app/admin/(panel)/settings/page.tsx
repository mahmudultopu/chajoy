/** Admin: settings and staff accounts. */

import { db, schema } from "@/lib/db";
import { requireAdminPage, can } from "@/lib/auth/admin";
import { getSettings } from "@/lib/services/settings";
import { listBranches } from "@/lib/services/branches";
import { isSslcommerzConfigured } from "@/lib/payments/sslcommerz";
import { PaymentsForm, UserForm } from "./SettingsForms";

/** Page title and search-engine settings. */
export const metadata = { title: "Settings" };

/** Payment settings and users (owners only). */
export default async function SettingsAdmin() {
  const admin = await requireAdminPage("dashboard.view");
  const [settings, users, branches] = await Promise.all([getSettings(), db.select().from(schema.adminUsers).orderBy(schema.adminUsers.name), listBranches()]);
  const b = branches.map((x) => ({ id: x.id, name: x.name }));
  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="font-display text-4xl text-forest-900">Settings</h1>
      {can(admin, "settings.manage") && (
        <PaymentsForm codEnabled={settings.payments.codEnabled} sslEnabled={settings.payments.sslcommerzEnabled} sslConfigured={isSslcommerzConfigured()} sandbox={process.env.SSLCOMMERZ_SANDBOX !== "false"} />
      )}
      {can(admin, "users.manage") && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold text-forest-900">Staff accounts</h2>
          <p className="text-sm text-forest-900/60">New users get a one-time temporary password shown after saving. Deactivating a user signs them out immediately.</p>
          {users.map((u) => (
            <UserForm
              key={u.id}
              u={{ ...u, lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }) : null }}
              branches={b}
            />
          ))}
          <UserForm u={null} branches={b} />
        </section>
      )}
    </div>
  );
}
