"use client";

import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Skeleton matching the GapCard component layout.
 * Rounded-2xl amber-ish border, header bar, 3 gap rows with CTA buttons.
 */
export default function GapCardSkeleton() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5" aria-hidden="true">
      {/* Header row: title + badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="rounded-full" style={{ width: 8, height: 8 }} />
          <SkeletonLine width={180} height={14} />
        </div>
        <SkeletonLine width={100} height={24} className="rounded-full" />
      </div>

      {/* 3 gap row placeholders */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <SkeletonLine width="75%" height={14} />
              <SkeletonLine width="40%" height={10} />
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <SkeletonLine width={120} height={10} />
              <SkeletonLine width={90} height={28} className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
