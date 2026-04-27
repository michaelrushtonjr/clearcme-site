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
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function GapCourseFeed({ topic, hoursNeeded, limit = 3 }: GapCourseFeedProps) {
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
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        Recommended courses
      </p>
      <div className="space-y-2">
        {visible.map((course, i) => (
          <a
            key={i}
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-3 rounded-xl border border-brand-rule bg-brand-paper px-4 py-3 hover:border-brand-tealRule hover:shadow-card-1 transition-all group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-navy leading-snug group-hover:text-brand-teal transition-colors">
                {course.name}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="text-xs text-slate-500">{course.provider}</span>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-xs text-slate-500">{course.credits}</span>
                <span className="text-slate-300 text-xs">·</span>
                <span className={`text-xs font-semibold ${course.isFree ? "text-brand-emerald" : "text-slate-500"}`}>
                  {course.price}
                </span>
              </div>
            </div>
            <ExternalLinkIcon />
          </a>
        ))}
      </div>

      {catalog.courses.length > limit && (
        <Link
          href={`/courses/${slug}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-teal hover:text-brand-tealDeep"
        >
          Browse all {catalog.courses.length} {catalog.topicLabel} courses →
        </Link>
      )}
    </div>
  );
}
