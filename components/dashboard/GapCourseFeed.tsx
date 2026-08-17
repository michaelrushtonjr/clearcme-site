/**
 * GapCourseFeed
 *
 * Shows 2-3 curated courses beneath a compliance gap card.
 * Pulls from COURSE_CATALOG keyed by mandatory topic.
 * Phase 1 — curated links only, no partner API.
 */

import Link from "next/link";
import { COURSE_CATALOG, keyToSlug } from "@/lib/courses";

interface GapCourseFeedProps {
  topic: string; // COURSE_CATALOG key e.g. "OPIOID_PRESCRIBING"
  hoursNeeded: number;
  /** Max courses to show. Default 3. */
  limit?: number;
  showUpgradePrompt?: boolean;
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function GapCourseFeed({ topic, hoursNeeded, limit = 3, showUpgradePrompt = false }: GapCourseFeedProps) {
  const catalog = COURSE_CATALOG[topic];
  if (!catalog || catalog.courses.length === 0) return null;

  // Sort: free first, then by credit hours desc
  const sorted = [...catalog.courses].sort((a, b) => {
    if (a.isFree && !b.isFree) return -1;
    if (!a.isFree && b.isFree) return 1;
    const aHrs = parseFloat(a.credits) || 0;
    const bHrs = parseFloat(b.credits) || 0;
    return bHrs - aHrs;
  });

  const visible = sorted.slice(0, limit);
  const slug = keyToSlug(topic);

  return (
    <div className="mt-4">
      <p className="mono-label mb-2" style={{ color: "var(--c1b-muted, #656C60)" }}>
        Recommended courses · {hoursNeeded.toFixed(1)} hrs needed
        {showUpgradePrompt ? " · top match shown" : ""}
      </p>
      <div
        style={{
          border: "1px solid var(--c1b-border-card, rgba(16,22,19,.13))",
          borderRadius: 8,
          background: "var(--c1b-card, #FBFAF5)",
          overflow: "hidden",
        }}
      >
        {visible.map((course, i) => (
          <a
            key={i}
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--c1b-hover,#F6F3EA)]"
            style={i > 0 ? { borderTop: "1px solid var(--c1b-border-row, rgba(16,22,19,.06))" } : undefined}
          >
            <div className="min-w-0 flex-1">
              <p
                className="leading-snug transition-colors group-hover:text-[var(--c1b-green,#2E4A2C)]"
                style={{ fontSize: 13.5, fontWeight: 600, color: "var(--c1b-ink, #101613)" }}
              >
                {course.name}
              </p>
              <p className="mt-1" style={{ fontSize: 12, color: "var(--c1b-muted, #656C60)" }}>
                {course.provider} · {course.credits} ·{" "}
                <span
                  style={{
                    fontFamily: "var(--mono, ui-monospace, monospace)",
                    fontWeight: 600,
                    color: course.isFree ? "var(--c1b-green, #2E4A2C)" : "var(--c1b-ink-2, #4B5349)",
                  }}
                >
                  {course.price}
                </span>
              </p>
            </div>
            <ExternalLinkIcon />
          </a>
        ))}
      </div>

      {catalog.courses.length > limit && (
        showUpgradePrompt ? (
          <div
            className="mt-3 px-4 py-3"
            style={{
              border: "1px solid var(--c1b-border-card, rgba(16,22,19,.13))",
              borderRadius: 8,
              background: "var(--c1b-card, #FBFAF5)",
            }}
          >
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--c1b-ink, #101613)" }}>
              Free includes one strong course match.
            </p>
            <p className="mt-1" style={{ fontSize: 12, color: "var(--c1b-muted, #656C60)" }}>
              Upgrade to Essential to compare all {catalog.courses.length} verified options, sort by price/time, and export your audit-ready record.
            </p>
            <Link
              href="/pricing?checkout=essential"
              className="mt-2 inline-flex items-center gap-1 hover:underline"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--c1b-green, #2E4A2C)" }}
            >
              Unlock full course choice →
            </Link>
          </div>
        ) : (
          <Link
            href={`/courses/${slug}`}
            className="mt-2 inline-flex items-center gap-1 hover:underline"
            style={{ fontSize: 12, fontWeight: 600, color: "var(--c1b-green, #2E4A2C)" }}
          >
            Browse all {catalog.courses.length} {catalog.topicLabel} courses →
          </Link>
        )
      )}
    </div>
  );
}
