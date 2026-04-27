/**
 * ComplianceForecast
 *
 * "At your current pace, you'll hit 100% by September 2026 — 2 months of buffer."
 * Shows actual vs. projected trajectory as a visual timeline.
 * CTA to find courses only appears when behind schedule.
 *
 * Pixel rec #3 — no CME competitor has this.
 */

import Link from "next/link";

interface ComplianceForecastProps {
  state: string;
  licenseType: string;
  hoursEarned: number;
  totalHours: number;
  renewalDate: Date | null;
  /** ISO dates of certificate uploads, newest first — used to compute pace */
  certDates: string[];
  licenseId: string;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function ComplianceForecast({
  state,
  hoursEarned,
  totalHours,
  renewalDate,
  certDates,
  licenseId,
}: ComplianceForecastProps) {
  if (!renewalDate || totalHours === 0) return null;

  const now = new Date();
  const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Already compliant
  if (hoursEarned >= totalHours) return null;

  // Compute pace: avg hours/month over last 3 months of uploads
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentDates = certDates
    .map((d) => new Date(d))
    .filter((d) => d >= threeMonthsAgo && d <= now);

  // We don't have per-cert hours here, so approximate: hoursEarned spread over months active
  const firstCertDate = certDates.length > 0 ? new Date(certDates[certDates.length - 1]) : now;
  const monthsActive = Math.max(1, monthDiff(firstCertDate, now));
  const pacePerMonth = hoursEarned / monthsActive;

  const hoursRemaining = totalHours - hoursEarned;
  const monthsToComplete = pacePerMonth > 0 ? Math.ceil(hoursRemaining / pacePerMonth) : null;

  const projectedCompletion = monthsToComplete !== null ? addMonths(now, monthsToComplete) : null;
  const monthsUntilRenewal = Math.max(0, monthDiff(now, renewalDate));
  const bufferMonths = projectedCompletion ? monthDiff(projectedCompletion, renewalDate) : null;

  const isOnTrack = bufferMonths !== null && bufferMonths >= 0;
  const isBehind = bufferMonths !== null && bufferMonths < 0;
  const hoursPerMonthNeeded = monthsUntilRenewal > 0 ? (hoursRemaining / monthsUntilRenewal).toFixed(1) : null;

  // Build a simple 5-point timeline for visualization
  // Points: now, 25%, 50%, 75%, renewal
  const timelinePoints = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const d = new Date(now.getTime() + frac * (renewalDate.getTime() - now.getTime()));
    const expectedHoursAtPoint = pacePerMonth * (frac * monthsUntilRenewal);
    const pctDone = Math.min(100, (expectedHoursAtPoint / totalHours) * 100);
    return { d, pctDone, frac };
  });

  const actualPct = Math.min(100, (hoursEarned / totalHours) * 100);

  return (
    <div className={`rounded-card border p-5 ${
      isOnTrack
        ? "bg-brand-emeraldTint border-brand-emeraldTint"
        : isBehind
        ? "bg-brand-amberTint border-brand-amberRule"
        : "bg-brand-paper border-brand-rule"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
            Compliance Forecast · {state}
          </p>
          <p className={`text-sm font-semibold ${isOnTrack ? "text-brand-emerald" : isBehind ? "text-brand-amber" : "text-brand-navy"}`}>
            {pacePerMonth === 0
              ? "No uploads yet — pace unknown"
              : projectedCompletion
              ? isOnTrack
                ? `On track — finish by ${formatMonth(projectedCompletion)}`
                : `Behind pace — finish by ${formatMonth(projectedCompletion)} at current rate`
              : "Upload more certificates to calculate pace"}
          </p>
        </div>
        {bufferMonths !== null && (
          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
            isOnTrack
              ? "bg-white/60 text-brand-emerald"
              : "bg-white/60 text-brand-amberMid"
          }`}>
            {isOnTrack
              ? `${bufferMonths}mo buffer`
              : `${Math.abs(bufferMonths)}mo behind`}
          </span>
        )}
      </div>

      {/* Visual timeline */}
      {pacePerMonth > 0 && (
        <div className="mb-4">
          {/* Progress bar: actual (filled) + projected (lighter) */}
          <div className="relative h-3 bg-white/50 rounded-full overflow-hidden">
            {/* Actual progress */}
            <div
              className={`absolute left-0 top-0 h-full rounded-full ${isOnTrack ? "bg-brand-emerald" : "bg-brand-amberMid"}`}
              style={{ width: `${actualPct}%` }}
            />
            {/* Projected completion marker */}
            {projectedCompletion && monthsUntilRenewal > 0 && (
              <div
                className="absolute top-0 h-full w-0.5 bg-white/80"
                style={{
                  left: `${Math.min(100, (monthsToComplete! / monthsUntilRenewal) * 100)}%`,
                }}
              />
            )}
          </div>

          {/* Timeline labels */}
          <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
            <span>Now · {hoursEarned.toFixed(1)} hrs</span>
            {projectedCompletion && <span className={isOnTrack ? "text-brand-emerald font-medium" : "text-brand-amberMid font-medium"}>Done ~{formatMonth(projectedCompletion)}</span>}
            <span>Renewal · {formatMonth(renewalDate)}</span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
        <span>
          <strong className="text-brand-navy">{pacePerMonth.toFixed(1)} hrs/mo</strong> current pace
        </span>
        <span>
          <strong className="text-brand-navy">{hoursRemaining.toFixed(1)} hrs</strong> remaining
        </span>
        {monthsUntilRenewal > 0 && (
          <span>
            <strong className="text-brand-navy">{monthsUntilRenewal}mo</strong> until renewal
          </span>
        )}
      </div>

      {/* CTA — only when behind */}
      {isBehind && hoursPerMonthNeeded && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-amberRule">
          <p className="text-xs text-brand-amberMid">
            Need <strong>{hoursPerMonthNeeded} hrs/month</strong> to finish on time
          </p>
          <Link
            href="/dashboard/compliance"
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-amberMid text-white hover:bg-brand-amber transition-colors"
          >
            Find courses →
          </Link>
        </div>
      )}
    </div>
  );
}
