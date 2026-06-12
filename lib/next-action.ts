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

export interface MandatoryGapSummary {
  topic: string;
  gap: number;
  isMet: boolean;
  isUnknown?: boolean;
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
/** Topics that have a /courses/[slug] page — route internally */
const INTERNAL_COURSE_TOPICS = new Set([
  "SUBSTANCE_USE",
  "OPIOID_PRESCRIBING",
  "ETHICS",
  "IMPLICIT_BIAS",
  "PATIENT_SAFETY",
  "SUICIDE_PREVENTION",
  "DOMESTIC_VIOLENCE",
  "HUMAN_TRAFFICKING",
]);

const DEFAULT_CME_URL = "https://www.medscape.com/cme";

function courseUrl(topic: string): string {
  if (INTERNAL_COURSE_TOPICS.has(topic)) {
    return `/courses/${topic.toLowerCase().replace(/_/g, "-")}`;
  }
  const PARTNER_FALLBACK: Record<string, string> = {
    INFECTION_CONTROL: "https://home.hippoed.com/abxstewardship",
  };
  return PARTNER_FALLBACK[topic] ?? DEFAULT_CME_URL;
}

function isExternal(topic: string): boolean {
  return !INTERNAL_COURSE_TOPICS.has(topic);
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
  return license.mandatoryGaps.filter((g) => !g.isMet && !g.isUnknown);
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
      ctaLabel: `Find ${name} CME →`,
      ctaUrl: gap ? courseUrl(gap.topic) : DEFAULT_CME_URL,
      ctaExternal: gap ? isExternal(gap.topic) : true,
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
        ctaLabel: `Find ${label} CME →`,
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
        ctaLabel: `Find ${label} CME →`,
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
  return {
    theme: "blue",
    icon: "🏁",
    headline: `Almost there — just ${withGeneralGap.generalGapHours.toFixed(1)} general hours left before ${withGeneralGap.renewalDateLabel}`,
    explanation:
      "You've satisfied all mandatory topic requirements. Keep adding CME hours to complete your cycle.",
    ctaLabel: "Find general CME →",
    ctaUrl: DEFAULT_CME_URL,
    ctaExternal: true,
    sourceNote: `${withGeneralGap.generalGapHours.toFixed(1)} general hrs · ${withGeneralGap.state}`,
    topic: null,
    licenseState: withGeneralGap.state,
  };
}
