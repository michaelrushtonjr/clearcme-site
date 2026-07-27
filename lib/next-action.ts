/**
 * Single prioritization engine for "what should I do next?"
 *
 * Both the dashboard hero card and the Compliance Map's UrgencyCard render
 * this engine's output, so the app always gives one consistent answer.
 *
 * Priority (merged heuristic, evaluated across ALL licenses):
 *   1. Fully compliant everywhere → audit-ready (green)
 *   2. Any non-compliant license renewing in <90 days → its biggest gap (red)
 *   3. Unmet one-time requirement — DEA MATE Act first, then biggest gap (amber)
 *   4. Biggest recurring mandatory gap on the soonest-renewal license (blue)
 *   5. General hours gap (blue)
 */

import { courseCtaLabel, courseDestination } from "@/lib/course-routing";

export interface MandatoryGapSummary {
  topic: string;
  gap: number;
  isMet: boolean;
  isUnknown?: boolean;
  /** Physician told us the requirement is out of scope for their practice */
  isNotApplicable?: boolean;
  /** firstRenewalOnly in the DB — a knock-it-out-once task */
  isOneTime: boolean;
}

export interface LicenseComplianceSummary {
  state: string;
  licenseType: string;
  daysUntilRenewal: number | null;
  /** Pre-formatted, e.g. "Dec 31, 2026" */
  renewalDateLabel: string;
  generalGapHours: number;
  /** Total hours the cycle requires — lets the copy tell "almost done" from "not started" */
  totalHoursRequired?: number;
  isCompliant: boolean;
  mandatoryGaps: MandatoryGapSummary[];
}

export type NextActionTheme = "red" | "amber" | "blue" | "green";

export interface NextActionRecommendation {
  theme: NextActionTheme;
  icon: string;
  headline: string;
  explanation: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaExternal: boolean;
  /** Short context line, e.g. "2.0 hrs short · one-time requirement" */
  sourceNote: string | null;
  /** Topic key driving the recommendation — used to default-open its accordion row */
  topic: string | null;
  /** License the recommendation targets */
  licenseState: string | null;
}

// ── Course discovery routes ───────────────────────────────────────────────────
// Destinations resolve through lib/course-routing so the hero card, the
// Compliance Map and the dashboard gap list can never disagree about where a
// topic's CME lives.

function courseUrl(topic: string): string {
  return courseDestination(topic).href;
}

function isExternal(topic: string): boolean {
  return courseDestination(topic).isExternal;
}

export function topicLabel(topic: string): string {
  const MAP: Record<string, string> = {
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
    SUBSTANCE_USE: "DEA MATE Act",
    SUICIDE_PREVENTION: "Suicide Prevention",
    OTHER_MANDATORY: "Mandatory Topic",
  };
  return (
    MAP[topic] ??
    topic
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function unmet(license: LicenseComplianceSummary): MandatoryGapSummary[] {
  return license.mandatoryGaps.filter((g) => !g.isMet && !g.isUnknown && !g.isNotApplicable);
}

function biggestGap(gaps: MandatoryGapSummary[]): MandatoryGapSummary | null {
  return [...gaps].sort((a, b) => b.gap - a.gap)[0] ?? null;
}

/** Sort: soonest renewal first, licenses without a renewal date last. */
function byRenewal(a: LicenseComplianceSummary, b: LicenseComplianceSummary) {
  if (a.daysUntilRenewal === null) return 1;
  if (b.daysUntilRenewal === null) return -1;
  return a.daysUntilRenewal - b.daysUntilRenewal;
}

export function buildNextAction(
  licenses: LicenseComplianceSummary[]
): NextActionRecommendation | null {
  if (licenses.length === 0) return null;

  const sorted = [...licenses].sort(byRenewal);
  const nonCompliant = sorted.filter((l) => !l.isCompliant);

  // ── 1. Fully compliant everywhere ──────────────────────────────────────────
  if (nonCompliant.length === 0) {
    const soonest = sorted[0];
    return {
      theme: "green",
      icon: "✓",
      headline: `You're compliant — next renewal: ${soonest.renewalDateLabel}`,
      explanation:
        "All CME requirements are met for this cycle. Keep uploading certificates as you earn them.",
      ctaLabel: "View your certificates",
      ctaUrl: "/dashboard/certificates",
      ctaExternal: false,
      sourceNote: null,
      topic: null,
      licenseState: soonest.state,
    };
  }

  // ── 2. Renewal pressure: any non-compliant license <90 days out ───────────
  const urgent = nonCompliant.find(
    (l) => l.daysUntilRenewal !== null && l.daysUntilRenewal < 90
  );
  if (urgent) {
    const gap = biggestGap(unmet(urgent));
    const name = gap ? topicLabel(gap.topic) : "general CME";
    return {
      theme: "red",
      icon: "!",
      headline: `${urgent.state} renewal in ${urgent.daysUntilRenewal} days — complete ${name} now`,
      explanation: `Your ${urgent.renewalDateLabel} renewal is approaching. Focus on your highest-priority gap first to avoid a compliance violation.`,
      ctaLabel: courseCtaLabel(gap?.topic ?? null, name),
      ctaUrl: gap ? courseUrl(gap.topic) : courseDestination(null).href,
      ctaExternal: gap ? isExternal(gap.topic) : courseDestination(null).isExternal,
      sourceNote: gap
        ? `${gap.gap.toFixed(1)} hrs short · ${urgent.daysUntilRenewal} days to renewal`
        : `${urgent.daysUntilRenewal} days to renewal`,
      topic: gap?.topic ?? null,
      licenseState: urgent.state,
    };
  }

  // ── 3. One-time requirements: knock them out early ────────────────────────
  // DEA MATE Act (SUBSTANCE_USE, federal) first, then biggest gap. Licenses
  // are scanned in renewal order so the nearest deadline's tasks surface first.
  for (const license of nonCompliant) {
    const oneTime = unmet(license)
      .filter((g) => g.isOneTime)
      .sort((a, b) => {
        if (a.topic === "SUBSTANCE_USE") return -1;
        if (b.topic === "SUBSTANCE_USE") return 1;
        return b.gap - a.gap;
      });
    if (oneTime.length > 0) {
      const req = oneTime[0];
      const label = topicLabel(req.topic);
      return {
        theme: "amber",
        icon: "📋",
        headline: `Complete your ${label} requirement — it's a one-time task`,
        explanation: `This is a mandatory one-time requirement for your ${license.state} license. You only have to do it once — best to knock it out now.`,
        ctaLabel: courseCtaLabel(req.topic, label),
        ctaUrl: courseUrl(req.topic),
        ctaExternal: isExternal(req.topic),
        sourceNote: `${req.gap.toFixed(1)} hrs short · one-time requirement`,
        topic: req.topic,
        licenseState: license.state,
      };
    }
  }

  // ── 4. Biggest recurring mandatory gap, soonest renewal first ─────────────
  for (const license of nonCompliant) {
    const gap = biggestGap(unmet(license));
    if (gap) {
      const label = topicLabel(gap.topic);
      const daysLabel =
        license.daysUntilRenewal !== null ? ` before ${license.renewalDateLabel}` : "";
      return {
        theme: "blue",
        icon: "📈",
        headline: `You're making progress — next: earn ${gap.gap.toFixed(1)} more hours in ${label}`,
        explanation: `You still have time${daysLabel}. Prioritise ${label} to chip away at your biggest mandatory gap.`,
        ctaLabel: courseCtaLabel(gap.topic, label),
        ctaUrl: courseUrl(gap.topic),
        ctaExternal: isExternal(gap.topic),
        sourceNote: `${gap.gap.toFixed(1)} hrs short · mandatory topic`,
        topic: gap.topic,
        licenseState: license.state,
      };
    }
  }

  // ── 5. Only general hours remain ───────────────────────────────────────────
  const withGeneralGap = nonCompliant.find((l) => l.generalGapHours > 0) ?? nonCompliant[0];
  const generalGap = withGeneralGap.generalGapHours;
  const cycleTotal = withGeneralGap.totalHoursRequired ?? 0;
  const earned = cycleTotal > 0 ? Math.max(0, cycleTotal - generalGap) : 0;
  // "Almost there" is a claim, not a mood — only make it once most of the
  // cycle is actually banked. At 0.0/50 it read as a bug.
  const nearlyDone = cycleTotal > 0 && earned / cycleTotal >= 0.75;
  const notStarted = earned === 0;

  // Topics awaiting the user's confirmation are not "satisfied" — saying so
  // while the rows below read "Needs your input" contradicts the same screen.
  const awaitingReview = withGeneralGap.mandatoryGaps.filter((g) => g.isUnknown).length;
  const mandatorySentence =
    awaitingReview > 0
      ? `No mandatory topic is currently short on hours, though ${awaitingReview} still ${awaitingReview === 1 ? "needs" : "need"} your confirmation below.`
      : "You've satisfied all mandatory topic requirements.";

  const headline = nearlyDone
    ? `Almost there — just ${generalGap.toFixed(1)} general hours left before ${withGeneralGap.renewalDateLabel}`
    : notStarted
    ? `${generalGap.toFixed(1)} general hours to log before ${withGeneralGap.renewalDateLabel}`
    : `${generalGap.toFixed(1)} general hours left before ${withGeneralGap.renewalDateLabel}`;

  const generalDestination = courseDestination(null);
  return {
    theme: "blue",
    icon: nearlyDone ? "🏁" : "📈",
    headline,
    explanation: `${mandatorySentence} Keep adding accredited CME hours to complete your cycle.`,
    ctaLabel: "Find general CME →",
    ctaUrl: generalDestination.href,
    ctaExternal: generalDestination.isExternal,
    sourceNote: `${generalGap.toFixed(1)} general hrs · ${withGeneralGap.state}`,
    topic: null,
    licenseState: withGeneralGap.state,
  };
}
