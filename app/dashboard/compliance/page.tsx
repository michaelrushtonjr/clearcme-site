import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CreditSummaryCard from "@/components/dashboard/CreditSummaryCard";

export const metadata = {
  title: "Compliance Analysis — ClearCME",
};

interface MandatoryGap {
  topic: string;
  description?: string;
  earned: number;
  needed: number;
  gap: number;
  isMet: boolean;
}

export default async function CompliancePage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [complianceStatuses, licenses, certificates] = await Promise.all([
    prisma.complianceStatus.findMany({
      where: { userId },
      orderBy: { cycleEnd: "asc" },
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
    }),
    prisma.certificate.findMany({
      where: { userId, extractionStatus: "COMPLETED" },
      orderBy: { activityDate: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Analysis</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Gap analysis by state and license type
          </p>
        </div>
        <button
          onClick={undefined}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Refresh analysis
        </button>
      </div>

      {/* No licenses */}
      {licenses.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <h3 className="font-semibold text-blue-900 mb-2">No licenses configured</h3>
          <p className="text-sm text-blue-700 mb-4">
            Add your state medical licenses to see personalized compliance requirements.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Set up profile →
          </Link>
        </div>
      )}

      {/* Compliance cards */}
      {complianceStatuses.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Status by License
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {complianceStatuses.map((status) => (
              <CreditSummaryCard key={status.id} status={status} />
            ))}
          </div>
        </section>
      )}

      {/* No compliance data yet */}
      {licenses.length > 0 && complianceStatuses.length === 0 && (
        <div className="bg-slate-100 rounded-2xl p-8 text-center">
          <p className="font-medium text-slate-700 mb-1">Compliance not yet computed</p>
          <p className="text-sm text-slate-500">
            Visit <Link href="/api/compliance" className="text-blue-600 underline">/api/compliance</Link> to trigger a refresh, or upload certificates to get started.
          </p>
        </div>
      )}

      {/* Mandatory topic breakdown */}
      {complianceStatuses.some((s) => {
        const gaps = (s.mandatoryGaps as MandatoryGap[] | null) ?? [];
        return gaps.length > 0;
      }) && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Mandatory Topic Requirements
          </h2>
          <div className="space-y-4">
            {complianceStatuses.map((status) => {
              const gaps = (status.mandatoryGaps as MandatoryGap[] | null) ?? [];
              if (gaps.length === 0) return null;

              return (
                <div key={status.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {status.licenseState} — {status.licenseType}
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {gaps.map((gap) => (
                      <div key={gap.topic} className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {gap.topic
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </p>
                          {gap.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{gap.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">
                              {gap.earned.toFixed(1)}/{gap.needed.toFixed(0)} hrs
                            </p>
                            {!gap.isMet && (
                              <p className="text-xs text-red-600">
                                {gap.gap.toFixed(1)} hrs short
                              </p>
                            )}
                          </div>
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              gap.isMet
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {gap.isMet ? "✓" : "✗"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All certificates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            All Certificates ({certificates.length})
          </h2>
          <Link
            href="/dashboard/upload"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Upload
          </Link>
        </div>

        {certificates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 text-sm">No certificates uploaded yet.</p>
            <Link
              href="/dashboard/upload"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Upload your first →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {certificates.map((cert) => (
                <div key={cert.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {cert.title ?? cert.fileName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cert.provider ?? "Unknown provider"}
                        {cert.activityDate && (
                          <>
                            {" · "}
                            {new Date(cert.activityDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    {cert.creditHours != null && (
                      <span className="flex-shrink-0 text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                        {cert.creditHours.toFixed(1)} hrs
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals footer */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Total hours</span>
              <span className="text-sm font-bold text-blue-700">
                {certificates.reduce((sum, c) => sum + (c.creditHours ?? 0), 0).toFixed(1)} hrs
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
