"use client";

import Link from "next/link";
import type { UserComplianceDiffPayload } from "@/lib/compliance-diffs";
import {
  formatComplianceChangeSummary,
  formatComplianceEffectiveDate,
  formatComplianceLicenseLabel,
} from "@/lib/compliance-diffs";

interface ComplianceDiffCardProps {
  diff: UserComplianceDiffPayload;
  isDismissing?: boolean;
  onDismiss: () => void;
}

export default function ComplianceDiffCard({
  diff,
  isDismissing = false,
  onDismiss,
}: ComplianceDiffCardProps) {
  const effectiveDateLabel = formatComplianceEffectiveDate(diff.change.effectiveDate);

  return (
    <article className="rounded-2xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Compliance Diff
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              {formatComplianceLicenseLabel(diff.change.state, diff.change.licenseType)}
            </h3>
            <p className="text-sm text-slate-600">{diff.change.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {effectiveDateLabel ? `Effective ${effectiveDateLabel}` : "Effective date pending"}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
              {diff.change.changeType.replace(/_/g, " ")}
            </span>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p>{formatComplianceChangeSummary(diff.change)}</p>
            <p>
              <span className="font-semibold text-slate-900">Your impact:</span>{" "}
              {diff.impactDescription}
            </p>
          </div>

          <Link
            href={diff.courseHref}
            className="inline-flex min-h-[44px] items-center font-semibold text-[#0F766E] transition hover:text-[#115E59]"
          >
            See courses that qualify →
          </Link>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          disabled={isDismissing}
          aria-label="Dismiss compliance diff"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </article>
  );
}
