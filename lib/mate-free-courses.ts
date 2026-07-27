import { COURSE_CATALOG, type Course } from "./courses";

/**
 * Free, DEA MATE Act-qualifying courses, derived LIVE from COURSE_CATALOG.
 *
 * Deliberately computed rather than hardcoded: `lib/courses.ts` is maintained
 * daily by Scout/COO (dead-link pulls, price corrections, adds). A hardcoded
 * copy on /mate-act would silently rot into exactly the kind of wrong public
 * claim the fleet exists to prevent.
 *
 * `credits` strings begin with a parseable number ("8.0 hours AMA PRA ..."),
 * which is how a course that covers the full requirement on its own is told
 * apart from one that merely counts toward it. Anything unparseable sorts to
 * 0 and lands in `partial` — the conservative side.
 */
export type MateCourse = Course & { hours: number };

const MATE_TOPIC_KEYS = ["OPIOID_PRESCRIBING", "SUBSTANCE_USE"] as const;

export function getFreeMateCourses(): { full: MateCourse[]; partial: MateCourse[] } {
  const seen = new Set<string>();
  const all: MateCourse[] = [];

  for (const key of MATE_TOPIC_KEYS) {
    for (const course of COURSE_CATALOG[key]?.courses ?? []) {
      if (!course.deaMateCompliant || !course.isFree) continue;
      const dedupeKey = `${course.name}|${course.url}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      all.push({ ...course, hours: Number.parseFloat(course.credits) || 0 });
    }
  }

  all.sort((a, b) => b.hours - a.hours);
  return {
    full: all.filter((c) => c.hours >= 8),
    partial: all.filter((c) => c.hours < 8),
  };
}
