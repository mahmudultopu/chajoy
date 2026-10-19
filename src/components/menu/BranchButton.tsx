"use client";

import { useStore } from "@/components/store/StoreProvider";

export function BranchButton({ label, className }: { label: string; className?: string }) {
  const { setBranchPickerOpen } = useStore();
  return (
    <button type="button" onClick={() => setBranchPickerOpen(true)} className={className ?? "font-semibold text-forest-900 underline underline-offset-2"}>
      {label}
    </button>
  );
}
