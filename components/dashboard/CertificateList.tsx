import { Certificate } from "@prisma/client";
import Link from "next/link";

interface Props {
  certificates: Certificate[];
}

const CREDIT_TYPE_LABELS: Record<string, string> = {
  AMA_PRA_1: "AMA Cat. 1",
  AMA_PRA_2: "AMA Cat. 2",
  AAFP_PRESCRIBED: "AAFP Prescribed",
  AAFP_ELECTIVE: "AAFP Elective",
  AOA_1_A: "AOA 1-A",
  AOA_1_B: "AOA 1-B",
  AOA_2_A: "AOA 2-A",
  AOA_2_B: "AOA 2-B",
  OTHER: "Other",
};

export default function CertificateList({ certificates }: Props) {
  if (certificates.length === 0) {
    return (
      <div className="product-card p-12 text-center">
        <div className="w-12 h-12 bg-[var(--bg-2)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[var(--ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-medium text-[var(--ink)] mb-1">No certificates yet</p>
        <p className="text-sm text-[var(--ink-2)] mb-4">
          Upload your CME certificates to start tracking compliance.
        </p>
        <Link
          href="/dashboard/upload"
          className="product-btn product-btn-brand"
        >
          Upload your first certificate →
        </Link>
      </div>
    );
  }

  return (
    <div className="product-card overflow-hidden">
      <div className="divide-y divide-[var(--line-soft)]">
        {certificates.map((cert) => (
          <div key={cert.id} className="p-5 flex items-start gap-4">
            {/* File icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-[rgba(63,95,51,0.10)] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-[var(--ink)] text-sm truncate">
                    {cert.title ?? cert.fileName}
                  </p>
                  {cert.provider && (
                    <p className="text-xs text-[var(--ink-3)] mt-0.5">{cert.provider}</p>
                  )}
                </div>
                {cert.creditHours != null && (
                  <span className="product-pill product-pill-met flex-shrink-0">
                    {cert.creditHours.toFixed(1)} hrs
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {cert.activityDate && (
                  <span className="text-xs text-[var(--ink-3)]">
                    {new Date(cert.activityDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {cert.creditType && (
                  <span className="product-pill bg-[var(--bg-2)] text-[var(--ink-2)]">
                    {CREDIT_TYPE_LABELS[cert.creditType] ?? cert.creditType}
                  </span>
                )}
                <ExtractionBadge status={cert.extractionStatus} />
              </div>

              {cert.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {cert.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="product-pill product-pill-track"
                    >
                      {topic}
                    </span>
                  ))}
                  {cert.topics.length > 3 && (
                    <span className="text-xs text-[var(--ink-3)]">
                      +{cert.topics.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {certificates.length >= 10 && (
        <div className="px-5 py-4 border-t border-[var(--line-soft)] text-center">
          <Link
            href="/dashboard/compliance"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-2)] font-medium"
          >
            View all certificates →
          </Link>
        </div>
      )}
    </div>
  );
}

function ExtractionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    COMPLETED: { label: "Extracted", cls: "product-pill-met" },
    PENDING: { label: "Pending", cls: "bg-[var(--bg-2)] text-[var(--ink-2)]" },
    PROCESSING: { label: "Processing…", cls: "product-pill-pending" },
    FAILED: { label: "Failed", cls: "product-pill-miss" },
    MANUAL: { label: "Manual", cls: "product-pill-track" },
  };

  const badge = map[status] ?? { label: status, cls: "bg-[var(--bg-2)] text-[var(--ink-2)]" };

  return (
    <span className={`product-pill ${badge.cls}`}>
      {badge.label}
    </span>
  );
}
