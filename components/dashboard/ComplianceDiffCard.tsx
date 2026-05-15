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
    <article className="product-callout-ink p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <p className="product-callout-eye">
              Compliance Diff
            </p>
            <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
              {formatComplianceLicenseLabel(diff.change.state, diff.change.licenseType)}
            </h3>
            <p className="text-sm text-[var(--ink-2)]">{diff.change.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--ink-3)]">
            <span className="product-pill bg-[var(--bg-2)] text-[var(--ink-2)]">
              {effectiveDateLabel ? `Effective ${effectiveDateLabel}` : "Effective date pending"}
            </span>
            <span className="product-pill product-pill-track">
              {diff.change.changeType.replace(/_/g, " ")}
            </span>
          </div>

          <div className="space-y-2 text-sm text-[var(--ink-2)]">
            <p>{formatComplianceChangeSummary(diff.change)}</p>
            <p>
              <span className="font-semibold text-[var(--ink)]">Your impact:</span>{" "}
              {diff.impactDescription}
            </p>
          </div>

          <Link
            href={diff.courseHref}
            className="inline-flex min-h-[44px] items-center font-semibold text-[var(--primary)] transition hover:text-[var(--primary-2)]"
          >
            See courses that qualify →
          </Link>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          disabled={isDismissing}
          aria-label="Dismiss compliance diff"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-3)] transition hover:bg-[var(--bg-2)] hover:text-[var(--ink-2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </article>
  );
}
