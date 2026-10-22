/** Form for an admin to change their own password. */

"use client";

import { ActionForm, Field, SubmitButton } from "@/components/admin/ui";
import { changeOwnPassword } from "@/lib/admin/content-actions";

/** New password and confirmation fields. */
export function PasswordForm() {
  return (
    <ActionForm action={changeOwnPassword} className="card space-y-4 p-5" resetOnSuccess>
      <Field label="New password" hint="At least 12 characters.">
        <input name="password" type="password" className="input" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field label="Confirm">
        <input name="confirm" type="password" className="input" autoComplete="new-password" required />
      </Field>
      <SubmitButton>Change password</SubmitButton>
    </ActionForm>
  );
}
