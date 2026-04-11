"use client";

import Link from "next/link";

interface UrgencyItem {
  topic: string;
  gapHours: number;
  daysUntilDeadline: number;
  deadlineLabel: string;
  licenseState: string;
  ctaUrl: string;
  ctaLabel: string;
}

interface UrgencyCardProps {
  items: UrgencyItem[];
}

const PARTNER_URLS: Record<string, string> = {
  OPIOID_PRESCRIBING: "https://home.hippoed.com/oud-decoded",
  SUBSTANCE_USE: "https://home.hippoed.com/oud-decoded",
  IMPLICIT_BIAS: "https://www.cmeoutfitters.com/activity/findings-from-an-educational-initiative-addressing-racial-disparities-and-bias-in-health-care-2/",
  ETHICS: "https://www.cmeoutfitters.com/activity/integrating-resilience-ethics-and-traumatic-stress-relief-to-cultivate-a-culture-of-wellbeing/",
  INFECTION_CONTROL: "https://home.hippoed.com/abxstewardship",
  PATIENT_SAFETY: "https://www.acep.org/acepanywhere/",
  SUICIDE_PREVENTION: "https://bootcamp.pri-med.com/en/mental-health",
};

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
  return MAP[topic] ?? topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function urgencyColor(days: number): { bg: string; border: string; text: string; badge: string } {
  if (days < 90) {
    return {
      bg: "bg-red-50",
      border: "border-red-300",
      text: "text-red-900",
      badge: "bg-red-100 text-red-700 border-red-200",
    };
  }
  if (days < 180) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-900",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }
  return {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-900",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  };
}

export default function UrgencyCard({ items }: UrgencyCardProps) {
  if (items.length === 0) return null;

  const top = items.slice(0, 2);
  const colors = urgencyColor(top[0].daysUntilDeadline);

  return (
    <div className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <h2 className={`font-bold text-base ${colors.text}`}>What&apos;s Urgent This Week</h2>
      </div>

      <div className="space-y-3">
        {top.map((item, i) => {
          const c = urgencyColor(item.daysUntilDeadline);
          const ctaUrl = PARTNER_URLS[item.topic] ?? "https://www.medscape.com/cme";
          return (
            <div
              key={i}
              className={`rounded-xl border ${c.border} bg-white/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3`}
            >
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${c.text}`}>
                  Your most urgent gap:{" "}
                  <span className="font-black">{topicLabel(item.topic)}</span>{" "}
                  ({item.gapHours.toFixed(1)} hrs)
                </p>
                <p className={`text-xs mt-0.5 ${c.text} opacity-75`}>
                  Complete before {item.deadlineLabel} · {item.daysUntilDeadline} days left · {item.licenseState} license
                </p>
              </div>
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${c.badge} hover:opacity-80`}
              >
                Find CME →
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
