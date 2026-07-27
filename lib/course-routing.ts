import { COURSE_CATALOG, keyToSlug } from "@/lib/courses";

/**
 * One place that answers "where do I send someone who needs CME in <topic>?"
 *
 * Before this module the answer lived in three places that had quietly drifted
 * apart: a hand-maintained topic allow-list in lib/next-action.ts, a bare
 * `/courses/<slug>` template on the Compliance Map, and another on the
 * dashboard gap list. The allow-list missed two catalogs we actually have
 * (general Category 1 and end-of-life care) and dumped those users on
 * medscape.com; the bare templates 404'd for every topic without its own
 * catalog. Route through courseDestination() so all three stay in step.
 */

/** The catalog bucket holding plain AMA PRA Category 1 activities. */
export const GENERAL_CATALOG_KEY = "GENERAL_CATEGORY_1";

/**
 * DB SpecialTopic → COURSE_CATALOG key, for topics whose curated list lives
 * under a differently-named bucket.
 *
 * Only same-subject aliases belong here. A topic with no honest curated match
 * is deliberately absent: it falls through to general Category 1 and the button
 * that sent them there says so, rather than implying a vetted list we don't have.
 */
const TOPIC_ALIASES: Record<string, string> = {
  // The implicit-bias catalog is titled "Implicit Bias / Cultural Competency".
  CULTURAL_COMPETENCY: "IMPLICIT_BIAS",
  // The opioid catalog is explicitly scoped to "state opioid, pain, or
  // DEA-related requirements".
  PAIN_MANAGEMENT: "OPIOID_PRESCRIBING",
};

/** Partner destinations that beat anything in the internal catalog. */
const PARTNER_DESTINATIONS: Record<string, string> = {
  INFECTION_CONTROL: "https://home.hippoed.com/abxstewardship",
};

export interface CourseDestination {
  href: string;
  /** true when the href leaves clearcme.ai */
  isExternal: boolean;
  /** true when the destination is a list curated for this exact topic */
  isExactMatch: boolean;
  /** COURSE_CATALOG key actually being shown, when internal */
  catalogKey: string | null;
}

/**
 * Resolve a mandatory-topic key (or null, meaning general hours) to a
 * destination that is guaranteed to render.
 */
export function courseDestination(topic?: string | null): CourseDestination {
  const key = (topic ?? "").toUpperCase() || GENERAL_CATALOG_KEY;

  const partner = PARTNER_DESTINATIONS[key];
  if (partner) {
    return { href: partner, isExternal: true, isExactMatch: true, catalogKey: null };
  }

  const catalogKey = TOPIC_ALIASES[key] ?? key;
  if (COURSE_CATALOG[catalogKey]) {
    return {
      href: `/courses/${keyToSlug(catalogKey)}`,
      isExternal: false,
      isExactMatch: true,
      catalogKey,
    };
  }

  // No curated list for this topic yet — general Category 1 is the honest
  // fallback, and callers label the button accordingly.
  return {
    href: `/courses/${keyToSlug(GENERAL_CATALOG_KEY)}`,
    isExternal: false,
    isExactMatch: false,
    catalogKey: GENERAL_CATALOG_KEY,
  };
}

/**
 * CTA text for a course link. Falls back to a neutral label when we are sending
 * someone to general Category 1 because no curated list exists for their topic —
 * "Find Elder Abuse CME" pointing at a general list would be a promise we can't keep.
 */
export function courseCtaLabel(topic: string | null | undefined, topicName: string): string {
  const destination = courseDestination(topic);
  if (!topic) return "Find general CME →";
  if (destination.isExactMatch) return `Find ${topicName} CME →`;
  return "Browse accredited CME →";
}
