"use client";

export type ComplianceOverview = {
  state: string;
  licenseType: string;
  percentage: number;
  daysUntilRenewal: number | null;
  hasGeneralGap: boolean;
  hasMandatoryGap: boolean;
  isCompliant: boolean;
  licenseId: string;
};

type ComplianceHeatmapProps = {
  items: ComplianceOverview[];
};

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getProgressTone(percentage: number) {
  if (percentage >= 80) {
    return {
      bar: "bg-[#10B981]",
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  if (percentage >= 50) {
    return {
      bar: "bg-[#F59E0B]",
      pill: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    bar: "bg-[#EF4444]",
    pill: "bg-red-50 text-red-700 border-red-200",
  };
}

function getRenewalLabel(daysUntilRenewal: number | null) {
  if (daysUntilRenewal == null) {
    return "No renewal date";
  }

  if (daysUntilRenewal <= 0) {
    return "Renewal overdue";
  }

  if (daysUntilRenewal === 1) {
    return "1 day to renewal";
  }

  return `${daysUntilRenewal} days to renewal`;
}

function getWarningLabel(item: ComplianceOverview) {
  if (item.hasGeneralGap && item.hasMandatoryGap) {
    return "⚠⚠";
  }

  if (item.hasGeneralGap || item.hasMandatoryGap) {
    return "⚠";
  }

  return "✓";
}

export default function ComplianceHeatmap({ items }: ComplianceHeatmapProps) {
  const compliantCount = items.filter((item) => item.isCompliant).length;
  const overallCompliance = items.length === 0 ? 0 : Math.round((compliantCount / items.length) * 100);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="rounded-2xl border border-slate-200/80 bg-[#FAFAF7] p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E]">
              Multi-State Compliance
            </p>
            <h2 className="font-playfair text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Compliance heatmap overview
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            Tap a state to jump to its license card.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const percentage = clampPercentage(item.percentage);
          const tone = getProgressTone(percentage);
          const warningLabel = getWarningLabel(item);
          const renewalLabel = getRenewalLabel(item.daysUntilRenewal);

          return (
            <button
              key={item.licenseId}
              type="button"
              onClick={() => {
                const target = document.getElementById(`license-${item.licenseId}`);
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-[#0F766E] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 sm:w-44">
                <p className="text-base font-semibold text-slate-900">
                  {item.state}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {item.licenseType}
                </p>
              </div>

              <div className="flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${tone.bar} transition-[width]`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${tone.pill}`}>
                  {percentage}%
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
                  {renewalLabel}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
                    item.isCompliant ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                  }`}
                  aria-label={
                    item.hasGeneralGap && item.hasMandatoryGap
                      ? "General hours and mandatory topics incomplete"
                      : item.hasGeneralGap
                      ? "General hours incomplete"
                      : item.hasMandatoryGap
                      ? "Mandatory topics incomplete"
                      : "Compliant"
                  }
                  title={
                    item.hasGeneralGap && item.hasMandatoryGap
                      ? "General hours and mandatory topics incomplete"
                      : item.hasGeneralGap
                      ? "General hours incomplete"
                      : item.hasMandatoryGap
                      ? "Mandatory topics incomplete"
                      : "Compliant"
                  }
                >
                  {warningLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4 text-sm font-medium text-slate-600">
        Overall: <span className="text-slate-900">{overallCompliance}% compliant</span> across{" "}
        <span className="text-slate-900">{items.length}</span> {items.length === 1 ? "state" : "states"}
      </div>
    </section>
  );
}
