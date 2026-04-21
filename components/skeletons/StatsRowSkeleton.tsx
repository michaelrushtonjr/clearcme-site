"use client";

import { SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Skeleton for the 2×2 / 4-across stats row on the dashboard.
 */
export default function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2"
        >
          <SkeletonLine width={80} height={10} />
          <SkeletonLine width={50} height={24} />
          <SkeletonLine width={60} height={10} />
        </div>
      ))}
    </div>
  );
}
