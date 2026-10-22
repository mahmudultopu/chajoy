/** Dialog for choosing the branch to order from. */

"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { BranchFinder } from "@/components/branches/BranchFinder";
import type { RankedBranch } from "@/lib/services/branches";
import { useStore } from "./StoreProvider";

/** Loads ranked branches when opened and shows the branch finder. */
export function BranchPickerDialog() {
  const { branchPickerOpen, setBranchPickerOpen } = useStore();
  const [initial, setInitial] = useState<{ branches: RankedBranch[]; recommendedId: number | null } | null>(null);

  useEffect(() => {
    if (!branchPickerOpen) return;
    fetch("/api/branches")
      .then((r) => r.json())
      .then(setInitial)
      .catch(() => setInitial({ branches: [], recommendedId: null }));
  }, [branchPickerOpen]);

  return (
    <Dialog open={branchPickerOpen} onClose={() => setBranchPickerOpen(false)} title="Choose your CHAJOY" wide>
      <div className="px-5 pb-6 sm:px-6">
        <p className="mb-4 text-sm text-forest-900/70">Prices and availability can differ by branch. Pick the one you'll order from.</p>
        {initial ? (
          <BranchFinder initial={initial} layout="stack" showMap={false} onChosen={() => setBranchPickerOpen(false)} />
        ) : (
          <div className="space-y-3">
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
        )}
      </div>
    </Dialog>
  );
}
