import { COURSE_CATALOG, type Course, type RequirementTag } from "@/lib/courses";
import type { CourseMatch } from "@/components/console/FillWhatsLeft";

/**
 * "Fill what's left" matcher (Phase 5, Track A).
 *
 * A user gap is (state, topic); its canonical requirement ID is
 * "{STATE}:{TOPIC}" (see RequirementTag in lib/courses.ts). For each open gap
 * we select catalog courses carrying that tag WITH a verified mapping, sorted
 * price ascending. Cross-credit badge = the course's verified tags intersect
 * the user's open-gap set in ≥ 2 places.
 *
 * Display floor: unverified tags never match; a gap with zero verified
 * matches gets an empty list (the card renders nothing).
 */

export interface OpenGap {
  /** Two-letter state code, or "DEA" for the federal MATE requirement */
  scope: string;
  /** SpecialTopic enum value, e.g. "SUBSTANCE_USE" */
  topic: string;
}

export function requirementTagId(scope: string, topic: string): string {
  return `${scope.toUpperCase()}:${topic.toUpperCase()}`;
}

function verifiedTags(course: Course): RequirementTag[] {
  return (course.requirementTags ?? []).filter(
    (t) => !!t.mappingVerified?.date && !!t.mappingVerified?.by
  );
}

function priceUsd(course: Course): number {
  if (course.isFree) return 0;
  const m = course.price.match(/\$?\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

function hoursOf(course: Course): number {
  const m = course.credits.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

/** Short display form of a canonical tag id, e.g. "CA:SUBSTANCE_USE" → "CA Substance Use" */
function tagLabel(id: string): string {
  const [scope, topic] = id.split(":");
  const words = (topic ?? "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${scope} ${words}`;
}

const allCourses: Course[] = Object.values(COURSE_CATALOG).flatMap((c) => c.courses);

/**
 * Matches for ONE open gap, given the user's full open-gap set (for the
 * cross-credit badge). Returns [] when nothing verified matches.
 */
export function matchCoursesForGap(gap: OpenGap, allOpenGaps: OpenGap[]): CourseMatch[] {
  const gapId = requirementTagId(gap.scope, gap.topic);
  const openIds = new Set(allOpenGaps.map((g) => requirementTagId(g.scope, g.topic)));

  const matches: CourseMatch[] = [];
  for (const course of allCourses) {
    const tags = verifiedTags(course);
    if (!tags.some((t) => t.id.toUpperCase() === gapId)) continue;

    const openTagIds = tags
      .map((t) => t.id.toUpperCase())
      .filter((id) => openIds.has(id));

    matches.push({
      id: `${course.provider}:${course.name}`,
      name: course.name,
      provider: course.provider,
      accreditation: course.accreditation ?? course.creditType.replace(/_/g, " "),
      hours: hoursOf(course),
      priceUsd: priceUsd(course),
      url: course.url,
      fillTags: openTagIds.map(tagLabel),
      countsInPlaces: openTagIds.length,
    });
  }

  return matches.sort((a, b) => a.priceUsd - b.priceUsd);
}
