/** Admin forms for a branch's details and its menu. */

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/ui";
import { saveBranch, saveBranchMenu } from "@/lib/admin/branch-actions";
import { DAYS, DAY_LABELS } from "@/lib/hours";
import type { OpeningHours, Verification } from "@/lib/db/schema";

const BranchMap = dynamic(() => import("@/components/branches/BranchMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full rounded-none" /> });

type B = {
  id: number;
  name: string;
  slug: string;
  area: string;
  addressLine: string | null;
  city: string;
  addressVerified: boolean;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: "exact" | "approximate" | "unknown";
  locationSource: string | null;
  phone: string | null;
  openingHours: OpeningHours | null;
  temporarilyClosed: boolean;
  closureNote: string | null;
  isActive: boolean;
  acceptsOnlineOrders: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeePaisa: number | null;
  deliveryRadiusKm: number | null;
  deliveryAreas: string[] | null;
  minOrderPaisa: number | null;
  prepTimeMinutes: number | null;
  deliveryTimeMinutes: number | null;
  isSampleConfig: boolean;
  verification: Verification;
};

/** Edits branch details, location, hours and fulfilment settings. */
export function BranchForm({ b }: { b: B | null }) {
  const [lat, setLat] = useState(b?.latitude?.toString() ?? "");
  const [lng, setLng] = useState(b?.longitude?.toString() ?? "");
  const pin = lat && lng && Number.isFinite(+lat) && Number.isFinite(+lng) ? { lat: +lat, lng: +lng } : null;
  return (
    <ActionForm action={saveBranch} className="space-y-6">
      {b && <input type="hidden" name="id" value={b.id} />}
      {b?.isSampleConfig && (
        <p className="rounded-2xl bg-lemon-300/50 px-4 py-3 text-sm">This branch uses <strong>sample</strong> hours/delivery settings from <code>db:demo-ops</code>. Saving this form replaces them with what you enter.</p>
      )}
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-forest-900">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" defaultValue={b?.name} className="input" required />
          </Field>
          <Field label="URL slug">
            <input name="slug" defaultValue={b?.slug} className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </Field>
          <Field label="Area">
            <input name="area" defaultValue={b?.area} className="input" required />
          </Field>
          <Field label="City">
            <input name="city" defaultValue={b?.city ?? "Dhaka"} className="input" />
          </Field>
          <Field label="Street address" className="sm:col-span-2">
            <input name="addressLine" defaultValue={b?.addressLine ?? ""} className="input" />
          </Field>
          <Field label="Branch phone">
            <input name="phone" defaultValue={b?.phone ?? ""} className="input" placeholder="+880…" />
          </Field>
          <div className="space-y-2 pt-6">
            <Toggle name="addressVerified" defaultChecked={b?.addressVerified} label="Address confirmed by CHAJOY" />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-forest-900">Map pin</h2>
        <p className="text-sm text-forest-900/60">Click the map to place the pin, or type coordinates. Only mark it “exact” once someone has confirmed the shop&apos;s actual position.</p>
        <div className="h-72 overflow-hidden rounded-3xl ring-1 ring-forest-900/10">
          <BranchMap
            branches={pin && b ? [{ id: b.id, name: b.name, latitude: pin.lat, longitude: pin.lng, approximate: b.locationPrecision !== "exact" }] : []}
            pickPoint={!b ? pin : null}
            onPick={(p) => {
              setLat(p.lat.toFixed(6));
              setLng(p.lng.toFixed(6));
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Latitude">
            <input name="latitude" value={lat} onChange={(e) => setLat(e.target.value)} className="input" inputMode="decimal" />
          </Field>
          <Field label="Longitude">
            <input name="longitude" value={lng} onChange={(e) => setLng(e.target.value)} className="input" inputMode="decimal" />
          </Field>
          <Field label="Pin precision">
            <select name="locationPrecision" defaultValue={b?.locationPrecision ?? "approximate"} className="input">
              <option value="exact">Exact (confirmed)</option>
              <option value="approximate">Approximate (area only)</option>
            </select>
          </Field>
        </div>
        <Field label="Where the pin came from">
          <input name="locationSource" defaultValue={b?.locationSource ?? ""} className="input" />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-forest-900">Opening hours (Asia/Dhaka)</h2>
        <p className="text-sm text-forest-900/60">Leave a day blank if unknown. A closing time earlier than opening means after midnight (e.g. 16:00–01:00).</p>
        <div className="grid gap-2">
          {DAYS.map((d) => {
            const h = b?.openingHours?.[d];
            return (
              <div key={d} className="grid grid-cols-[110px_1fr_1fr_auto] items-center gap-2">
                <span className="text-sm font-semibold">{DAY_LABELS[d]}</span>
                <input name={`hours.${d}.open`} type="time" defaultValue={h?.[0]?.[0] ?? ""} className="input py-2" aria-label={`${DAY_LABELS[d]} opens`} />
                <input name={`hours.${d}.close`} type="time" defaultValue={h?.[0]?.[1] ?? ""} className="input py-2" aria-label={`${DAY_LABELS[d]} closes`} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name={`hours.${d}.closed`} defaultChecked={h?.length === 0} className="accent-forest-800" /> closed
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-forest-900">Ordering & delivery</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle name="isActive" defaultChecked={b?.isActive ?? true} label="Branch listed on the website" />
          <Toggle name="temporarilyClosed" defaultChecked={b?.temporarilyClosed} label="Temporarily closed" />
          <Toggle name="acceptsOnlineOrders" defaultChecked={b?.acceptsOnlineOrders} label="Takes online orders" hint="Needs opening hours." />
          <Toggle name="pickupEnabled" defaultChecked={b?.pickupEnabled} label="Pickup" />
          <Toggle name="deliveryEnabled" defaultChecked={b?.deliveryEnabled} label="Delivery" hint="Needs an exact pin, fee and radius." />
        </div>
        <Field label="Closure note (shown when temporarily closed)">
          <input name="closureNote" defaultValue={b?.closureNote ?? ""} className="input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Delivery fee (৳)">
            <input name="deliveryFee" defaultValue={b?.deliveryFeePaisa != null ? b.deliveryFeePaisa / 100 : ""} className="input" inputMode="decimal" />
          </Field>
          <Field label="Delivery radius (km)" hint="Straight-line distance from the pin.">
            <input name="deliveryRadiusKm" defaultValue={b?.deliveryRadiusKm ?? ""} className="input" inputMode="decimal" />
          </Field>
          <Field label="Minimum order (৳)">
            <input name="minOrder" defaultValue={b?.minOrderPaisa != null ? b.minOrderPaisa / 100 : ""} className="input" inputMode="decimal" />
          </Field>
          <Field label="Typical prep time (min)">
            <input name="prepTimeMinutes" defaultValue={b?.prepTimeMinutes ?? ""} className="input" inputMode="numeric" />
          </Field>
          <Field label="Typical delivery time (min)" hint="Only if you can stand behind it.">
            <input name="deliveryTimeMinutes" defaultValue={b?.deliveryTimeMinutes ?? ""} className="input" inputMode="numeric" />
          </Field>
          <Field label="Areas served (comma-separated)">
            <input name="deliveryAreas" defaultValue={b?.deliveryAreas?.join(", ") ?? ""} className="input" />
          </Field>
        </div>
        <div className="rounded-2xl bg-cream-100 p-4">
          <Toggle name="verified" defaultChecked={b?.verification.status === "verified"} label="All details on this page are confirmed by CHAJOY" />
          <Field label="Verification notes" className="mt-3">
            <input name="verificationNotes" defaultValue={b?.verification.notes ?? ""} className="input py-2.5" />
          </Field>
        </div>
      </section>
      <SubmitButton className="px-8">{b ? "Save branch" : "Create branch"}</SubmitButton>
    </ActionForm>
  );
}

type MenuRow = {
  productId: number;
  name: string;
  category: string;
  available: boolean;
  variants: { id: number; sizeCode: string; menuPricePaisa: number; pricePaisa: number | null; trackStock: boolean; stockQty: number | null }[];
};

/** Sets per-branch availability, price overrides and stock notes. */
export function BranchMenuForm({ branchId, rows, canPrice }: { branchId: number; rows: MenuRow[]; canPrice: boolean }) {
  return (
    <ActionForm action={saveBranchMenu} className="card p-5">
      <input type="hidden" name="branchId" value={branchId} />
      <h2 className="font-semibold text-forest-900">Branch menu, prices & stock</h2>
      <p className="text-sm text-forest-900/60">
        Leave a price empty to use the menu price. Turn on stock tracking only for items with countable stock; tracked items sell out at 0.
        {!canPrice && " Your role can change availability and stock; prices are set by managers."}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-forest-900/55">
            <tr>
              <th className="py-2">Available</th>
              <th className="py-2">Product</th>
              <th className="py-2">Size</th>
              <th className="py-2">Menu ৳</th>
              <th className="py-2">Branch ৳</th>
              <th className="py-2">Track stock</th>
              <th className="py-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              r.variants.map((v, i) => (
                <tr key={v.id} className={i === r.variants.length - 1 ? "border-b border-forest-900/10" : ""}>
                  <td className="py-2">
                    {i === 0 && (
                      <>
                        <input type="hidden" name="product" value={r.productId} />
                        <input type="checkbox" name={`p.${r.productId}.available`} defaultChecked={r.available} aria-label={`${r.name} available`} className="size-4 accent-forest-800" />
                      </>
                    )}
                  </td>
                  <td className="py-2">
                    {i === 0 && (
                      <>
                        <span className="font-semibold">{r.name}</span>
                        <span className="block text-xs text-forest-900/55">{r.category}</span>
                      </>
                    )}
                  </td>
                  <td className="py-2">
                    <input type="hidden" name="variant" value={v.id} />
                    {v.sizeCode}
                  </td>
                  <td className="py-2 tabular-nums text-forest-900/60">{v.menuPricePaisa / 100}</td>
                  <td className="py-2">
                    <input
                      name={`v.${v.id}.price`}
                      defaultValue={v.pricePaisa != null ? v.pricePaisa / 100 : ""}
                      disabled={!canPrice}
                      className="input w-24 py-1.5"
                      inputMode="decimal"
                      aria-label={`${r.name} ${v.sizeCode} branch price`}
                    />
                  </td>
                  <td className="py-2">
                    <input type="checkbox" name={`v.${v.id}.track`} defaultChecked={v.trackStock} aria-label="Track stock" className="size-4 accent-forest-800" />
                  </td>
                  <td className="py-2">
                    <input name={`v.${v.id}.qty`} defaultValue={v.stockQty ?? ""} className="input w-20 py-1.5" inputMode="numeric" aria-label={`${r.name} ${v.sizeCode} stock`} />
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <SubmitButton className="mt-4">Save branch menu</SubmitButton>
    </ActionForm>
  );
}
