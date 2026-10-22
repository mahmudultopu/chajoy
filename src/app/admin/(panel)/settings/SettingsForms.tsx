/** Admin settings forms: payment methods and staff accounts. */

"use client";

import { ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/ui";
import { saveAdminUser, savePayments } from "@/lib/admin/content-actions";

/** Turns payment methods on or off. */
export function PaymentsForm({ codEnabled, sslEnabled, sslConfigured, sandbox }: { codEnabled: boolean; sslEnabled: boolean; sslConfigured: boolean; sandbox: boolean }) {
  return (
    <ActionForm action={savePayments} className="card space-y-3 p-5">
      <h2 className="font-semibold text-forest-900">Payments</h2>
      <Toggle name="codEnabled" defaultChecked={codEnabled} label="Cash on delivery / at pickup" hint="Orders stay “not yet collected” until staff mark the cash as received." />
      <Toggle
        name="sslcommerzEnabled"
        defaultChecked={sslEnabled}
        disabled={!sslConfigured}
        label="Online payment via SSLCommerz (bKash, Nagad, cards)"
        hint={sslConfigured ? `Credentials found (${sandbox ? "SANDBOX — test payments only" : "LIVE"}).` : "Add SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD to the server environment first."}
      />
      <SubmitButton>Save payment settings</SubmitButton>
    </ActionForm>
  );
}

type U = { id: number; email: string; name: string; role: string; branchId: number | null; isActive: boolean; lastLoginAt: string | null };

/** Creates or edits a staff account. */
export function UserForm({ u, branches }: { u: U | null; branches: { id: number; name: string }[] }) {
  return (
    <ActionForm action={saveAdminUser} className="rounded-2xl bg-cream-100 p-4" resetOnSuccess={!u}>
      {u && <input type="hidden" name="id" value={u.id} />}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Name">
          <input name="name" defaultValue={u?.name} className="input py-2" required />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={u?.email} className="input py-2" required />
        </Field>
        <Field label="Role">
          <select name="role" defaultValue={u?.role ?? "branch_staff"} className="input py-2">
            <option value="owner">Owner (everything)</option>
            <option value="manager">Manager (catalogue, branches, orders, content)</option>
            <option value="branch_staff">Branch staff (own branch orders & stock)</option>
          </select>
        </Field>
        <Field label="Branch (staff)">
          <select name="branchId" defaultValue={u?.branchId ?? ""} className="input py-2">
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {u && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={u.isActive} className="size-4 accent-forest-800" /> Active
          </label>
        )}
        {!u && <input type="hidden" name="isActive" value="on" />}
        <SubmitButton variant={u ? "ghost" : "primary"}>{u ? "Save" : "Create user"}</SubmitButton>
        {u?.lastLoginAt && <span className="text-xs text-forest-900/55">Last sign-in {u.lastLoginAt}</span>}
      </div>
    </ActionForm>
  );
}
