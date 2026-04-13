"use client";

import Link from "next/link";

interface MandatoryGapSummary {
  topic: string;
  gap: number;
  isMet: boolean;
  isOneTime: boolean; // firstRenewalOnly in the DB
}

export interface NextActionCardProps {
  daysUntilRenewal: number | null;
  renewalDateLabel: string;
  generalGapHours: number;
  mandatoryGaps: MandatoryGapSummary[];
  isFullyCompliant: boolean;
  licenseState: string;
}

// ── Internal course discovery routes ─────────────────────────────────────────
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

function courseUrl(topic: string): string {
  if (INTERNAL_COURSE_TOPICS.has(topic)) {
    return `/courses/${topic.toLowerCase().replace(/_/g, "-")}`;
  }
  // Fallback for topics without a discovery page yet
  const PARTNER_FALLBACK: Record<string, string> = {
    INFECTION_CONTROL: "https://home.hippoed.com/abxstewardship",
  };
  return PARTNER_FALLBACK[topic] ?? DEFAULT_CME_URL;
}

const DEFAULT_CME_URL = "https://www.medscape.com/cme";

function topicLabel(topic: string): string {
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

// ── Theme helpers ─────────────────────────────────────────────────────────────
type Theme = "red" | "amber" | "blue" | "green";

function themeClasses(theme: Theme) {
  switch (theme) {
    case "red":
      return {
        wrapper: "bg-red-50 border-red-300",
        icon: "bg-red-100 text-red-600",
        headline: "text-red-900",
        body: "text-red-800",
        cta: "bg-red-600 hover:bg-red-700 text-white",
      };
    case "amber":
      return {
        wrapper: "bg-amber-50 border-amber-300",
        icon: "bg-amber-100 text-amber-600",
        headline: "text-amber-900",
        body: "text-amber-800",
        cta: "bg-amber-600 hover:bg-amber-700 text-white",
      };
    case "blue":
      return {
        wrapper: "bg-blue-50 border-blue-200",
        icon: "bg-blue-100 text-blue-600",
        headline: "text-blue-900",
        body: "text-blue-800",
        cta: "bg-blue-600 hover:bg-blue-700 text-white",
      };
    case "green":
      return {
        wrapper: "bg-green-50 border-green-200",
        icon: "bg-green-100 text-green-600",
        headline: "text-green-900",
        body: "text-green-800",
        cta: "bg-green-600 hover:bg-green-700 text-white",
      };
  }
}

// ── Compute the single recommendation ────────────────────────────────────────
interface Recommendation {
  theme: Theme;
  icon: string;
  headline: string;
  explanation: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaExternal: boolean;
}

function buildRecommendation(props: NextActionCardProps): Recommendation {
  const {
    daysUntilRenewal,
    renewalDateLabel,
    generalGapHours,
    mandatoryGaps,
    isFullyCompliant,
  } = props;

  const unmetMandatory = mandatoryGaps.filter((g) => !g.isMet);
  const highestGapMandatory = [...unmetMandatory].sort((a, b) => b.gap - a.gap)[0] ?? null;

  // ── 5. Fully compliant ────────────────────────────────────────────────────
  if (isFullyCompliant) {
    return {
      theme: "green",
      icon: "✅",
      headline: `You're compliant — next renewal: ${renewalDateLabel}`,
      explanation:
        "All CME requirements are met for this cycle. Keep uploading certificates as you earn them.",
      ctaLabel: "View your certificates",
      ctaUrl: "/dashboard/compliance",
      ctaExternal: false,
    };
  }

  // ── 1. Renewal < 90 days ──────────────────────────────────────────────────
  if (daysUntilRenewal !== null && daysUntilRenewal < 90) {
    const topicName = highestGapMandatory
      ? topicLabel(highestGapMandatory.topic)
      : "general CME";
    const ctaUrl = highestGapMandatory
      ? courseUrl(highestGapMandatory.topic)
      : DEFAULT_CME_URL;
    const ctaExternal = highestGapMandatory
      ? !INTERNAL_COURSE_TOPICS.has(highestGapMandatory.topic)
      : true;
    return {
      theme: "red",
      icon: "⚠️",
      headline: `Renewal in ${daysUntilRenewal} days — complete ${topicName} now`,
      explanation: `Your ${renewalDateLabel} renewal is approaching. Focus on your highest-priority gap first to avoid a compliance violation.`,
      ctaLabel: `Find ${topicName} CME →`,
      ctaUrl,
      ctaExternal,
    };
  }

  // ── 2. Unmet one-time mandatory requirement ───────────────────────────────
  // DEA MATE Act (SUBSTANCE_USE) first, then others
  const oneTimeUnmet = unmetMandatory
    .filter((g) => g.isOneTime)
    .sort((a, b) => {
      if (a.topic === "SUBSTANCE_USE") return -1;
      if (b.topic === "SUBSTANCE_USE") return 1;
      return b.gap - a.gap;
    });

  if (oneTimeUnmet.length > 0) {
    const req = oneTimeUnmet[0];
    const label = topicLabel(req.topic);
    const ctaUrl = courseUrl(req.topic);
    const ctaExternal = !INTERNAL_COURSE_TOPICS.has(req.topic);
    return {
      theme: "amber",
      icon: "📋",
      headline: `Complete your ${label} requirement — it's a one-time task`,
      explanation: `This is a mandatory one-time requirement for your ${props.licenseState} license. You only have to do it once — best to knock it out now.`,
      ctaLabel: `Find ${label} CME →`,
      ctaUrl,
      ctaExternal,
    };
  }

  // ── 4. All mandatory topics met, only general hours gap remains ───────────
  const allMandatoryMet = unmetMandatory.length === 0;
  if (allMandatoryMet && generalGapHours > 0) {
    return {
      theme: "blue",
      icon: "🏁",
      headline: `Almost there — just ${generalGapHours.toFixed(1)} general hours left before ${renewalDateLabel}`,
      explanation:
        "You've satisfied all mandatory topic requirements. Keep adding CME hours to complete your cycle.",
      ctaLabel: "Find general CME →",
      ctaUrl: DEFAULT_CME_URL,
      ctaExternal: true,
    };
  }

  // ── 3. General hours gap with unmet mandatory topics, plenty of time ──────
  if (generalGapHours > 0 && highestGapMandatory) {
    const label = topicLabel(highestGapMandatory.topic);
    const ctaUrl = courseUrl(highestGapMandatory.topic);
    const ctaExternal = !INTERNAL_COURSE_TOPICS.has(highestGapMandatory.topic);
    const daysLabel =
      daysUntilRenewal !== null ? `before ${renewalDateLabel}` : "";
    return {
      theme: "blue",
      icon: "📈",
      headline: `You're making progress — next: earn ${highestGapMandatory.gap.toFixed(1)} more hours in ${label}`,
      explanation: `You still have time ${daysLabel}. Prioritise ${label} to chip away at your biggest mandatory gap.`,
      ctaLabel: `Find ${label} CME →`,
      ctaUrl,
      ctaExternal,
    };
  }

  // ── Fallback: something's incomplete, no specific match ──────────────────
  return {
    theme: "blue",
    icon: "📈",
    headline: `Keep going — ${generalGapHours.toFixed(1)} CME hours needed before ${renewalDateLabel}`,
    explanation: "You're on your way. Continue earning accredited CME to complete your requirements.",
    ctaLabel: "Find CME →",
    ctaUrl: DEFAULT_CME_URL,
    ctaExternal: true,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function UrgencyCard(props: NextActionCardProps) {
  const rec = buildRecommendation(props);
  const t = themeClasses(rec.theme);

  return (
    <div className={`w-full rounded-2xl border-2 ${t.wrapper} p-5`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${t.icon}`}
        >
          {rec.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium uppercase tracking-wide opacity-60 mb-0.5 ${t.headline}`}>
            Your Next Action
          </p>
          <h2 className={`font-bold text-base leading-snug ${t.headline}`}>
            {rec.headline}
          </h2>
          <p className={`text-sm mt-1 ${t.body} opacity-80`}>{rec.explanation}</p>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          {rec.ctaExternal ? (
            <a
              href={rec.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${t.cta}`}
            >
              {rec.ctaLabel}
            </a>
          ) : (
            <Link
              href={rec.ctaUrl}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${t.cta}`}
            >
              {rec.ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
