import type { Metadata } from "next";
import { BranchFinder } from "@/components/branches/BranchFinder";
import { rankBranches } from "@/lib/services/branches";

export const metadata: Metadata = {
  title: "Find a branch",
  description: "Find your nearest CHAJOY branch in Dhaka — Mohammadpur, Rampura, Badda, Bonasree, Kochukhet and Mirpur 10.",
  alternates: { canonical: "/branches" },
};

export default async function BranchesPage() {
  const ranked = await rankBranches({ origin: null });
  return (
    <div className="container-x pb-10 pt-10 sm:pt-14">
      <p className="eyebrow">Find a branch</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold leading-[0.95] tracking-tight text-forest-900 sm:text-6xl">
        Your favourite CHAJOY, <em className="font-medium text-matcha-600">closer to you.</em>
      </h1>
      <p className="mt-4 max-w-2xl text-forest-900/70">
        {ranked.branches.length} branches across Dhaka. Use your location or search an area, address or landmark to see which one is nearest and what it can make for you.
      </p>
      <div className="mt-10">
        <BranchFinder initial={ranked} />
      </div>
    </div>
  );
}
