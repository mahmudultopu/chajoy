/** CSV import form with a preview step. */

"use client";

import { useActionState } from "react";
import { CircleCheck, Download, TriangleAlert } from "lucide-react";
import { SubmitButton } from "@/components/admin/ui";
import { importCsvAction, type ImportResult } from "@/lib/admin/import-actions";

/** Uploads a CSV, shows the preview report and applies it. */
export function ImportForm({ templates }: { templates: Record<string, string[]> }) {
  const [state, run] = useActionState<ImportResult, FormData>(importCsvAction, null);
  return (
    <div className="space-y-4">
      <form action={run} className="card space-y-4 p-5">
        <h2 className="font-semibold text-forest-900">Import a CSV</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">What&apos;s in the file</span>
            <select name="kind" className="input">
              <option value="products">Products & prices</option>
              <option value="branches">Branches</option>
              <option value="inventory">Branch menu, prices & stock</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">CSV file (UTF-8)</span>
            <input type="file" name="file" accept=".csv,text/csv" required className="block py-2 text-sm" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="apply" className="size-4 accent-forest-800" /> Apply changes (leave unticked to preview first)
        </label>
        <SubmitButton>Upload</SubmitButton>
      </form>
      {state && (
        <div className={`rounded-3xl p-5 ${state.ok ? "bg-matcha-100" : "bg-berry-500/10"}`} role="status">
          <p className="flex items-center gap-2 font-semibold">
            {state.ok ? <CircleCheck className="size-5" /> : <TriangleAlert className="size-5 text-berry-600" />} {state.message}
          </p>
          {state.fields && (
            <ul className="mt-2 text-sm">
              {Object.entries(state.fields).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          )}
          {state.report && state.report.errors.length > 0 && (
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-forest-900/60">
                  <th className="w-20 py-1">Row</th>
                  <th className="py-1">Problem</th>
                </tr>
              </thead>
              <tbody>
                {state.report.errors.slice(0, 200).map((e, i) => (
                  <tr key={i} className="border-t border-forest-900/10">
                    <td className="py-1 tabular-nums">{e.row}</td>
                    <td className="py-1">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <div className="card p-5">
        <h2 className="font-semibold text-forest-900">Columns</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {Object.entries(templates).map(([k, cols]) => (
            <li key={k}>
              <span className="font-semibold">{k}:</span> <code className="break-all text-xs">{cols.join(",")}</code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-forest-900/60">
          Prices are in taka (e.g. 180). Booleans accept yes/no. Opening hours look like <code>mon=10:00-23:00; fri=closed</code>. Exports below use the same columns, so the easiest way to edit in bulk is export → edit → import.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(templates).map((k) => (
            <a key={k} href={`/api/admin/export/${k}.csv`} className="btn-ghost py-2.5">
              <Download className="size-4" /> Export {k}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
