"use client";

import Link from "next/link";
import DeleteCertButton from "@/components/DeleteCertButton";
import VerifiedProviderBadge from "@/components/VerifiedProviderBadge";

interface Cert {
  id: string;
  title?: string | null;
  courseName?: string | null;
  fileName?: string | null;
  provider?: string | null;
  providerName?: string | null;
  activityDate: Date | string | null;
  creditHours: number | null;
  extractionStatus: string;
  specialTopics?: string[];
  creditType?: string | null;
}

interface Props {
  certs: Cert[];
  totalCount: number;
  showViewAll?: boolean;
  /** Map of certId → state codes where the cert counts */
  sharedCredits?: Record<string, string[]>;
}

function StatusBadge({ status, creditHours }: { status: string; creditHours: number | null }) {
  if (status === "COMPLETED" && creditHours != null) {
    return (
      <span className="product-pill product-pill-met whitespace-nowrap">
        {creditHours.toFixed(1)} hrs
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="product-pill product-pill-met whitespace-nowrap">Completed</span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="product-pill product-pill-miss whitespace-nowrap">Failed</span>
    );
  }
  return (
    <span className="product-pill product-pill-pending whitespace-nowrap">Processing</span>
  );
}

export default function CertificateList({ certs, totalCount, showViewAll = false, sharedCredits }: Props) {
  if (certs.length === 0) {
    return (
      <div className="product-card p-8 text-center">
        <div className="w-12 h-12 bg-[var(--bg-2)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[var(--ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-[var(--ink-2)] text-sm mb-4">No certificates yet.</p>
        <Link
          href="/dashboard/upload"
          className="product-btn product-btn-brand"
        >
          Upload your first →
        </Link>
      </div>
    );
  }

  return (
    <div className="product-card overflow-hidden">
      <div className="divide-y divide-[var(--line-soft)]">
        {certs.map((cert) => {
          const certificateTitle = cert.title ?? cert.courseName ?? cert.fileName ?? "Untitled certificate";
          const providerName = cert.provider ?? cert.providerName ?? "Unknown provider";

          return (
            <div key={cert.id} className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--ink)] text-sm truncate">
                  {certificateTitle}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-3)]">
                  <span>{providerName}</span>
                  <VerifiedProviderBadge providerName={cert.provider ?? cert.providerName} />
                  {cert.activityDate && (
                    <span>
                      {new Date(cert.activityDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {sharedCredits?.[cert.id] && sharedCredits[cert.id].length >= 2 && (
                  <span className="product-pill product-pill-met mt-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Counts for: {sharedCredits[cert.id].join(", ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={cert.extractionStatus} creditHours={cert.creditHours} />
                <DeleteCertButton certId={cert.id} certTitle={certificateTitle} />
              </div>
            </div>
          );
        })}
      </div>
      {showViewAll && totalCount > certs.length && (
        <div className="px-5 py-3 border-t border-[var(--line-soft)] bg-[var(--bg-2)]">
          <Link
            href="/dashboard/compliance"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-2)] font-medium"
          >
            View all {totalCount} certificates →
          </Link>
        </div>
      )}
    </div>
  );
}
