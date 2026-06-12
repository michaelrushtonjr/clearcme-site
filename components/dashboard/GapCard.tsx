import Link from "next/link";
import { COURSE_CATALOG, slugToKey } from "@/lib/courses";

interface Gap {
  label: string;
  detail: string;
  href: string;
}

interface Props {
  gaps: Gap[];
  renewalDays: number | null;
  allGapsCount?: number;
}

/** Derive a topic key from a gap href like /courses/opioid-prescribing */
function courseCountForHref(href: string): number | null {
  if (!href.startsWith("/courses/")) return null;
  const slug = href.replace("/courses/", "").split("?")[0];
  const key = slugToKey(slug);
  const catalog = COURSE_CATALOG[key];
  return catalog ? catalog.courses.length : null;
}

export default function GapCard({ gaps, renewalDays, allGapsCount }: Props) {
  if (gaps.length === 0) return null;

  const isUrgent = renewalDays !== null && renewalDays <= 90;

  // Show max 3 items; compute overflow
  const MAX_VISIBLE = 3;
  const visibleGaps = gaps.slice(0, MAX_VISIBLE);
  const totalCount = allGapsCount ?? gaps.length;
  const overflowCount = totalCount - MAX_VISIBLE;

  // Check if all gaps share the same renewal deadline
  const allSameDeadline =
    overflowCount > 0 &&
    gaps.every((g) => g.detail === gaps[0].detail) &&
    gaps[0].detail.includes("days to renewal") === false &&
    !gaps[0].detail.includes("mandatory topic");

  return (
    <div className={`${isUrgent ? "border-[rgba(221,107,64,0.32)] bg-[rgba(221,107,64,0.12)]" : "product-callout-warm"} border rounded-2xl p-5`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isUrgent ? "bg-[var(--pop)]" : "bg-[var(--warm)]"} animate-pulse`} />
          <h3 className={`font-display font-semibold text-base ${isUrgent ? "text-[var(--status-miss)]" : "text-[var(--ink)]"}`}>
            What still needs attention
          </h3>
        </div>
        {renewalDays !== null && (
          <span className={`product-pill ${isUrgent ? "product-pill-miss" : "product-pill-pending"}`}>
            {renewalDays <= 0 ? "Renewal overdue" : `${renewalDays} days to renewal`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {visibleGaps.map((gap, i) => {
          const courseCount = courseCountForHref(gap.href);
          const contextNote =
            courseCount !== null
              ? `${courseCount} accredited course${courseCount !== 1 ? "s" : ""} available`
              : "We show only courses relevant to your missing requirements";

          return (
            <div
              key={i}
              className="flex flex-col gap-3 bg-[var(--paper)] rounded-[var(--radius)] px-4 py-3 border border-[var(--line-soft)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink)] break-words sm:truncate">{gap.label}</p>
                <p className="text-xs text-[var(--ink-3)]">{gap.detail}</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-shrink-0 sm:items-end sm:gap-1">
                <span className="text-xs text-[var(--ink-3)] sm:text-right">{contextNote}</span>
                <Link
                  href={gap.href}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:w-auto sm:min-h-0 sm:py-1.5 ${
                    isUrgent
                      ? "bg-[var(--pop)] text-white hover:bg-[var(--pop-2)]"
                      : "bg-[var(--primary)] text-white hover:bg-[var(--primary-2)]"
                  }`}
                >
                  See courses →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow count — link to the full list so the count is actionable */}
      {overflowCount > 0 && (
        <div className="text-center mt-3">
          <Link
            href="/dashboard/compliance"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-2)] underline underline-offset-2"
          >
            {allSameDeadline
              ? `+ ${overflowCount} more item${overflowCount === 1 ? "" : "s"} due ${gaps[0].detail}`
              : `+ ${overflowCount} more item${overflowCount === 1 ? "" : "s"}`}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
