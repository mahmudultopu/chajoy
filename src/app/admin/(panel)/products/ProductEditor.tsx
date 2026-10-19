"use client";

import Image from "next/image";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/ui";
import { saveProduct, saveVariants, setProductBranches, updateProductImage, uploadProductImage } from "@/lib/admin/product-actions";
import type { Model3d, ProductOptionConfig, Verification } from "@/lib/db/schema";

type P = {
  id: number;
  name: string;
  slug: string;
  nameZh: string | null;
  sku: string | null;
  categoryId: number;
  subcategory: string | null;
  description: string | null;
  status: "active" | "inactive" | "unavailable";
  sortOrder: number;
  isFeatured: boolean;
  optionConfig: ProductOptionConfig;
  ingredients: string | null;
  ingredientsVerified: boolean;
  allergens: string | null;
  allergensVerified: boolean;
  preparationNotes: string | null;
  model3d: Model3d | null;
  verification: Verification;
};

export function ProductDetailsForm({ product, categories }: { product: P | null; categories: { id: number; name: string }[] }) {
  const p = product;
  const [name, setName] = useState(p?.name ?? "");
  const [slug, setSlug] = useState(p?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!p);
  const auto = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <ActionForm action={saveProduct} className="card space-y-5 p-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <h2 className="font-semibold text-forest-900">Details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            name="name"
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(auto(e.target.value));
            }}
            required
          />
        </Field>
        <Field label="URL slug" hint={`/products/${slug || "…"}`}>
          <input
            name="slug"
            className="input"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
          />
        </Field>
        <Field label="Menu name (中文)">
          <input name="nameZh" defaultValue={p?.nameZh ?? ""} className="input" />
        </Field>
        <Field label="SKU (optional)">
          <input name="sku" defaultValue={p?.sku ?? ""} className="input" />
        </Field>
        <Field label="Category">
          <select name="categoryId" defaultValue={p?.categoryId} className="input" required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subcategory (optional)">
          <input name="subcategory" defaultValue={p?.subcategory ?? ""} className="input" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={p?.status ?? "active"} className="input">
            <option value="active">Active</option>
            <option value="unavailable">Temporarily unavailable</option>
            <option value="inactive">Inactive (hidden)</option>
          </select>
        </Field>
        <Field label="Sort order" hint="Lower numbers show first.">
          <input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="input" />
        </Field>
      </div>
      <Field label="Description" hint="Only state facts CHAJOY has confirmed.">
        <textarea name="description" defaultValue={p?.description ?? ""} className="input min-h-24" maxLength={2000} />
      </Field>
      <Toggle name="isFeatured" defaultChecked={p?.isFeatured} label="Featured on the homepage" />

      <div>
        <p className="label">Customer choices</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle name="opt_temperature" defaultChecked={!!p?.optionConfig.temperatures?.length} label="Cold or hot" />
          <Toggle name="opt_flavour" defaultChecked={!!p?.optionConfig.flavours?.length} label="Original or matcha" />
          <Toggle name="opt_sugar" defaultChecked={p?.optionConfig.sugar} label="Sugar level (50/75/100%)" />
          <Toggle name="opt_ice" defaultChecked={p?.optionConfig.ice} label="Ice level (less/normal)" />
          <Toggle name="opt_toppings" defaultChecked={p?.optionConfig.toppings} label="Toppings allowed" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Field label="Ingredients">
            <textarea name="ingredients" defaultValue={p?.ingredients ?? ""} className="input min-h-20" />
          </Field>
          <Toggle name="ingredientsVerified" defaultChecked={p?.ingredientsVerified} label="Verified by CHAJOY — show to customers" />
        </div>
        <div className="space-y-2">
          <Field label="Allergens">
            <textarea name="allergens" defaultValue={p?.allergens ?? ""} className="input min-h-20" placeholder="e.g. Contains milk" />
          </Field>
          <Toggle name="allergensVerified" defaultChecked={p?.allergensVerified} label="Verified by CHAJOY — show to customers" />
        </div>
      </div>
      <Field label="Preparation notes (staff)">
        <input name="preparationNotes" defaultValue={p?.preparationNotes ?? ""} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="3D model URL (.glb, optional)" hint={p?.model3d?.kind === "procedural" ? "Currently using the built-in 3D illustration." : "Leave empty to use the built-in illustration (if any)."}>
          <input name="model3dUrl" defaultValue={p?.model3d?.kind === "glb" ? p.model3d.url : ""} className="input" placeholder="https://…/model.glb" />
        </Field>
        <div className="pt-6">
          <Toggle name="model3dOfficial" defaultChecked={p?.model3d?.kind === "glb" && p.model3d.official} label="Official CHAJOY model" />
        </div>
      </div>
      <div className="rounded-2xl bg-cream-100 p-4">
        <Toggle name="verified" defaultChecked={p?.verification.status === "verified"} label="Name, sizes and prices verified" hint="Untick if anything here hasn't been confirmed by CHAJOY." />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Source">
            <input name="verificationSource" defaultValue={p?.verification.source ?? ""} className="input py-2.5" />
          </Field>
          <Field label="Verification notes">
            <input name="verificationNotes" defaultValue={p?.verification.notes ?? ""} className="input py-2.5" />
          </Field>
        </div>
      </div>
      <SubmitButton>{p ? "Save details" : "Create product"}</SubmitButton>
    </ActionForm>
  );
}

type V = { id: number; sizeCode: string; label: string; volumeMl: number | null; pricePaisa: number; isActive: boolean };

export function VariantsForm({ productId, variants }: { productId: number; variants: V[] }) {
  const [rows, setRows] = useState(variants.map((v) => `v${v.id}`));
  const byKey = Object.fromEntries(variants.map((v) => [`v${v.id}`, v]));
  return (
    <ActionForm action={saveVariants} className="card p-5">
      <input type="hidden" name="productId" value={productId} />
      <h2 className="font-semibold text-forest-900">Sizes & prices</h2>
      <p className="text-sm text-forest-900/60">Menu prices in taka. Branch-specific prices are set on each branch&apos;s menu.</p>
      <div className="mt-4 space-y-2">
        <div className="hidden grid-cols-[90px_minmax(0,1fr)_100px_120px_70px_70px] gap-2 px-1 text-xs font-semibold text-forest-900/55 sm:grid">
          <span>Size</span>
          <span>Label</span>
          <span>ml</span>
          <span>Price ৳</span>
          <span>On</span>
          <span>Remove</span>
        </div>
        {rows.map((r) => {
          const v = byKey[r];
          return (
            <div key={r} className="grid grid-cols-2 gap-2 rounded-2xl bg-cream-100 p-2 sm:grid-cols-[90px_minmax(0,1fr)_100px_120px_70px_70px] sm:items-center">
              <input type="hidden" name="row" value={r} />
              {v && <input type="hidden" name={`${r}.id`} value={v.id} />}
              <input name={`${r}.sizeCode`} defaultValue={v?.sizeCode ?? ""} placeholder="S / M / L" className="input py-2" aria-label="Size code" />
              <input name={`${r}.label`} defaultValue={v?.label ?? ""} placeholder="Small · 370 ml" className="input py-2" aria-label="Label" />
              <input name={`${r}.volumeMl`} defaultValue={v?.volumeMl ?? ""} inputMode="numeric" className="input py-2" aria-label="Volume ml" />
              <input name={`${r}.price`} defaultValue={v ? (v.pricePaisa / 100).toString() : ""} inputMode="decimal" className="input py-2" aria-label="Price in taka" required />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name={`${r}.isActive`} defaultChecked={v?.isActive ?? true} className="size-4 accent-forest-800" /> on
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name={`${r}.delete`} className="size-4 accent-berry-600" /> del
              </label>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setRows((r) => [...r, `n${Date.now()}`])} className="btn-ghost py-2.5">
          <Plus className="size-4" /> Add size
        </button>
        <SubmitButton>Save sizes & prices</SubmitButton>
      </div>
    </ActionForm>
  );
}

type Img = { id: number; url: string; alt: string; sortOrder: number; variantKey: string | null; sourceType: string; sourceUrl: string | null; sourceNote: string | null; usageRights: string | null; isLowRes: boolean };

export function ImagesForm({ productId, images }: { productId: number; images: Img[] }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-forest-900">Images</h2>
      <p className="text-sm text-forest-900/60">Use real CHAJOY photos only. Record where each photo came from and that CHAJOY may use it.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {images.map((i) => (
          <li key={i.id} className="rounded-2xl bg-cream-100 p-3">
            <div className="flex gap-3">
              <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white">
                <Image src={i.url} alt="" fill sizes="80px" className="menu-photo object-contain" />
              </span>
              <div className="min-w-0 text-xs text-forest-900/70">
                <p className="font-semibold text-forest-900">{i.sourceType.replace("_", " ")}</p>
                {i.variantKey && <p>{i.variantKey}</p>}
                {i.isLowRes && <p className="text-berry-600">Low resolution — replace with original photo</p>}
                {i.sourceNote && <p className="line-clamp-2">{i.sourceNote}</p>}
                {i.usageRights && <p className="line-clamp-2">Rights: {i.usageRights}</p>}
              </div>
            </div>
            <ActionForm action={updateProductImage} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="imageId" value={i.id} />
              <input name="alt" defaultValue={i.alt} className="input min-w-0 flex-1 py-1.5 text-xs" aria-label="Alt text" />
              <input name="sortOrder" defaultValue={i.sortOrder} className="input w-16 py-1.5 text-xs" aria-label="Order" />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name="delete" className="accent-berry-600" /> delete
              </label>
              <SubmitButton variant="ghost" className="px-3 py-1.5 text-xs">
                Save
              </SubmitButton>
            </ActionForm>
          </li>
        ))}
      </ul>
      <ActionForm action={uploadProductImage} className="mt-5 space-y-3 rounded-2xl border-2 border-dashed border-forest-900/15 p-4" resetOnSuccess>
        <input type="hidden" name="productId" value={productId} />
        <p className="text-sm font-semibold">Upload a photo</p>
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="block text-sm" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type">
            <select name="sourceType" className="input py-2">
              <option value="official_photo">Official CHAJOY photo</option>
              <option value="upload">Other photo (rights confirmed)</option>
              <option value="placeholder">Placeholder (clearly labelled)</option>
            </select>
          </Field>
          <Field label="Flavour photo">
            <select name="flavour" className="input py-2">
              <option value="">Any</option>
              <option value="original">Original</option>
              <option value="matcha">Matcha</option>
            </select>
          </Field>
          <Field label="Order">
            <input name="sortOrder" defaultValue="10" className="input py-2" />
          </Field>
        </div>
        <Field label="Alt text">
          <input name="alt" className="input py-2" placeholder="Describe the photo" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Source (URL or who supplied it)">
            <input name="sourceUrl" className="input py-2" />
          </Field>
          <Field label="Usage rights">
            <input name="usageRights" className="input py-2" placeholder="e.g. CHAJOY-owned, supplied by marketing" />
          </Field>
        </div>
        <input type="hidden" name="sourceNote" value="Uploaded in admin" />
        <SubmitButton>Upload</SubmitButton>
      </ActionForm>
    </section>
  );
}

export function BranchAvailabilityForm({ productId, branches }: { productId: number; branches: { id: number; name: string; available: boolean }[] }) {
  return (
    <ActionForm action={setProductBranches} className="card self-start p-5">
      <input type="hidden" name="productId" value={productId} />
      <h2 className="font-semibold text-forest-900">Available at</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {branches.map((b) => (
          <label key={b.id} className="flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2 text-sm">
            <input type="checkbox" name="branch" value={b.id} defaultChecked={b.available} className="size-4 accent-forest-800" /> {b.name}
          </label>
        ))}
      </div>
      <SubmitButton className="mt-3">Save availability</SubmitButton>
    </ActionForm>
  );
}
