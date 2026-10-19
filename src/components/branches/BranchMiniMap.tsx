"use client";

import dynamic from "next/dynamic";

const BranchMap = dynamic(() => import("./BranchMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full rounded-none" /> });

export function BranchMiniMap({ id, name, latitude, longitude, approximate, radiusKm }: { id: number; name: string; latitude: number; longitude: number; approximate: boolean; radiusKm: number | null }) {
  return (
    <BranchMap
      branches={[{ id, name, latitude, longitude, approximate }]}
      selectedId={id}
      radiusKm={radiusKm && !approximate ? { center: { lat: latitude, lng: longitude }, km: radiusKm } : null}
    />
  );
}
