import { ComplianceStatus } from "@prisma/client";
import Link from "next/link";

interface MandatoryGap {
  topic: string;
  description?: string;
  earned: number;
  needed: number;
  gap: number;
  isMet: boolean;
}

interface Props {
  statuses: ComplianceStatus[];
}

export default function GapAlerts({ statuses }: Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        Compliance Gaps
      </h2>

      <div className="space-y-3">
        {statuses.map((status) => {
          const daysLeft = Math.ceil(
            (new Date(status.cycleEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const mandatoryGaps = (status.mandatoryGaps as MandatoryGap[] | null) ?? [];
          const unmetTopics = mandatoryGaps.filter((g) => !g.isMet);

          return (
            <div
              key={status.id}
              className="bg-white rounded-2xl border border-red-100 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {status.licenseState} — {status.licenseType}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Renewal in{" "}
                    <span
                      className={
                        daysLeft <= 30 ? "text-red-600 font-semibold" : "text-amber-600 font-medium"
                      }
                    >
                      {daysLeft} days
                    </span>
                  </p>
                </div>
                <Link
                  href="/dashboard/upload"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  Upload credits →
                </Link>
              </div>

              {/* Hour gap */}
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-900">
                    {status.gapHours.toFixed(1)} hours short
                  </p>
                  <p className="text-xs text-red-600">
                    {status.totalHoursEarned.toFixed(1)} of {status.totalHoursNeeded.toFixed(0)} hrs completed
                  </p>
                </div>
              </div>

              {/* Mandatory topic gaps */}
              {unmetTopics.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    Missing mandatory topics:
                  </p>
                  <div className="space-y-2">
                    {unmetTopics.map((gap) => (
                      <div
                        key={gap.topic}
                        className="flex items-center justify-between text-sm py-2 px-3 bg-amber-50 rounded-lg"
                      >
                        <span className="text-amber-900 font-medium">
                          {gap.topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <span className="text-amber-700 text-xs">
                          {gap.earned.toFixed(1)}/{gap.needed.toFixed(0)} hrs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
