/** Small single-branch map for the branch detail page. */

"use client";

import dynamic from "next/dynamic";

const BranchMap = dynamic(() => import("./BranchMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full rounded-none" /> });

/** Shows one branch on a map, with its delivery radius when known. */
export function BranchMiniMap({ id, name, latitude, longitude, approximate, radiusKm }: { id: number; name: string; latitude: number; longitude: number; approximate: boolean; radiusKm: number | null }) {
  return (
    <BranchMap
      branches={[{ id, name, latitude, longitude, approximate }]}
      selectedId={id}
      radiusKm={radiusKm && !approximate ? { center: { lat: latitude, lng: longitude }, km: radiusKm } : null}
    />
  );
}
