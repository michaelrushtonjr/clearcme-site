/**
 * Display names for mandatory-requirement rows — shared by the Compliance
 * Map page and /api/compliance so no surface ever shows a raw topic enum.
 */

// Labels the generic Title Case transform gets wrong.
const TOPIC_LABELS: Record<string, string> = {
  END_OF_LIFE_CARE: "End-of-Life Care",
};

export function formatTopic(topic: string): string {
  return (
    TOPIC_LABELS[topic] ??
    topic
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/**
 * OTHER_MANDATORY is a storage bucket, not a requirement name. Rendering it
 * literally put "Other Mandatory" at the top of California's geriatric row and
 * buried "Geriatric medicine" inside the accordion. Prefer the state's own
 * wording whenever the topic key carries no meaning.
 */
export function requirementDisplayName(
  topic: string,
  description?: string | null,
  opts?: {
    /** The requirement is CONDITIONAL (gated on a practice condition) */
    isConditional?: boolean;
    /** Another requirement in the same rule shares this topic */
    topicIsDuplicated?: boolean;
  }
): string {
  if (topic === "OTHER_MANDATORY" && description?.trim()) return description.trim();
  // A license can carry two SUBSTANCE_USE requirements (a state one like SBIRT
  // plus the federal DEA MATE Act) — give the federal one its own row name so
  // the two are tellable apart at a glance.
  if (topic === "SUBSTANCE_USE" && /\bMATE\b/i.test(description ?? "")) return "DEA MATE Act";
  // Same-topic siblings (e.g. Michigan's every-renewal opioid hours next to a
  // conditional controlled-substance-license row) read as duplicates when both
  // carry the generic topic name — let the conditional one use the state's
  // own wording instead.
  if (opts?.topicIsDuplicated && opts?.isConditional && description?.trim()) {
    return description.trim();
  }
  return formatTopic(topic);
}
