import {
  StatsRowSkeleton,
  CertificateTableSkeleton,
} from "@/components/skeletons";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Next.js loading UI for /dashboard/compliance.
 * Matches the compliance map page layout to prevent CLS.
 */
export default function ComplianceLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <SkeletonLine width={200} height={24} className="mb-2" />
          <SkeletonLine width={260} height={14} className="mb-1" />
          <SkeletonLine width={280} height={10} />
        </div>
        <div className="flex gap-2">
          <SkeletonLine width={100} height={36} className="rounded-xl" />
          <SkeletonLine width={100} height={36} className="rounded-xl" />
        </div>
      </div>

      {/* UrgencyCard skeleton */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
        <SkeletonLine width={160} height={16} />
        <SkeletonLine width="80%" height={12} />
        <SkeletonLine width={120} height={32} className="rounded-lg" />
      </div>

      {/* Stats row */}
      <StatsRowSkeleton />

      {/* 2 license compliance section skeletons */}
      {[1, 2].map((i) => (
        <section
          key={i}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          {/* Card header */}
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <SkeletonLine width={160} height={18} />
                <Skeleton className="rounded-full" style={{ width: 110, height: 22 }} />
              </div>
              <SkeletonLine width={200} height={12} />
            </div>
            <Skeleton className="rounded-full" style={{ width: 160, height: 28 }} />
          </div>
          {/* Card body */}
          <div className="px-6 py-5 space-y-6">
            {/* Hours progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <SkeletonLine width={120} height={12} />
                <SkeletonLine width={80} height={12} />
              </div>
              <Skeleton className="rounded-full" style={{ width: "100%", height: 12 }} />
              <div className="flex justify-between">
                <SkeletonLine width={140} height={10} />
                <SkeletonLine width={30} height={10} />
              </div>
            </div>
            {/* Mandatory topics */}
            <div className="space-y-2">
              <SkeletonLine width={120} height={14} className="mb-3" />
              {[1, 2, 3].map((j) => (
                <Skeleton
                  key={j}
                  className="rounded-xl"
                  style={{ width: "100%", height: 80 }}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Certificate list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SkeletonLine width={180} height={18} />
          <SkeletonLine width={70} height={14} />
        </div>
        <CertificateTableSkeleton rows={5} />
      </section>
    </div>
  );
}
