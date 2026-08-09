import { parseRequirementNotes } from "@/lib/requirement-scope";

/**
 * Turns state-board conditional requirements into questions a physician can
 * actually answer at signup.
 *
 * Roughly a tenth of the mandatory requirements in the rule set don't bind
 * every licensee — California's 10 geriatric hours only apply to a general
 * internist or family physician whose panel is >25% elderly; a dozen states
 * gate controlled-substance CME on holding a DEA registration. A license state
 * and degree type can't answer any of that, so those rows used to land on the
 * Compliance Map as permanently unresolved "Needs your input" cards with the
 * reason hidden two clicks deep.
 *
 * ── Two rules govern what belongs in this file ──────────────────────────────
 *
 * 1. Only *applicability* conditions. A clause that qualifies a requirement's
 *    content or start date rather than whether it binds you at all — Illinois's
 *    maternal-health content rule, Texas's not-until-Sept-2026 date, Nevada's
 *    "applies to all NV DOs" — must never become a question. Turning one into a
 *    yes/no would let a physician answer their way out of a universal
 *    requirement.
 *
 * 2. Patterns anchor to the start of the board's own clause, and every pattern
 *    here was checked against the full conditional set. A greedy match (say,
 *    anything containing "controlled substances") would have swallowed Nevada's
 *    universal DO rule. When a clause doesn't match, nothing breaks: the
 *    requirement simply keeps asking on the Compliance Map, which is the
 *    conservative outcome.
 */

export interface ConditionDefinition {
  key: string;
  /** Yes/no question, asked once even when several states share it */
  question: string;
  help?: string;
  /** true when "yes" means the requirement binds the physician */
  appliesOnYes: boolean;
  /** Anchored patterns tested against the board's gating clause */
  patterns: RegExp[];
}

export const CONDITION_DEFINITIONS: ConditionDefinition[] = [
  {
    key: "CONTROLLED_SUBSTANCES",
    question:
      "Do you hold a DEA registration, or otherwise prescribe or dispense controlled substances?",
    help:
      "Several states tie their opioid and controlled-substance CME to DEA registration or a state controlled-substance license, and the federal DEA MATE Act training applies wherever you're registered. Answer yes if either is true — you can switch any individual requirement off later.",
    appliesOnYes: true,
    patterns: [
      /^if\s+dea[-\s]registered/i,
      /^if\s+dea\s+registrant/i,
      /^if\s+dea[-\s]registered\s+and\s+authorized\s+to\s+prescribe/i,
      /^if\s+dea\s+registration\s+authorizes/i,
      /^if\s+schedule\s+ii\s+prescriber\s+with\s+dea/i,
      /^if\s+authorized\s+to\s+prescribe\s+schedule\s+ii/i,
      /^if\s+prescribing\s+controlled\s+substances/i,
      /^if\s+prescribing\s+opioid/i,
      /^if\s+registered\s+to\s+dispense\s+controlled\s+substances/i,
      /^if\s+practicing\s+in\s+new\s+mexico\s+with\s+a\s+nm\s+controlled-substance\s+licen[cs]e/i,
      /^within\s+first\s+year\s+of\s+licensure\s+and\s+each\s+renewal\s+if\s+dea/i,
      /^exempt\s+if\s+no\s+[^.;]*\bdea\b/i,
      /^applies\s+to\s+physicians\s+holding\s+a\s+u\.?s\.?\s+dea\s+registration/i,
      /^for\s+active\s+\w+\s+csr\s+holders/i,
      /^separate\s+controlled-substance\s+licen[cs]e\s+condition/i,
    ],
  },
  {
    key: "GERIATRIC_PANEL",
    question:
      "Are you a general internist or family physician whose patients are more than 25% elderly?",
    help: "California requires 10 hours of geriatric medicine per cycle from those physicians only.",
    appliesOnYes: true,
    patterns: [/^if\s+general\s+internist\s+or\s+family\s+physician\s+with\s+>?\s*25%/i],
  },
  {
    key: "OPIOID_PAIN_PANEL",
    question:
      "Are opioid pain-management patients half or more of your panel, without board certification in pain medicine or palliative care?",
    help: "Georgia requires 20 hours per cycle from physicians who meet both halves of that test.",
    appliesOnYes: true,
    patterns: [/^if\s+not\s+pain\/palliative-certified\s+and\s+opioid\s+pain-management\s+patients/i],
  },
  {
    key: "PERINATAL_CARE",
    question: "Do you provide perinatal care?",
    help: "New Jersey requires an hour of implicit-bias training in perinatal care from those who do.",
    appliesOnYes: true,
    patterns: [/^if\s+providing\s+perinatal\s+care/i],
  },
  {
    key: "OFFICE_BASED_ANESTHESIA",
    question:
      "Do you administer office-based anesthesia without an anesthesiologist or CRNA present?",
    help: "Virginia attaches resuscitation certification and anesthesia CE to that practice pattern.",
    appliesOnYes: true,
    patterns: [/^scope-specific\s+rule\s+for\s+physicians\s+administering\s+office-based\s+anesthesia/i],
  },
  {
    key: "DELAWARE_ADULT_PRACTICE",
    question: "Do you treat patients aged 26 or older in Delaware?",
    help: "Delaware's Alzheimer's and dementia requirement starts with 2027 renewals for those physicians.",
    appliesOnYes: true,
    patterns: [/^applies\s+unless\s+not\s+treating\s+adults\s+26\+/i],
  },
  {
    key: "TENNESSEE_PAIN_EXEMPTION",
    question:
      "Are you board certified in pain management, anesthesiology, PM&R, neurology or rheumatology — or practising at a registered Tennessee pain management clinic?",
    help:
      "Tennessee's controlled-substance CME applies to every licensee except those groups (T.C.A. 63-1-402(c)), so answering yes marks it exempt.",
    // Inverted: yes identifies the exemption, not the obligation.
    appliesOnYes: false,
    patterns: [/^applies\s+to\s+all\s+licensees\s+unless\s+exempt\s+under\s+t\.?c\.?a\.?/i],
  },
];

export type ConditionAnswer = "yes" | "no";

/** The gating clause a requirement is matched on. */
export function requirementConditionClause(notes?: string | null): string | null {
  return parseRequirementNotes(notes).detail;
}

/**
 * Match a conditional requirement to a question, or null when its clause isn't
 * one we can ask about safely.
 */
export function matchCondition(notes?: string | null): ConditionDefinition | null {
  const clause = requirementConditionClause(notes);
  if (!clause) return null;
  const trimmed = clause.trim();
  return (
    CONDITION_DEFINITIONS.find((definition) =>
      definition.patterns.some((pattern) => pattern.test(trimmed))
    ) ?? null
  );
}

/**
 * The attestation to record for an answer: "applies" is stored as
 * not-yet-completed, which is what it is at signup — the physician can mark it
 * complete or upload a certificate from the Compliance Map.
 */
export function actionForAnswer(
  definition: ConditionDefinition,
  answer: ConditionAnswer
): "not_completed" | "not_applicable" {
  const applies = definition.appliesOnYes ? answer === "yes" : answer === "no";
  return applies ? "not_completed" : "not_applicable";
}
