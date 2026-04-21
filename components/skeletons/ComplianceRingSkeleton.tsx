"use client";

import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Skeleton matching the RenewalRing component (80×80 circle + pace text).
 * Matches the flex-col items-center layout of the real component.
 */
export default function ComplianceRingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* 80px ring placeholder */}
      <SkeletonCircle size={80} />
      {/* Pace text placeholder */}
      <SkeletonLine width={90} height={12} />
    </div>
  );
}
