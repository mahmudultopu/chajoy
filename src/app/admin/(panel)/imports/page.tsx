import { requireAdminPage } from "@/lib/auth/admin";
import { TEMPLATES } from "@/lib/csv-import";
import { ImportForm } from "./ImportForm";

export const metadata = { title: "Import / export" };

export default async function Imports() {
  await requireAdminPage("imports.manage");
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="font-display text-4xl text-forest-900">Import / export</h1>
      <p className="text-sm text-forest-900/65">
        Every file is checked in full before anything is saved. If any row has a problem, nothing is imported and you&apos;ll see the row numbers to fix. Imports are recorded in the audit log.
      </p>
      <ImportForm templates={TEMPLATES} />
    </div>
  );
}
