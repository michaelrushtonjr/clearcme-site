/**
 * GapCourseFeed
 *
 * Lists the catalog's courses beneath a compliance gap card: the first few
 * inline, the rest behind a "show more" disclosure, for every plan.
 * Pulls from COURSE_CATALOG keyed by mandatory topic.
 * Phase 1 — curated links only, no partner API.
 */

import Link from "next/link";
import { COURSE_CATALOG, keyToSlug, type Course } from "@/lib/courses";

interface GapCourseFeedProps {
  topic: string; // COURSE_CATALOG key e.g. "OPIOID_PRESCRIBING"
  hoursNeeded: number;
  /** Courses shown before the "show more" disclosure. Default 3. */
  limit?: number;
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

/** Free first, then by hours of CME, longest first. */
export function sortCoursesForGap(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    if (a.isFree && !b.isFree) return -1;
    if (!a.isFree && b.isFree) return 1;
    const aHrs = parseFloat(a.credits) || 0;
    const bHrs = parseFloat(b.credits) || 0;
    return bHrs - aHrs;
  });
}

function CourseRow({ course, divided }: { course: Course; divided: boolean }) {
  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--c1b-hover-wash,rgba(46,74,44,0.05))]"
      style={divided ? { borderTop: "1px solid var(--c1b-border-row, rgba(16,22,19,.06))" } : undefined}
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
  );
}

export function GapCourseFeed({ topic, hoursNeeded, limit = 3 }: GapCourseFeedProps) {
  const catalog = COURSE_CATALOG[topic];
  if (!catalog || catalog.courses.length === 0) return null;

  const sorted = sortCoursesForGap(catalog.courses);
  const first = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const slug = keyToSlug(topic);
  const boxStyle = {
    border: "1px solid var(--c1b-border-card, rgba(16,22,19,.13))",
    borderRadius: 8,
    background: "var(--c1b-card, #FBFAF5)",
    overflow: "hidden",
  } as const;

  return (
    <div className="mt-4">
      <p className="mono-label mb-2" style={{ color: "var(--c1b-muted, #656C60)" }}>
        Recommended courses · {hoursNeeded.toFixed(1)} hrs needed
      </p>
      <div style={boxStyle}>
        {first.map((course, i) => (
          <CourseRow key={`${i}:${course.url}`} course={course} divided={i > 0} />
        ))}
      </div>

      {rest.length > 0 && (
        <details className="mt-2">
          <summary
            className="hover:underline"
            style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--c1b-green, #2E4A2C)" }}
          >
            Show {rest.length} more {catalog.topicLabel} {rest.length === 1 ? "course" : "courses"}
          </summary>
          <div className="mt-2" style={boxStyle}>
            {rest.map((course, i) => (
              <CourseRow key={`${i}:${course.url}`} course={course} divided={i > 0} />
            ))}
          </div>
        </details>
      )}

      <Link
        href={`/courses/${slug}`}
        className="mt-2 inline-flex items-center gap-1 hover:underline"
        style={{ fontSize: 12, fontWeight: 600, color: "var(--c1b-green, #2E4A2C)" }}
      >
        Prices and details in the course library →
      </Link>
    </div>
  );
}
