import {
  StatsRowSkeleton,
  CertificateTableSkeleton,
} from "@/components/skeletons";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Next.js loading UI for /dashboard/compliance.
 * Mirrors the 1b compliance layout (header → stats → credential table)
 * to prevent CLS.
 */
export default function ComplianceLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <SkeletonLine width={90} height={11} className="mb-2" />
          <SkeletonLine width={240} height={28} className="mb-2" />
          <SkeletonLine width={300} height={13} />
        </div>
        <div className="flex gap-2">
          <SkeletonLine width={100} height={40} className="rounded-lg" />
          <SkeletonLine width={140} height={40} className="rounded-lg" />
        </div>
      </div>

      {/* Stats row */}
      <StatsRowSkeleton />

      {/* Credential table skeleton: dark band + column band + rows */}
      <section
        className="overflow-hidden rounded-[10px] border"
        style={{ background: "var(--c1b-card, #FBFAF5)", borderColor: "rgba(16,22,19,.13)" }}
      >
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ background: "var(--c1b-forest, #22371F)" }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="rounded" style={{ width: 180, height: 20, opacity: 0.35 }} />
            <Skeleton className="rounded" style={{ width: 220, height: 13, opacity: 0.25 }} />
          </div>
          <Skeleton className="rounded-full" style={{ width: 90, height: 22, opacity: 0.3 }} />
        </div>
        <div className="px-5 py-2.5" style={{ background: "var(--c1b-band, #F0ECE1)" }}>
          <SkeletonLine width="60%" height={10} />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="grid items-center gap-4 px-5 py-4"
            style={{
              gridTemplateColumns: "2.4fr .9fr 1.1fr .9fr",
              borderTop: "1px solid rgba(16,22,19,.06)",
            }}
          >
            <div>
              <SkeletonLine width={150} height={13} className="mb-1.5" />
              <SkeletonLine width={220} height={10} />
            </div>
            <SkeletonLine width={60} height={10} />
            <div>
              <SkeletonLine width={70} height={11} className="mb-1.5" />
              <Skeleton className="rounded-full" style={{ width: "90%", height: 5 }} />
            </div>
            <SkeletonLine width={50} height={10} className="justify-self-end" />
          </div>
        ))}
      </section>

      {/* Certificate list */}
      <CertificateTableSkeleton rows={3} />
    </div>
  );
}
