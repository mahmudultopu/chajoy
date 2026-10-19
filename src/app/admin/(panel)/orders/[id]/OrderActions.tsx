"use client";

import { ActionForm, SubmitButton, Field } from "@/components/admin/ui";
import { addOrderNote, cashCollected, updateDelivery, updateOrderStatus } from "@/lib/admin/order-actions";

type Delivery = { method: string; providerName: string | null; riderName: string | null; riderPhone: string | null; trackingRef: string | null; trackingUrl: string | null; status: string };

export function OrderActions({
  orderId,
  transitions,
  isCod,
  paymentPending,
  canCollect,
  delivery,
}: {
  orderId: number;
  transitions: { value: string; label: string }[];
  isCod: boolean;
  paymentPending: boolean;
  canCollect: boolean;
  delivery: Delivery | null;
}) {
  return (
    <>
      <section className="card p-5">
        <h2 className="font-semibold text-forest-900">Update status</h2>
        {transitions.length === 0 ? (
          <p className="mt-2 text-sm text-forest-900/60">This order is finished — no further status changes.</p>
        ) : (
          <ActionForm action={updateOrderStatus} className="mt-3 space-y-3">
            <input type="hidden" name="orderId" value={orderId} />
            <Field label="Move to">
              <select name="status" className="input py-2.5" defaultValue={transitions.find((t) => t.value !== "cancelled")?.value}>
                {transitions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note (optional)" hint="Saved in the order history; shown to staff only.">
              <input name="note" className="input py-2.5" maxLength={300} />
            </Field>
            {isCod && paymentPending && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="cashCollected" className="size-4 accent-forest-800" /> Cash collected (when completing the order)
              </label>
            )}
            <SubmitButton className="w-full">Update order</SubmitButton>
          </ActionForm>
        )}
        {canCollect && (
          <ActionForm action={cashCollected} className="mt-3">
            <input type="hidden" name="orderId" value={orderId} />
            <SubmitButton variant="ghost" className="w-full" confirm="Confirm you've received the cash for this order?">
              Mark cash as collected
            </SubmitButton>
          </ActionForm>
        )}
      </section>

      {delivery && (
        <section className="card p-5">
          <h2 className="font-semibold text-forest-900">Delivery · {delivery.status.replace("_", " ")}</h2>
          <ActionForm action={updateDelivery} className="mt-3 space-y-3">
            <input type="hidden" name="orderId" value={orderId} />
            <Field label="Method">
              <select name="method" defaultValue={delivery.method} className="input py-2.5">
                <option value="manual">Manual dispatch by branch</option>
                <option value="in_house">In-house rider</option>
                <option value="provider">Delivery provider</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rider name">
                <input name="riderName" defaultValue={delivery.riderName ?? ""} className="input py-2.5" />
              </Field>
              <Field label="Rider phone">
                <input name="riderPhone" defaultValue={delivery.riderPhone ?? ""} className="input py-2.5" />
              </Field>
            </div>
            <Field label="Provider (if any)">
              <input name="providerName" defaultValue={delivery.providerName ?? ""} className="input py-2.5" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tracking ref">
                <input name="trackingRef" defaultValue={delivery.trackingRef ?? ""} className="input py-2.5" />
              </Field>
              <Field label="Tracking link" hint="Only from a real courier.">
                <input name="trackingUrl" defaultValue={delivery.trackingUrl ?? ""} className="input py-2.5" placeholder="https://…" />
              </Field>
            </div>
            <SubmitButton variant="ghost" className="w-full">
              Save delivery details
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-semibold text-forest-900">Add a note</h2>
        <ActionForm action={addOrderNote} className="mt-3 space-y-3" resetOnSuccess>
          <input type="hidden" name="orderId" value={orderId} />
          <textarea name="note" className="input min-h-20" maxLength={500} required />
          <SubmitButton variant="ghost" className="w-full">
            Add note
          </SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
