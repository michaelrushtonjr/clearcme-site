import { formatStateName } from "@/lib/state-names";

export interface ComplianceRuleChangePayload {
  id: string;
  state: string;
  licenseType: string;
  changeType: string;
  field: string;
  oldValue: string;
  newValue: string;
  effectiveDate: string | null;
  detectedAt: string;
  description: string;
}

export interface UserComplianceDiffPayload {
  id: string;
  changeId: string;
  impactDescription: string;
  additionalHoursNeeded: number | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  courseHref: string;
  change: ComplianceRuleChangePayload;
}

const INTERNAL_TOPIC_KEYS = new Set([
  "SUBSTANCE_USE",
  "OPIOID_PRESCRIBING",
  "ETHICS",
  "IMPLICIT_BIAS",
  "PATIENT_SAFETY",
  "SUICIDE_PREVENTION",
  "DOMESTIC_VIOLENCE",
  "HUMAN_TRAFFICKING",
]);

const TOPIC_ALIASES: Array<{ key: string; patterns: RegExp[] }> = [
  {
    key: "SUBSTANCE_USE",
    patterns: [/\bSUBSTANCE[_ -]?USE\b/i, /\bMATE ACT\b/i, /\bSUD\b/i, /\bADDICTION\b/i],
  },
  {
    key: "OPIOID_PRESCRIBING",
    patterns: [/\bOPIOID\b/i, /\bCONTROLLED SUBSTANCE\b/i],
  },
  {
    key: "ETHICS",
    patterns: [/\bETHIC(S)?\b/i, /\bPROFESSIONAL RESPONSIBILITY\b/i],
  },
  {
    key: "IMPLICIT_BIAS",
    patterns: [/\bIMPLICIT BIAS\b/i, /\bUNCONSCIOUS BIAS\b/i],
  },
  {
    key: "PATIENT_SAFETY",
    patterns: [/\bPATIENT SAFETY\b/i, /\bMEDICAL ERROR(S)?\b/i],
  },
  {
    key: "SUICIDE_PREVENTION",
    patterns: [/\bSUICIDE\b/i],
  },
  {
    key: "DOMESTIC_VIOLENCE",
    patterns: [/\bDOMESTIC VIOLENCE\b/i],
  },
  {
    key: "HUMAN_TRAFFICKING",
    patterns: [/\bHUMAN TRAFFICKING\b/i, /\bTRAFFICKING\b/i],
  },
];

function topicKeyToHref(topicKey: string): string {
  return `/courses/${topicKey.toLowerCase().replace(/_/g, "-")}`;
}

export function formatComplianceChangeSummary(change: ComplianceRuleChangePayload): string {
  const oldValue = change.oldValue.trim() || "not set";
  const newValue = change.newValue.trim() || "not set";
  return `Was ${oldValue}, now ${newValue}.`;
}

export function formatComplianceEffectiveDate(date: string | null): string | null {
  if (!date) return null;

  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatComplianceLicenseLabel(state: string, licenseType: string): string {
  return `${formatStateName(state)} ${licenseType}`;
}

function findRelevantTopicKey(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;

    for (const topicKey of INTERNAL_TOPIC_KEYS) {
      if (value.toUpperCase().includes(topicKey)) {
        return topicKey;
      }
    }

    for (const alias of TOPIC_ALIASES) {
      if (alias.patterns.some((pattern) => pattern.test(value))) {
        return alias.key;
      }
    }
  }

  return null;
}

export function resolveComplianceDiffCourseHref(
  change: Pick<ComplianceRuleChangePayload, "field" | "oldValue" | "newValue" | "description">,
  impactDescription: string,
): string {
  const topicKey = findRelevantTopicKey([
    change.field,
    change.oldValue,
    change.newValue,
    change.description,
    impactDescription,
  ]);

  if (!topicKey) {
    return "/dashboard/compliance";
  }

  return topicKeyToHref(topicKey);
}
