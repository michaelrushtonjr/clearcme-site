import type { Course } from "@/lib/courses";

/**
 * What a course's provider says about a state licensure requirement.
 *
 * Read-only over the catalog: the only input is each course's
 * `stateAcceptance` note (Scout-sourced, COO-verified against the provider's
 * page). Nothing here adds a statement the catalog does not carry, and the
 * wording always attributes the statement to the provider — ClearCME does not
 * certify it and neither does the line imply the board has.
 *
 * Deliberately narrow, because the notes are free text:
 * - Florida and Pennsylvania only (the two renewal paths in the Nov 2026
 *   campaign). Add a state by adding it to STATES and REQUIREMENT_NAME.
 * - A clause must name the state in full, or cite its board or statute
 *   ("FL Board of ...", "PA Act 31"). Bare abbreviations do not count:
 *   "MD/PA" means physician assistant, and "meets FL and PA requirements"
 *   names no source.
 * - The clause must also say the course is approved for, satisfies, meets or
 *   is marketed for something. "Content from Pennsylvania's state medical
 *   society" is not a statement that a requirement is met.
 * - A clause containing a negation ("not approved for ...") is never a claim.
 */
export type ClaimState = "FL" | "PA";

export interface ProviderStateClaim {
  state: ClaimState;
  stateName: string;
  /** "stated": the provider says it is approved for / satisfies the requirement. "marketed": the provider sells it for the requirement. */
  kind: "stated" | "marketed";
  /** The full card line, attributed to the provider. */
  text: string;
}

const STATES: Record<ClaimState, { name: string; mention: RegExp }> = {
  FL: { name: "Florida", mention: /\bFlorida\b|\bFL Board of\b/ },
  PA: { name: "Pennsylvania", mention: /\bPennsylvania\b|\bPA Act \d+\b/ },
};

/** Requirement names as lib/state-requirements.ts labels them, by state and catalog topic. */
const REQUIREMENT_NAME: Record<string, string> = {
  "FL:PATIENT_SAFETY": "Florida's prevention of medical errors requirement",
  "FL:DOMESTIC_VIOLENCE": "Florida's domestic violence requirement",
  "FL:HUMAN_TRAFFICKING": "Florida's human trafficking requirement",
  "PA:PATIENT_SAFETY": "Pennsylvania's patient safety and risk management requirement",
  "PA:CHILD_ABUSE": "Pennsylvania's child abuse recognition and reporting requirement (Act 31)",
  "PA:ORGAN_DONATION": "Pennsylvania's organ and tissue donation requirement (Act 90)",
};

const MARKETED = /\bmarketed (?:for|as)\b/i;
const STATED = /\bsatisf(?:y|ies|ied)\b|\bapproved\b|\bmeets?\b|\bmeeting\b|\bfulfil\w*\b|\bAct \d+\b/i;
const NEGATED = /\bnot\b|\bno\b|n't\b|\bnever\b|\bunverified\b|\bpending\b|\bexpired\b/i;
const GENERIC = /^(?:accepted by )?all states accepting\b/i;

function clauses(note: string): string[] {
  return note.split(";").map((clause) => clause.trim()).filter(Boolean);
}

/**
 * Provider statements about Florida or Pennsylvania requirements for one
 * course. `topicKey` is the COURSE_CATALOG key the course is listed under; it
 * picks the requirement's name. At most one claim per state.
 */
export function providerStateClaims(course: Pick<Course, "stateAcceptance">, topicKey: string): ProviderStateClaim[] {
  const note = course.stateAcceptance;
  if (!note) return [];
  const claims: ProviderStateClaim[] = [];
  for (const state of Object.keys(STATES) as ClaimState[]) {
    const { name, mention } = STATES[state];
    const clause = clauses(note).find(
      (part) => !GENERIC.test(part) && mention.test(part) && !NEGATED.test(part) && (MARKETED.test(part) || STATED.test(part)),
    );
    if (!clause) continue;
    const kind = MARKETED.test(clause) ? "marketed" : "stated";
    const requirement = REQUIREMENT_NAME[`${state}:${topicKey.toUpperCase()}`] ?? `a ${name} licensure requirement`;
    claims.push({
      state,
      stateName: name,
      kind,
      text: kind === "marketed"
        ? `Provider markets this course for ${requirement}.`
        : `Provider states this course counts for ${requirement}.`,
    });
  }
  return claims;
}

/** The provider's statement for one state (two-letter code), or null. */
export function providerStateClaimFor(
  course: Pick<Course, "stateAcceptance">,
  topicKey: string,
  state: string | null | undefined,
): ProviderStateClaim | null {
  const code = (state ?? "").toUpperCase();
  return providerStateClaims(course, topicKey).find((claim) => claim.state === code) ?? null;
}
