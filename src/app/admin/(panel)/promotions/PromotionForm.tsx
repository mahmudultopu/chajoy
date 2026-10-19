"use client";

import { ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/ui";
import { deletePromotion, savePromotion } from "@/lib/admin/content-actions";

export type PromoInput = {
  id: number;
  title: string;
  description: string | null;
  terms: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  rule: { code: string | null; kind: "percent" | "fixed"; value: number; minSubtotalPaisa: number; maxDiscountPaisa: number | null; branchIds: number[] | null; fulfilment: "any" | "pickup" | "delivery"; usageLimit: number | null; usedCount: number } | null;
};

export function PromotionForm({ p, branches }: { p: PromoInput | null; branches: { id: number; name: string }[] }) {
  const r = p?.rule;
  return (
    <div className="space-y-4">
      <ActionForm action={savePromotion} className="card space-y-4 p-5">
        {p && <input type="hidden" name="id" value={p.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <input name="title" defaultValue={p?.title} className="input" required />
          </Field>
          <Field label="Short description" className="sm:col-span-2">
            <input name="description" defaultValue={p?.description ?? ""} className="input" />
          </Field>
          <Field label="Starts (Dhaka)">
            <input name="startsAt" type="date" defaultValue={p?.startsAt} className="input" required />
          </Field>
          <Field label="Ends (Dhaka, inclusive)">
            <input name="endsAt" type="date" defaultValue={p?.endsAt} className="input" required />
          </Field>
        </div>
        <Field label="Terms shown to customers">
          <textarea name="terms" defaultValue={p?.terms} className="input min-h-24" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Discount type">
            <select name="kind" defaultValue={r?.kind ?? "percent"} className="input">
              <option value="percent">Percent off</option>
              <option value="fixed">Taka off</option>
            </select>
          </Field>
          <Field label="Amount" hint="Percent (e.g. 10) or taka (e.g. 50)">
            <input name="value" defaultValue={r ? (r.kind === "percent" ? r.value / 100 : r.value / 100) : ""} className="input" inputMode="decimal" required />
          </Field>
          <Field label="Code (blank = automatic)">
            <input name="code" defaultValue={r?.code ?? ""} className="input uppercase" />
          </Field>
          <Field label="Minimum order (৳)">
            <input name="minSubtotal" defaultValue={r ? r.minSubtotalPaisa / 100 : ""} className="input" inputMode="decimal" />
          </Field>
          <Field label="Max discount (৳)">
            <input name="maxDiscount" defaultValue={r?.maxDiscountPaisa != null ? r.maxDiscountPaisa / 100 : ""} className="input" inputMode="decimal" />
          </Field>
          <Field label="Use limit (orders)" hint={r ? `Used ${r.usedCount} time(s)` : undefined}>
            <input name="usageLimit" defaultValue={r?.usageLimit ?? ""} className="input" inputMode="numeric" />
          </Field>
          <Field label="Order type">
            <select name="fulfilment" defaultValue={r?.fulfilment ?? "any"} className="input">
              <option value="any">Pickup and delivery</option>
              <option value="pickup">Pickup only</option>
              <option value="delivery">Delivery only</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="label">Branches (none ticked = all branches)</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {branches.map((b) => (
              <label key={b.id} className="flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2 text-sm">
                <input type="checkbox" name="branchIds" value={b.id} defaultChecked={r?.branchIds?.includes(b.id)} className="size-4 accent-forest-800" /> {b.name}
              </label>
            ))}
          </div>
        </div>
        <Toggle name="isActive" defaultChecked={p?.isActive ?? false} label="Active" hint="Only active promotions inside their dates are shown or applied." />
        <SubmitButton>{p ? "Save promotion" : "Create promotion"}</SubmitButton>
      </ActionForm>
      {p && (
        <ActionForm action={deletePromotion}>
          <input type="hidden" name="id" value={p.id} />
          <SubmitButton variant="danger" confirm="Delete this promotion? If orders used it, it's switched off instead.">
            Delete promotion
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
