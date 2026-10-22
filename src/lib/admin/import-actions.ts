/** Server action for CSV imports of products, branches and branch inventory. */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asActor } from "@/lib/auth/admin";
import { audit } from "@/lib/audit";
import { runImport, type ImportReport } from "@/lib/csv-import";
import { HttpError } from "@/lib/errors";
import { run, bool, str } from "./run";

export type ImportResult = ({ ok: boolean; message: string; fields?: Record<string, string> } & { report?: ImportReport }) | null;

/** Validates an uploaded CSV and either previews the changes or applies them, depending on the form. */
export async function importCsvAction(_p: ImportResult, fd: FormData): Promise<ImportResult> {
  let report: ImportReport | undefined;
  const r = await run("imports.manage", async (admin, ip) => {
    const kind = z.enum(["products", "branches", "inventory"]).parse(str(fd, "kind"));
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new HttpError(422, "Choose a CSV file.");
    if (file.size > 2 * 1024 * 1024) throw new HttpError(413, "CSV files must be under 2 MB.");
    const apply = bool(fd, "apply");
    report = await runImport(kind, await file.text(), { apply });
    if (report.errors.length) return { ok: false, message: `${report.errors.length} problem(s) found — nothing was imported.` };
    if (!apply) return `Preview OK: ${report.rows} row(s) — ${report.created} new, ${report.updated} update(s). Tick “Apply” and upload again to import.`;
    await audit(asActor(admin), { action: `import.${kind}`, entityType: "import", entityId: file.name.slice(0, 80), summary: `Imported ${report.rows} ${kind} row(s): ${report.created} new, ${report.updated} updated`, ip });
    revalidatePath("/", "layout");
    return `Imported ${report.rows} row(s): ${report.created} new, ${report.updated} updated.`;
  });
  return { ...(r ?? { ok: false, message: "Import failed." }), report };
}
