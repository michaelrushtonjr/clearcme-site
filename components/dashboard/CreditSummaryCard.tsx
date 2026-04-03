import { ComplianceStatus } from "@prisma/client";

interface Props {
  status: ComplianceStatus;
}

export default function CreditSummaryCard({ status }: Props) {
  const pct = Math.min(
    100,
    status.totalHoursNeeded > 0
      ? Math.round((status.totalHoursEarned / status.totalHoursNeeded) * 100)
      : 0
  );

  const daysUntilRenewal = Math.ceil(
    (new Date(status.cycleEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isUrgent = !status.isCompliant && daysUntilRenewal <= 90;

  return (
    <div
      className={`bg-white rounded-2xl border p-6 ${
        status.isCompliant
          ? "border-green-200"
          : isUrgent
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-lg font-bold text-slate-900">
            {status.licenseState}
          </span>
          <span className="ml-2 text-sm text-slate-500">{status.licenseType}</span>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            status.isCompliant
              ? "bg-green-50 text-green-700"
              : isUrgent
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {status.isCompliant ? "Compliant" : isUrgent ? "Urgent" : "Gaps found"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{status.totalHoursEarned.toFixed(1)} hrs earned</span>
          <span>{status.totalHoursNeeded.toFixed(0)} hrs needed</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              status.isCompliant
                ? "bg-green-500"
                : pct >= 75
                ? "bg-amber-400"
                : "bg-blue-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">{pct}% complete</p>
      </div>

      {/* Renewal date */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Renewal:{" "}
          <span className="font-medium text-slate-700">
            {new Date(status.cycleEnd).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </span>
        <span
          className={`font-medium ${
            daysUntilRenewal <= 30
              ? "text-red-600"
              : daysUntilRenewal <= 90
              ? "text-amber-600"
              : "text-slate-500"
          }`}
        >
          {daysUntilRenewal > 0 ? `${daysUntilRenewal}d left` : "Overdue"}
        </span>
      </div>

      {/* Gap summary */}
      {!status.isCompliant && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-700">
            Need{" "}
            <span className="text-red-600 font-bold">
              {status.gapHours.toFixed(1)} more hours
            </span>{" "}
            to complete
          </p>
        </div>
      )}
    </div>
  );
}
