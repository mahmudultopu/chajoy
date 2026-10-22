/** Admin: add a branch. */

import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { BranchForm } from "../BranchEditor";

/** Page title and search-engine settings. */
export const metadata = { title: "New branch" };

/** Empty branch form. */
export default async function NewBranch() {
  await requireAdminPage("branches.manage");
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/branches" className="text-sm text-forest-900/60 hover:text-forest-900">
        ← Branches
      </Link>
      <h1 className="font-display text-4xl text-forest-900">New branch</h1>
      <BranchForm b={null} />
    </div>
  );
}
