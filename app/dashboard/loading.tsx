import {
  GapCardSkeleton,
  StatsRowSkeleton,
  CourseCardSkeleton,
  CertificateTableSkeleton,
} from "@/components/skeletons";
import { SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Next.js loading UI for /dashboard — replaces the old spinner
 * with skeleton placeholders that match actual component heights to prevent CLS.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div>
        <SkeletonLine width={220} height={24} className="mb-2" />
        <SkeletonLine width={180} height={14} />
      </div>

      {/* Gap card skeleton */}
      <GapCardSkeleton />

      {/* Stats row skeleton */}
      <StatsRowSkeleton />

      {/* License compliance cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SkeletonLine width={160} height={18} />
          <SkeletonLine width={100} height={14} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </section>

      {/* Audit trail skeleton */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <SkeletonLine width={180} height={14} />
        <SkeletonLine width={260} height={10} />
        <SkeletonLine width={130} height={32} className="rounded-lg mt-1" />
      </div>

      {/* Recent certificates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SkeletonLine width={160} height={18} />
          <SkeletonLine width={120} height={14} />
        </div>
        <CertificateTableSkeleton rows={5} />
      </section>
    </div>
  );
}
