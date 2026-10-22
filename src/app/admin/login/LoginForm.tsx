/** Staff sign-in form. */

"use client";

import { ActionForm, SubmitButton } from "@/components/admin/ui";
import { loginAction } from "@/lib/admin/auth-actions";

/** Email and password form bound to the login action. */
export function LoginForm() {
  return (
    <ActionForm action={loginAction} className="rounded-4xl bg-cream-50 p-6 shadow-lift">
      <div className="space-y-4">
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" className="input" autoComplete="username" required />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input name="password" type="password" className="input" autoComplete="current-password" required />
        </label>
        <SubmitButton className="w-full">Sign in</SubmitButton>
      </div>
    </ActionForm>
  );
}
