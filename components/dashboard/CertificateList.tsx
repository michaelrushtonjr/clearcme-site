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
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-medium text-slate-900 mb-1">No certificates yet</p>
        <p className="text-sm text-slate-500 mb-4">
          Upload your CME certificates to start tracking compliance.
        </p>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Upload your first certificate →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="divide-y divide-slate-100">
        {certificates.map((cert) => (
          <div key={cert.id} className="p-5 flex items-start gap-4">
            {/* File icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {cert.title ?? cert.fileName}
                  </p>
                  {cert.provider && (
                    <p className="text-xs text-slate-500 mt-0.5">{cert.provider}</p>
                  )}
                </div>
                {cert.creditHours != null && (
                  <span className="flex-shrink-0 text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                    {cert.creditHours.toFixed(1)} hrs
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {cert.activityDate && (
                  <span className="text-xs text-slate-400">
                    {new Date(cert.activityDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {cert.creditType && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
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
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                  {cert.topics.length > 3 && (
                    <span className="text-xs text-slate-400">
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
        <div className="px-5 py-4 border-t border-slate-100 text-center">
          <Link
            href="/dashboard/compliance"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
    COMPLETED: { label: "Extracted", cls: "bg-green-50 text-green-700" },
    PENDING: { label: "Pending", cls: "bg-slate-100 text-slate-500" },
    PROCESSING: { label: "Processing…", cls: "bg-amber-50 text-amber-700" },
    FAILED: { label: "Failed", cls: "bg-red-50 text-red-600" },
    MANUAL: { label: "Manual", cls: "bg-purple-50 text-purple-700" },
  };

  const badge = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
      {badge.label}
    </span>
  );
}
