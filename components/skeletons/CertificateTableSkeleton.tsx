"use client";

import { SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Skeleton matching CertificateList — 5 rows with title/provider/date + hours badge.
 * Matches the divide-y layout with px-5 py-4 per row.
 */
export default function CertificateTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      aria-hidden="true"
    >
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Title */}
              <SkeletonLine width={`${65 + (i % 3) * 10}%`} height={14} />
              {/* Provider + date */}
              <SkeletonLine width={`${35 + (i % 2) * 15}%`} height={10} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Hours badge */}
              <SkeletonLine width={56} height={28} className="rounded-lg" />
              {/* Delete button placeholder */}
              <SkeletonLine width={28} height={28} className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
