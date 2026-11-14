// Helpers for the certificate review forms. Client-safe: no Prisma import, so
// the upload screen and the Certificates page can share one set of rules.

const SPECIAL_TOPIC_LABELS: Record<string, string> = {
  OPIOID_PRESCRIBING: "Opioid Prescribing",
  PAIN_MANAGEMENT: "Pain Management",
  IMPLICIT_BIAS: "Implicit Bias",
  END_OF_LIFE_CARE: "End-of-Life Care",
  DOMESTIC_VIOLENCE: "Domestic Violence",
  CHILD_ABUSE: "Child Abuse",
  ELDER_ABUSE: "Elder Abuse",
  HUMAN_TRAFFICKING: "Human Trafficking",
  INFECTION_CONTROL: "Infection Control",
  PATIENT_SAFETY: "Patient Safety",
  ETHICS: "Ethics",
  CULTURAL_COMPETENCY: "Cultural Competency",
  SUBSTANCE_USE: "Substance Use / MATE Act",
  SUICIDE_PREVENTION: "Suicide Prevention",
  OTHER_MANDATORY: "Mandatory Topic",
};

export function formatSpecialTopic(topic: string): string {
  return (
    SPECIAL_TOPIC_LABELS[topic] ??
    topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

/** The fields of a stored certificate the review forms read. */
export interface ReviewableCertificate {
  activityDate?: Date | string | null;
  creditHours?: number | null;
  hoursEarned?: number | null;
  activityMaxHours?: number | null;
  specialTopics?: string[] | null;
  extractedSpecialTopics?: string[] | null;
  suggestedSpecialTopics?: string[] | null;
  topicHourAllocations?: unknown;
}

/** Format a Date/ISO string as the value an <input type="date"> expects. */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

const positive = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/**
 * Where the hours in the review form came from:
 * - "earned": the certificate states what this physician earned.
 * - "activity_maximum": only the activity's maximum was found. The form offers
 *   it as a suggestion and says so; it is saved only when the physician
 *   confirms, never on its own.
 * - "none": nothing was read.
 */
export type HoursSource = "earned" | "activity_maximum" | "none";

export interface ReviewPrefill {
  /** yyyy-mm-dd, or "" when no date was read. */
  date: string;
  /** Text for the hours input, or "" when no hours were read. */
  hours: string;
  hoursSource: HoursSource;
  activityMaxHours: number | null;
}

/** What the review form should start with, from what the server returned. */
export function reviewPrefill(cert: ReviewableCertificate): ReviewPrefill {
  const date = toDateInputValue(cert.activityDate);
  const activityMaxHours = positive(cert.activityMaxHours);
  const earned = positive(cert.hoursEarned) ?? positive(cert.creditHours);
  if (earned !== null) return { date, hours: String(earned), hoursSource: "earned", activityMaxHours };
  if (activityMaxHours !== null) return { date, hours: String(activityMaxHours), hoursSource: "activity_maximum", activityMaxHours };
  return { date, hours: "", hoursSource: "none", activityMaxHours };
}

/** Mandated topics the server found for a certificate: confirmed first, then read from the certificate, then inferred from its title. */
export function detectedTopics(cert: ReviewableCertificate): string[] {
  return [
    ...new Set([
      ...(cert.specialTopics ?? []),
      ...(cert.extractedSpecialTopics ?? []),
      ...(cert.suggestedSpecialTopics ?? []),
    ]),
  ];
}

/**
 * Starting hours for each topic input. A saved split wins. Otherwise the first
 * topic starts with all of the certificate's hours and the rest with 0 — the
 * same hours can only be counted once, which is also how the compliance engine
 * reads a certificate with no recorded split.
 */
export function defaultTopicSplit(topics: string[], hours: number | null | undefined, allocations?: unknown): Record<string, string> {
  const saved =
    allocations && typeof allocations === "object" && !Array.isArray(allocations)
      ? (allocations as Record<string, unknown>)
      : {};
  const hasSaved = topics.some((topic) => positive(saved[topic]) !== null);
  const total = positive(hours) ?? 0;
  return Object.fromEntries(
    topics.map((topic, index) => [
      topic,
      String(hasSaved ? positive(saved[topic]) ?? 0 : index === 0 ? total : 0),
    ]),
  );
}

export interface TopicAllocationResult {
  /** Topics with more than 0 hours, ready to send as topicHourAllocations. */
  allocations: Record<string, number>;
  error: string | null;
}

/** Reads the topic inputs into the payload the certificate API expects, with the same limits the server enforces. */
export function topicAllocationsFromSplit(split: Record<string, string>, hours: number | null | undefined): TopicAllocationResult {
  const allocations: Record<string, number> = {};
  for (const [topic, raw] of Object.entries(split)) {
    const value = raw.trim() === "" ? 0 : Number(raw);
    if (!Number.isFinite(value) || value < 0) return { allocations: {}, error: "Topic hours must be a number, 0 or more." };
    if (value > 0) allocations[topic] = value;
  }
  const assigned = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  if (assigned === 0) return { allocations: {}, error: null };
  const total = positive(hours);
  if (total === null) return { allocations: {}, error: "Enter the hours you earned before assigning hours to a topic." };
  if (assigned > total) {
    return { allocations: {}, error: `Topic hours can't add up to more than the ${total} hour${total === 1 ? "" : "s"} on this certificate.` };
  }
  return { allocations, error: null };
}
