/**
 * Splits a MandatoryRequirement's free-text `notes` back into its two parts.
 *
 * scripts/sync-rules-from-source.js writes notes as
 *   `${topic.hours} — ${topic.note}`
 * and the Compliance Map then glued that onto the state-level rule note with a
 * space, producing sentences that don't parse as English:
 *
 *   "10 hrs per cycle — If general internist or family physician with >25%
 *    elderly patients 50 hours (initial license issued for <13 months: 25 hours
 *    for first renewal); 2-year renewal cycle"
 *
 * Three separate facts — the requirement's hours, the practice condition that
 * gates it, and California's cycle length — read as one run-on claim. Splitting
 * them here lets the UI label each one.
 *
 * No em dash appears inside any `hours` value in lib/state-requirements.ts
 * (verified across all 331 topic rows), so the first " — " is an unambiguous
 * separator.
 */

const SEPARATOR = " — ";

export interface RequirementScope {
  /** The requirement's own hours phrasing, e.g. "10 hrs per cycle" */
  hoursLabel: string | null;
  /**
   * Everything after the separator: the practice condition for CONDITIONAL
   * requirements, an ordinary caveat otherwise. Callers label it by cadence.
   */
  detail: string | null;
}

export function parseRequirementNotes(notes?: string | null): RequirementScope {
  const raw = (notes ?? "").trim();
  if (!raw) return { hoursLabel: null, detail: null };

  const index = raw.indexOf(SEPARATOR);
  if (index === -1) return { hoursLabel: raw, detail: null };

  const hoursLabel = raw.slice(0, index).trim();
  const detail = raw.slice(index + SEPARATOR.length).trim();
  return { hoursLabel: hoursLabel || null, detail: detail || null };
}

/**
 * A one-line "who does this apply to?" for a conditional requirement, safe to
 * show on the collapsed row. Long board citations get trimmed — the full text
 * stays in the expanded detail and the source disclosure.
 */
export function shortConditionText(detail: string | null, maxLength = 92): string | null {
  if (!detail) return null;
  // Board citations and follow-on caveats live after the first semicolon;
  // the gating clause is what belongs on a one-line summary.
  const [first] = detail.split(/;\s+/);
  const clause = (first ?? detail).trim().replace(/[.,]$/, "");
  if (clause.length <= maxLength) return clause;
  return `${clause.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Turns a stored gating clause into something readable inline.
 *
 * Most clauses already open with "If …" ("If DEA-registered"), so we swap that
 * for "Only if …". Clauses phrased any other way ("Applies to physicians
 * holding a U.S. DEA registration number", "Exempt if no Oklahoma Bureau of
 * Narcotics authority") are left exactly as the board wrote them — inventing a
 * sentence frame around them is how you end up asserting something the source
 * doesn't say.
 */
export function conditionSummary(text: string | null): string | null {
  if (!text) return null;
  const match = /^if\s+([\s\S]+)$/i.exec(text.trim());
  return match ? `Only if ${match[1]}` : text.trim();
}
