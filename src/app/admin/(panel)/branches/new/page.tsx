import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { BranchForm } from "../BranchEditor";

export const metadata = { title: "New branch" };

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
