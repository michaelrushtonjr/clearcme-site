"use client";

import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Skeleton matching the license compliance card layout.
 * Rounded-2xl card with header (title + ring) + hours bar + mandatory topic chips.
 */
export default function CourseCardSkeleton() {
  return (
    <div
      className="block bg-white rounded-2xl border border-slate-200 p-5"
      aria-hidden="true"
    >
      {/* Card header: text left, ring right */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3 space-y-2">
          {/* Title: "NV — DO" */}
          <SkeletonLine width={140} height={16} />
          {/* Days to renewal */}
          <SkeletonLine width={110} height={10} />
          {/* Status badge */}
          <Skeleton
            className="rounded-full"
            style={{ width: 90, height: 24 }}
          />
        </div>
        {/* Renewal ring placeholder */}
        <Skeleton
          className="rounded-full flex-shrink-0"
          style={{ width: 80, height: 80 }}
        />
      </div>

      {/* Hours sub-line */}
      <SkeletonLine width={120} height={10} className="mb-2" />

      {/* Mandatory topic chips */}
      <div className="flex flex-wrap gap-1.5">
        {[80, 100, 70].map((w, i) => (
          <Skeleton
            key={i}
            className="rounded-full"
            style={{ width: w, height: 24 }}
          />
        ))}
      </div>
    </div>
  );
}
