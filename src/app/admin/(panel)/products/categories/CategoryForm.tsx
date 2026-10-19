"use client";

import { ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/ui";
import { saveCategory } from "@/lib/admin/product-actions";

type C = { id: number; name: string; slug: string; menuName: string | null; description: string | null; accent: string | null; sortOrder: number; isActive: boolean; isAddonCategory: boolean };

export function CategoryForm({ c }: { c: C | null }) {
  return (
    <ActionForm action={saveCategory} className="card space-y-3 p-5" resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <p className="font-semibold text-forest-900">{c ? c.name : "New category"}</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Name">
          <input name="name" defaultValue={c?.name} className="input py-2" required />
        </Field>
        <Field label="Slug">
          <input name="slug" defaultValue={c?.slug} className="input py-2" required />
        </Field>
        <Field label="Menu name">
          <input name="menuName" defaultValue={c?.menuName ?? ""} className="input py-2" />
        </Field>
        <Field label="Accent / order">
          <span className="flex gap-2">
            <input name="accent" type="color" defaultValue={c?.accent ?? "#8db33a"} className="h-10 w-12 rounded-lg" aria-label="Accent colour" />
            <input name="sortOrder" defaultValue={c?.sortOrder ?? 0} className="input py-2" aria-label="Sort order" />
          </span>
        </Field>
      </div>
      <Field label="Description">
        <input name="description" defaultValue={c?.description ?? ""} className="input py-2" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        {c ? <Toggle name="isActive" defaultChecked={c.isActive} label="Visible on the site" /> : <Toggle name="isAddonCategory" label="Add-on category (toppings)" />}
        <SubmitButton>{c ? "Save" : "Add category"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
