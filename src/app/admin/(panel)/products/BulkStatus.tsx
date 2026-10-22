/** Bulk status change for selected products. */

"use client";

import { ActionForm, SubmitButton } from "@/components/admin/ui";
import { bulkProductStatus } from "@/lib/admin/product-actions";

/** Form wrapper with the bulk status controls. */
export function BulkStatus({ children }: { children: React.ReactNode }) {
  return (
    <ActionForm action={bulkProductStatus}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-forest-900/60">With selected:</span>
        <select name="status" className="input w-auto py-2" defaultValue="unavailable">
          <option value="active">Set active</option>
          <option value="unavailable">Mark temporarily unavailable</option>
          <option value="inactive">Hide (inactive)</option>
        </select>
        <SubmitButton variant="ghost">Apply</SubmitButton>
      </div>
      {children}
    </ActionForm>
  );
}
