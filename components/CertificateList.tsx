"use client";

import Link from "next/link";
import DeleteCertButton from "@/components/DeleteCertButton";

interface Cert {
  id: string;
  title: string | null;
  fileName: string;
  provider: string | null;
  activityDate: Date | null;
  creditHours: number | null;
  extractionStatus: string;
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
      <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
        {creditHours.toFixed(1)} hrs
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-lg whitespace-nowrap">✅ Completed</span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-lg whitespace-nowrap">⚠️ Failed</span>
    );
  }
  return (
    <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg whitespace-nowrap">🔄 Processing</span>
  );
}

export default function CertificateList({ certs, totalCount, showViewAll = false, sharedCredits }: Props) {
  if (certs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm mb-4">No certificates yet.</p>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Upload your first →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="divide-y divide-slate-100">
        {certs.map((cert) => (
          <div key={cert.id} className="px-5 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 text-sm truncate">
                {cert.title ?? cert.fileName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {cert.provider ?? "Unknown provider"}
                {cert.activityDate && (
                  <> · {new Date(cert.activityDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                )}
              </p>
              {sharedCredits?.[cert.id] && sharedCredits[cert.id].length >= 2 && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Counts for: {sharedCredits[cert.id].join(", ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={cert.extractionStatus} creditHours={cert.creditHours} />
              <DeleteCertButton certId={cert.id} certTitle={cert.title ?? cert.fileName} />
            </div>
          </div>
        ))}
      </div>
      {showViewAll && totalCount > certs.length && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <Link
            href="/dashboard/compliance"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all {totalCount} certificates →
          </Link>
        </div>
      )}
    </div>
  );
}
