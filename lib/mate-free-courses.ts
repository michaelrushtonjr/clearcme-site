import { COURSE_CATALOG, type Course } from "./courses";

/**
 * Free, DEA MATE Act-qualifying courses, derived LIVE from COURSE_CATALOG.
 *
 * Deliberately computed rather than hardcoded: `lib/courses.ts` is maintained
 * daily by Scout/COO (dead-link pulls, price corrections, adds). A hardcoded
 * copy on /mate-act would silently rot into exactly the kind of wrong public
 * claim the fleet exists to prevent.
 *
 * Hours are read with `parseHours`, which requires the number to be ATTACHED to
 * an hours unit. Do not "simplify" this to Number.parseFloat(credits) — that was
 * the first implementation and it is wrong in both directions against real
 * catalog strings:
 *
 *   "14 modules — credit hours vary per module..."  parseFloat -> 14   (OVERCLAIMS
 *                                                   a module count as 14 hours, and
 *                                                   published it as covering all 8)
 *   "Up to 10.25 hours AMA PRA Category 1"          parseFloat -> NaN  (UNDERCLAIMS
 *                                                   a course that does cover 8)
 *
 * Overclaiming here is a public compliance-adjacent statement about a physician's
 * DEA obligation, so anything unrecognised sorts to 0 and lands in `partial`.
 * The exact `credits` string is always rendered next to the course, so a reader
 * can see "Up to 10.25 hours" and judge for themselves.
 */
export type MateCourse = Course & { hours: number };

/** First number in `credits` that is directly qualified by an hours unit. */
function parseHours(credits: string): number {
  const match = /([\d.]+)\s*(?:hours?|hrs?)\b/i.exec(credits);
  return match ? Number.parseFloat(match[1]) || 0 : 0;
}

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
      all.push({ ...course, hours: parseHours(course.credits) });
    }
  }

  all.sort((a, b) => b.hours - a.hours);
  return {
    full: all.filter((c) => c.hours >= 8),
    partial: all.filter((c) => c.hours < 8),
  };
}
