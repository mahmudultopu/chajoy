/** Loading state for menu pages. */

import { ProductCardSkeleton } from "@/components/product/ProductCard";

/** Skeleton grid shown while the menu loads. */
export default function Loading() {
  return (
    <div className="container-x pb-10 pt-14" aria-busy="true" aria-label="Loading the menu">
      <div className="skeleton h-14 w-72" />
      <div className="skeleton mt-4 h-5 w-96 max-w-full" />
      <div className="mt-10 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
