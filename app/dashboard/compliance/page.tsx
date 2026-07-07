export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import UrgencyCard from "@/components/dashboard/UrgencyCard";
import MandatoryTopicAccordion from "@/components/dashboard/MandatoryTopicAccordion";
import { buildNextAction } from "@/lib/next-action";
import ComplianceExportButton from "@/components/dashboard/ComplianceExportButton";
import AuditExportButton from "@/components/dashboard/AuditExportButton";
import AhaMomentModal from "@/components/dashboard/AhaMomentModal";
import { keyToSlug } from "@/lib/courses";
import { daysUntil, formatDateUTC } from "@/lib/dates";
import { GapCourseFeed } from "@/components/dashboard/GapCourseFeed";
import { ComplianceForecast } from "@/components/dashboard/ComplianceForecast";
import { computedComplianceBlockedMessage, isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { formatStateName } from "@/lib/state-names";
import {
  NOT_COMPLETED_REQUIREMENT_NOTE,
  cadenceLabel,
  evaluateRequirementFulfillment,
} from "@/lib/requirement-completions";
import InfoTip from "@/components/ui/InfoTip";
import RequirementAttestation, { type AttestationStatus } from "@/components/dashboard/RequirementAttestation";

export const metadata = {
  title: "Compliance Map — ClearCME",
};

interface RequirementSourceMeta {
  sourceTitle?: string;
  sourceUrl?: string;
  lastReviewed?: Date;
  effectiveDate?: Date | null;
  scopeCaveat?: string;
  whyThisApplies: string;
}

interface MandatoryGap {
  requirementId: string;
  topic: string;
  description?: string;
  earned: number;
  needed: number;
  gap: number;
  isMet: boolean;
  isUnknown: boolean;
  isAttestable: boolean;
  cadenceLabel: string;
  prompt: string | null;
  satisfiedUntil: Date | null;
  sourceMeta?: RequirementSourceMeta;
  completionStatus: AttestationStatus;
  completedYear: number | null;
}

function formatTopic(topic: string): string {
  return topic
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Topic-specific CTA labels */
const TOPIC_LABELS: Record<string, string> = {
  OPIOID_PRESCRIBING: "Find Opioid Prescribing CME →",
  PAIN_MANAGEMENT: "Find Pain Management CME →",
  SUBSTANCE_USE: "Find SUD / MATE Act CME →",
  IMPLICIT_BIAS: "Find Implicit Bias CME →",
  CULTURAL_COMPETENCY: "Find Cultural Competency CME →",
  ETHICS: "Find Ethics CME →",
  SUICIDE_PREVENTION: "Find Suicide Prevention CME →",
  DOMESTIC_VIOLENCE: "Find Domestic Violence CME →",
  CHILD_ABUSE: "Find Child Abuse CME →",
  HUMAN_TRAFFICKING: "Find Human Trafficking CME →",
  PATIENT_SAFETY: "Find Patient Safety CME →",
  INFECTION_CONTROL: "Find Infection Control CME →",
  END_OF_LIFE_CARE: "Find End-of-Life Care CME →",
  ELDER_ABUSE: "Find Elder Abuse CME →",
  OTHER_MANDATORY: "Find Accredited CME →",
};

/** Topics sourced from Hippo Education — show badge */
const HIPPO_TOPICS = new Set(["SUBSTANCE_USE", "OPIOID_PRESCRIBING", "INFECTION_CONTROL"]);

function getUrgencyTone(daysUntilRenewal: number | null, percentComplete: number) {
  if (percentComplete >= 100) return "met";
  if (daysUntilRenewal === null) return "open";
  if (daysUntilRenewal < 0) return "due";
  if (daysUntilRenewal < 60) return "warn-now";
  if (daysUntilRenewal < 180) return "warn-soon";
  return "open";
}

const TONE: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  met:        { bg: "bg-brand-emeraldTint", text: "text-brand-emerald",  border: "border-brand-emeraldTint", bar: "bg-brand-emerald" },
  open:       { bg: "bg-brand-amberTint",   text: "text-brand-amber",    border: "border-brand-amberRule",   bar: "bg-brand-teal" },
  "warn-soon":{ bg: "bg-brand-amberTint",   text: "text-brand-amberMid", border: "border-brand-amberRule",   bar: "bg-brand-amberMid" },
  "warn-now": { bg: "bg-brand-crimsonTint", text: "text-brand-crimson",  border: "border-brand-crimsonTint", bar: "bg-brand-crimson" },
  due:        { bg: "bg-brand-crimsonTint", text: "text-brand-crimson",  border: "border-brand-crimsonTint", bar: "bg-brand-crimson" },
};

function requirementStatusLabel({
  isMet,
  isUnknown,
  earned,
  daysUntilRenewal,
}: {
  isMet: boolean;
  isUnknown?: boolean;
  earned: number;
  daysUntilRenewal: number | null;
}) {
  if (isMet) return "Met";
  if (isUnknown) return "Needs your input";
  if (daysUntilRenewal !== null && daysUntilRenewal <= 90) return "Action needed";
  if (earned > 0) return "At risk";
  return "Missing";
}

function requirementStatusClass(label: string) {
  if (label === "Met") return "product-pill product-pill-met";
  if (label === "Needs your input") return "product-pill product-pill-track";
  if (label === "Action needed") return "product-pill product-pill-miss";
  if (label === "At risk") return "product-pill product-pill-pending";
  return "product-pill product-pill-miss";
}

function formatReviewDate(date?: Date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseSourceUrls(sourceUrl?: string) {
  return (sourceUrl ?? "")
    .split(/;\s*/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

function RequirementSourceDisclosure({ sourceMeta }: { sourceMeta: RequirementSourceMeta }) {
  const sourceUrls = parseSourceUrls(sourceMeta.sourceUrl);

  return (
    <details className="group mt-2 rounded-[var(--radius-sm)] border border-[rgba(63,95,51,0.18)] bg-[rgba(63,95,51,0.07)] px-3 py-2 text-xs text-[var(--ink-2)] open:bg-[rgba(63,95,51,0.10)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-[var(--primary)] marker:hidden">
        <span>Source / reviewed</span>
        <span className="text-[var(--primary-2)] transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-2 space-y-1.5 leading-relaxed">
        {(sourceMeta.sourceUrl || sourceMeta.sourceTitle) && (
          <p>
            <span className="font-semibold text-[var(--ink)]">
              Official source{sourceUrls.length > 1 ? "s" : ""}: {" "}
            </span>
            {sourceUrls.length === 1 ? (
              <a
                href={sourceUrls[0]}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--primary)] underline decoration-[rgba(63,95,51,0.3)] underline-offset-2 hover:text-[var(--primary-2)]"
              >
                {sourceMeta.sourceTitle ?? "State board guidance"}
              </a>
            ) : sourceUrls.length > 1 ? (
              <span className="inline-flex flex-wrap gap-x-2 gap-y-1">
                {sourceUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--primary)] underline decoration-[rgba(63,95,51,0.3)] underline-offset-2 hover:text-[var(--primary-2)]"
                  >
                    {index === 0 ? sourceMeta.sourceTitle ?? "State board guidance" : `Primary source ${index + 1}`}
                  </a>
                ))}
              </span>
            ) : (
              <span>{sourceMeta.sourceTitle}</span>
            )}
          </p>
        )}
        {sourceMeta.effectiveDate && (
          <p>
            <span className="font-semibold text-[var(--ink)]">Required since: </span>
            {formatReviewDate(sourceMeta.effectiveDate)}
          </p>
        )}
        {sourceMeta.lastReviewed && (
          <p>
            <span className="font-semibold text-[var(--ink)]">Last reviewed: </span>
            {formatReviewDate(sourceMeta.lastReviewed)}
          </p>
        )}
        {sourceMeta.scopeCaveat && (
          <p>
            <span className="font-semibold text-[var(--ink)]">Scope / caveat: </span>
            {sourceMeta.scopeCaveat}
          </p>
        )}
        <p>
          <span className="font-semibold text-[var(--ink)]">Why this applies: </span>
          {sourceMeta.whyThisApplies}
        </p>
      </div>
    </details>
  );
}

function remainingHoursLabel({
  generalGapHours,
  mandatoryGaps,
  isCompliant,
}: {
  generalGapHours: number;
  mandatoryGaps: MandatoryGap[];
  isCompliant: boolean;
}) {
  if (isCompliant) return "All hours completed ✓";

  const mandatoryHoursGap = mandatoryGaps.reduce((sum, gap) => sum + Math.max(0, gap.gap), 0);
  const parts: string[] = [];

  if (generalGapHours > 0) {
    parts.push(`${generalGapHours.toFixed(1)} general hr${generalGapHours === 1 ? "" : "s"}`);
  }
  if (mandatoryHoursGap > 0) {
    parts.push(`${mandatoryHoursGap.toFixed(1)} topic hr${mandatoryHoursGap === 1 ? "" : "s"}`);
  }

  return parts.length > 0 ? `${parts.join(" + ")} remaining` : "Mandatory topics still need confirmation";
}

function buildRequirementSourceMeta({
  state,
  licenseType,
  sourceUrl,
  ruleUpdatedAt,
  ruleNotes,
  topic,
  hoursRequired,
  firstRenewalOnly,
  requirementNotes,
  effectiveDate,
}: {
  state: string;
  licenseType: string;
  sourceUrl?: string | null;
  ruleUpdatedAt?: Date;
  ruleNotes?: string | null;
  topic: string;
  hoursRequired: number;
  firstRenewalOnly: boolean;
  requirementNotes?: string | null;
  effectiveDate?: Date | null;
}): RequirementSourceMeta {
  const stateName = formatStateName(state);
  const scopeParts = [
    firstRenewalOnly ? "Applies as a one-time / first-renewal requirement when applicable." : null,
    requirementNotes,
    ruleNotes,
  ].filter(Boolean);

  return {
    sourceTitle: `${stateName} ${licenseType} licensing requirements`,
    sourceUrl: sourceUrl ?? undefined,
    lastReviewed: ruleUpdatedAt,
    effectiveDate: effectiveDate ?? null,
    scopeCaveat: scopeParts.length > 0 ? scopeParts.join(" ") : undefined,
    whyThisApplies: `This appears because your tracked license is ${state} ${licenseType}, and the ${stateName} rule set includes ${hoursRequired.toFixed(0)} hour${hoursRequired === 1 ? "" : "s"} of ${formatTopic(topic)}${firstRenewalOnly ? " as a one-time requirement" : " in this renewal cycle"}.`,
  };
}

function RenewalCountdown({ days, percentComplete }: { days: number | null; percentComplete: number }) {
  if (days === null) return null;
  const tone = TONE[getUrgencyTone(days, percentComplete)];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${tone.bg} ${tone.text} ${tone.border}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {days <= 0 ? "Renewal overdue" : days === 1 ? "1 day until renewal" : `${days} days until renewal`}
    </div>
  );
}

export default async function CompliancePage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Fetch compliance data + licenses with their rules
  const [licenses, certificates, requirementCompletions, subscription] = await Promise.all([
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.certificate.findMany({
      where: { userId, extractionStatus: "COMPLETED" },
      orderBy: { activityDate: "desc" },
    }),
    prisma.userRequirementCompletion.findMany({
      where: { userId },
    }),
    prisma.subscription.findUnique({
      where: { userId },
    }),
  ]);

  const hasFullCourseChoice = subscription?.tier === "ESSENTIAL" || subscription?.tier === "PRO";

  const completionByRequirementAndLicense = new Map(
    requirementCompletions.map((completion) => [
      `${completion.mandatoryRequirementId}:${completion.physicianLicenseId ?? "global"}`,
      completion,
    ])
  );

  // For each license, compute compliance inline (so page always shows fresh data)
  const complianceData = await Promise.all(
    licenses.map(async (license) => {
      const computedComplianceBlocked = isComputedComplianceBlocked(license.state, license.licenseType);
      const rule = computedComplianceBlocked
        ? null
        : await prisma.complianceRule.findUnique({
            where: {
              state_licenseType: {
                state: license.state,
                licenseType: license.licenseType,
              },
            },
            include: { mandatoryRequirements: true },
          });

      if (!rule) {
        return {
          license,
          rule: null,
          totalHoursEarned: 0,
          totalHoursNeeded: 0,
          gapHours: 0,
          isCompliant: false,
          mandatoryGaps: [] as MandatoryGap[],
          daysUntilRenewal: daysUntil(license.renewalDate),
          cycleCerts: [],
          blockedMessage: computedComplianceBlockedMessage(license.state, license.licenseType),
        };
      }

      const cycleEnd = license.renewalDate ?? new Date();
      const cycleStart = new Date(cycleEnd);
      cycleStart.setMonth(cycleStart.getMonth() - rule.renewalCycle);

      const cycleCerts = certificates.filter((cert) => {
        if (!cert.activityDate) return false;
        return cert.activityDate >= cycleStart && cert.activityDate <= cycleEnd;
      });

      const totalHoursEarned = cycleCerts.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
      const generalGapHours = Math.max(0, rule.totalHours - totalHoursEarned);

      // Pre-compute mandatory gaps to determine true compliance
      const mandatoryGapsPreview: MandatoryGap[] = rule.mandatoryRequirements.map((req) => {
        const earnedForTopic = cycleCerts
          .filter((c) => c.specialTopics.includes(req.topic))
          .reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
        const completion =
          completionByRequirementAndLicense.get(`${req.id}:${license.id}`) ??
          completionByRequirementAndLicense.get(`${req.id}:global`);
        const fulfillment = evaluateRequirementFulfillment({
          requirement: req,
          completion,
          cycleEnd,
          licenseState: license.state,
          licenseIssueDate: license.issueDate,
          daysUntilRenewal: daysUntil(license.renewalDate),
        });
        const historySensitive = req.firstRenewalOnly || req.cadence !== "EVERY_RENEWAL";
        const hoursSatisfied = req.hoursRequired > 0 && earnedForTopic >= req.hoursRequired;
        const isMet = hoursSatisfied || fulfillment.isSatisfied || (!historySensitive && req.hoursRequired === 0);
        const isUnknown = fulfillment.isUnknown && !hoursSatisfied;
        const actionableGap = isUnknown ? 0 : Math.max(0, req.hoursRequired - earnedForTopic);
        const completionStatus: AttestationStatus = completion
          ? completion.notes === NOT_COMPLETED_REQUIREMENT_NOTE
            ? "not_completed"
            : "completed"
          : "none";
        return {
          requirementId: req.id,
          topic: req.topic,
          description: req.description ?? undefined,
          earned: earnedForTopic,
          needed: req.hoursRequired,
          gap: isMet ? 0 : actionableGap,
          isMet,
          isUnknown,
          isAttestable: fulfillment.isAttestable,
          cadenceLabel: cadenceLabel(req),
          prompt: fulfillment.prompt,
          satisfiedUntil: fulfillment.satisfiedUntil,
          sourceMeta: buildRequirementSourceMeta({
            state: license.state,
            licenseType: license.licenseType,
            sourceUrl: req.sourceUrl ?? rule.sourceUrl,
            ruleUpdatedAt: rule.updatedAt,
            ruleNotes: rule.notes,
            topic: req.topic,
            hoursRequired: req.hoursRequired,
            firstRenewalOnly: req.firstRenewalOnly,
            requirementNotes: req.notes,
            effectiveDate: req.effectiveDate,
          }),
          completionStatus,
          completedYear: completion?.completedYear ?? null,
        };
      });
      const allMandatoryMet = mandatoryGapsPreview.every((g) => g.isMet);
      const mandatoryHoursGap = mandatoryGapsPreview.reduce((sum, g) => sum + g.gap, 0);
      const effectiveGapHours = Math.max(generalGapHours, mandatoryHoursGap);
      const isCompliant = generalGapHours === 0 && allMandatoryMet;

      const mandatoryGaps: MandatoryGap[] = mandatoryGapsPreview;

      return {
        license,
        rule,
        totalHoursEarned,
        totalHoursNeeded: rule.totalHours,
        gapHours: effectiveGapHours,
        isCompliant,
        mandatoryGaps,
        daysUntilRenewal: daysUntil(license.renewalDate),
        cycleCerts,
      };
    })
  );

  const totalHoursAllCerts = certificates.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);

  // Shared next-action engine — same recommendation as the dashboard hero card
  const nextAction = buildNextAction(
    complianceData
      .filter((d) => d.rule !== null)
      .map((d) => ({
        state: d.license.state,
        licenseType: d.license.licenseType,
        daysUntilRenewal: d.daysUntilRenewal,
        renewalDateLabel: d.license.renewalDate
          ? formatDateUTC(d.license.renewalDate, { month: "short", day: "numeric", year: "numeric" })
          : "your renewal date",
        generalGapHours: Math.max(0, d.totalHoursNeeded - d.totalHoursEarned),
        isCompliant: d.isCompliant,
        mandatoryGaps: d.mandatoryGaps.map((g) => ({
          topic: g.topic,
          gap: g.gap,
          isMet: g.isMet,
          isUnknown: g.isUnknown,
          // Match by requirement id, not topic — a license can have multiple
          // rows for the same topic (e.g. NV's 2-hr state Substance Use rule
          // alongside the 8-hr federal DEA MATE one-time requirement).
          isOneTime:
            d.rule?.mandatoryRequirements.find((r) => r.id === g.requirementId)
              ?.firstRenewalOnly ?? false,
        })),
      }))
  );

  // Build export data for client component
  const exportData = {
    licenses: complianceData.map((d) => ({
      state: d.license.state,
      licenseType: d.license.licenseType,
      renewalDate: d.license.renewalDate?.toISOString() ?? null,
      totalHoursEarned: d.totalHoursEarned,
      totalHoursNeeded: d.totalHoursNeeded,
      gapHours: d.gapHours,
      isCompliant: d.isCompliant,
      mandatoryGaps: d.mandatoryGaps,
    })),
    certificates: certificates.map((c) => ({
      title: c.title ?? c.fileName,
      provider: c.provider ?? "",
      activityDate: c.activityDate?.toISOString() ?? null,
      creditHours: c.creditHours ?? 0,
      creditType: c.creditType ?? "OTHER",
    })),
    totalHoursAllCerts,
  };

  // Build aha-moment modal props from the most-urgent license with real data
  const ahaSource = complianceData.find((d) => d.rule !== null);
  const ahaProps = ahaSource
    ? {
        state: ahaSource.license.state,
        licenseType: ahaSource.license.licenseType,
        requirementCount: ahaSource.rule!.mandatoryRequirements.length,
        gapCount: ahaSource.mandatoryGaps.filter((g) => !g.isMet).length,
        renewalDate: ahaSource.license.renewalDate
          ? formatDateUTC(ahaSource.license.renewalDate)
          : null,
      }
    : null;

  return (
    <div className="space-y-8">
      {/* Aha-moment modal — fires once on first compliance map visit */}
      {ahaProps && ahaProps.requirementCount > 0 && (
        <AhaMomentModal {...ahaProps} />
      )}

      {/* Header */}
      <div className="product-page-head flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="product-page-eye">The full record</p>
          <h1 className="product-page-title">Compliance Map</h1>
          <p className="product-page-sub">
            Live status of your state license compliance — requirement rules cross-checked against state board guidance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ComplianceExportButton exportData={exportData} />
          <AuditExportButton />
        </div>
      </div>

      {/* Your Next Action card — rendered from the shared engine */}
      {nextAction && <UrgencyCard rec={nextAction} />}

      {/* No licenses */}
      {licenses.length === 0 && (
        <div className="product-callout-brand p-8 text-center">
          <div className="w-12 h-12 bg-[rgba(63,95,51,0.12)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="font-display text-xl font-semibold text-[var(--ink)] mb-2">No licenses configured</h3>
          <p className="text-sm text-[var(--ink-2)] mb-4">
            Add your state medical licenses to see personalized compliance requirements.
          </p>
          <Link
            href="/dashboard/profile"
            className="product-btn product-btn-brand"
          >
            Add licenses →
          </Link>
        </div>
      )}

      {/* Overall summary */}
      {licenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="product-stat-tile p-5">
            <p className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-2">Total Hours Earned</p>
            <p className="font-mono text-2xl font-semibold text-[var(--primary)]">{totalHoursAllCerts.toFixed(1)}</p>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">across all certificates</p>
          </div>
          <div className="product-stat-tile p-5">
            <p className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-2">Licenses Active</p>
            <p className="font-mono text-2xl font-semibold text-[var(--ink)]">{licenses.length}</p>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">states tracked</p>
          </div>
          <Link
            href="/dashboard/certificates"
            className="product-stat-tile p-5 block hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] transition-all"
          >
            <p className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-2">Certificates</p>
            <p className="font-mono text-2xl font-semibold text-[var(--ink)]">{certificates.length}</p>
            <p className="text-xs text-[var(--primary)] font-medium mt-0.5">view all →</p>
          </Link>
          <div className="product-stat-tile p-5">
            <p className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-2">Overall Status</p>
            {complianceData.every((d) => d.rule === null) ? (
              <p className="text-lg font-bold text-[var(--ink-4)]">—</p>
            ) : complianceData.filter((d) => d.rule).every((d) => d.isCompliant) ? (
              <p className="text-2xl font-bold text-[var(--status-met)]">✓ Good</p>
            ) : (
              <p className="text-2xl font-bold text-[var(--status-pending)]">⚠ Incomplete</p>
            )}
          </div>
        </div>
      )}

      {/* Per-license compliance cards */}
      {complianceData.map(({ license, rule, totalHoursEarned, totalHoursNeeded, gapHours, isCompliant, mandatoryGaps, daysUntilRenewal, cycleCerts, blockedMessage }) => (
        <section key={license.id} className="product-card overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-5 border-b border-[var(--line-soft)] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
                  {license.state} — {license.licenseType}
                </h2>
                <span
                  className={`product-pill ${
                    !rule
                      ? "bg-[var(--bg-2)] text-[var(--ink-2)]"
                      : isCompliant
                      ? "product-pill-met"
                      : "product-pill-pending"
                  }`}
                >
                  {!rule ? "Rules pending" : isCompliant ? "✓ Compliant" : "⚠ Requirements Pending"}
                </span>
              </div>
              {license.renewalDate && (
                <p className="text-sm text-[var(--ink-3)] mt-1">
                  Renewal: {formatDateUTC(license.renewalDate)}
                </p>
              )}
              {rule?.sourceUrl && parseSourceUrls(rule.sourceUrl).length > 0 && (
                <p className="text-xs mt-1">
                  <a
                    href={parseSourceUrls(rule.sourceUrl)[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--primary)] underline decoration-[rgba(63,95,51,0.3)] underline-offset-2 hover:text-[var(--primary-2)]"
                  >
                    Verify at the official {formatStateName(license.state)} board source ↗
                  </a>
                </p>
              )}
            </div>
            <RenewalCountdown days={daysUntilRenewal} percentComplete={totalHoursNeeded > 0 ? Math.min(100, (totalHoursEarned / totalHoursNeeded) * 100) : (isCompliant ? 100 : 0)} />
          </div>

          {!rule ? (
            <div className="px-6 py-8 text-center">
              <p className="text-[var(--ink-2)] text-sm">
                {blockedMessage ?? "Compliance rules for this license are not yet loaded."}
              </p>
              <p className="text-xs text-[var(--ink-3)] mt-1">
                We&apos;re adding state requirements continuously — check back soon.
              </p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* Hours progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--ink-2)]">
                    CME Hours This Cycle
                  </span>
                  <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                    {totalHoursEarned.toFixed(1)} / {totalHoursNeeded.toFixed(0)} hrs
                  </span>
                </div>
                <div className="h-3 bg-[var(--bg-2)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCompliant ? "bg-[var(--status-met)]" : totalHoursEarned > 0 ? "bg-[var(--primary)]" : "bg-[var(--ink-4)]"
                    }`}
                    style={{ width: `${Math.min(100, (totalHoursEarned / totalHoursNeeded) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[var(--ink-3)]">
                    {remainingHoursLabel({
                      generalGapHours: Math.max(0, totalHoursNeeded - totalHoursEarned),
                      mandatoryGaps,
                      isCompliant,
                    })}
                  </span>
                  <span className="text-xs text-[var(--ink-3)]">
                    {Math.round((totalHoursEarned / totalHoursNeeded) * 100)}%
                  </span>
                </div>
                {/* Pace indicator */}
                {!isCompliant && daysUntilRenewal !== null && daysUntilRenewal > 0 && (
                  (() => {
                    const monthsLeft = daysUntilRenewal / 30.4;
                    const hrsPerMonth = monthsLeft > 0 ? gapHours / monthsLeft : gapHours;
                    const pctTimeLeft = daysUntilRenewal / (rule.renewalCycle * 30.4);
                    const pctDone = totalHoursNeeded > 0 ? totalHoursEarned / totalHoursNeeded : 0;
                    const onTrack = pctDone >= (1 - pctTimeLeft);
                    const critical = daysUntilRenewal < 60 && pctDone < 0.5;
                    return (
                      <p className={`text-xs mt-1.5 font-medium ${critical ? "text-[var(--status-miss)]" : onTrack ? "text-[var(--status-met)]" : "text-[var(--status-pending)]"}`}>
                        {critical ? "!" : onTrack ? "✓" : "→"} To finish by renewal, you need {hrsPerMonth.toFixed(1)} hrs/month
                      </p>
                    );
                  })()
                )}
              </div>

              {/* Compliance Forecast */}
              {!isCompliant && (
                <ComplianceForecast
                  state={license.state}
                  licenseType={license.licenseType}
                  hoursEarned={totalHoursEarned}
                  totalHours={totalHoursNeeded}
                  renewalDate={license.renewalDate}
                  certDates={cycleCerts.map((c) => c.activityDate?.toISOString() ?? c.createdAt.toISOString())}
                  licenseId={license.id}
                />
              )}

              {/* Mandatory topics — collapsed accordion; the next-action topic starts open */}
              {mandatoryGaps.length > 0 && (
                <div>
                  <h3 className="font-display text-lg font-semibold text-[var(--ink)] mb-3">Mandatory Topics</h3>
                  <MandatoryTopicAccordion
                    rows={mandatoryGaps.map((gap, gapIdx) => {
                      const pct = Math.min(100, gap.needed > 0 ? (gap.earned / gap.needed) * 100 : 100);
                      const topicToneKey = gap.isMet ? "met" : gap.isUnknown ? "open" : getUrgencyTone(daysUntilRenewal, gap.needed > 0 ? (gap.earned / gap.needed) * 100 : 0);
                      const topicTone = TONE[topicToneKey];
                      const statusIcon = gap.isMet ? "✓" : gap.isUnknown ? "Review" : gap.earned > 0 ? "~" : "○";
                      const statusLabel = requirementStatusLabel({
                        isMet: gap.isMet,
                        isUnknown: gap.isUnknown,
                        earned: gap.earned,
                        daysUntilRenewal,
                      });
                      // Mark the first unmet gap for aha-moment scroll target
                      const isFirstGap = !gap.isMet && gapIdx === mandatoryGaps.findIndex((g) => !g.isMet);

                      const sourceMeta = gap.sourceMeta;
                      const infoTipUrls = parseSourceUrls(sourceMeta?.sourceUrl);

                      return {
                        // requirementId, not topic — duplicate topics per license
                        // (state rule + federal one-time) would collide as keys
                        key: gap.requirementId,
                        infoTip: sourceMeta ? (
                          <InfoTip label={`Source details for ${formatTopic(gap.topic)}`}>
                            <span className="block space-y-1">
                              <span className="block font-semibold text-[var(--ink)]">
                                {formatTopic(gap.topic)} · {gap.cadenceLabel}
                              </span>
                              {sourceMeta.effectiveDate && (
                                <span className="block">
                                  <span className="font-semibold text-[var(--ink)]">Required since: </span>
                                  {formatReviewDate(sourceMeta.effectiveDate)}
                                </span>
                              )}
                              {infoTipUrls.length > 0 ? (
                                <span className="block">
                                  <span className="font-semibold text-[var(--ink)]">Primary source: </span>
                                  {infoTipUrls.map((url, index) => (
                                    <a
                                      key={url}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[var(--primary)] underline decoration-[rgba(63,95,51,0.3)] underline-offset-2 hover:text-[var(--primary-2)]"
                                    >
                                      {index === 0
                                        ? sourceMeta.sourceTitle ?? "State board guidance"
                                        : ` · Source ${index + 1}`}
                                    </a>
                                  ))}
                                </span>
                              ) : (
                                <span className="block">{sourceMeta.sourceTitle}</span>
                              )}
                              {sourceMeta.lastReviewed && (
                                <span className="block">
                                  <span className="font-semibold text-[var(--ink)]">Last reviewed by ClearCME: </span>
                                  {formatReviewDate(sourceMeta.lastReviewed)}
                                </span>
                              )}
                            </span>
                          </InfoTip>
                        ) : undefined,
                        isScrollTarget: isFirstGap,
                        toneClassName: `${topicTone.bg} ${topicTone.border}`,
                        defaultOpen:
                          nextAction?.topic === gap.topic &&
                          nextAction?.licenseState === license.state &&
                          !gap.isMet,
                        summary: (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${
                                  gap.isUnknown
                                    ? "bg-[var(--status-track-bg)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--status-track)]"
                                    : "text-base"
                                }`}
                              >
                                {statusIcon}
                              </span>
                              <p className="text-sm font-medium text-[var(--ink)] truncate">
                                {formatTopic(gap.topic)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                                {gap.earned.toFixed(1)}/{gap.needed.toFixed(0)} hrs
                              </span>
                              <span className={requirementStatusClass(statusLabel)}>
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        ),
                        details: (
                          <div>
                            {gap.description && (
                              <p className="text-xs text-[var(--ink-3)] leading-relaxed">{gap.description}</p>
                            )}
                            <p className="mt-1 text-xs font-medium text-[var(--ink-3)]">
                              Cadence: {gap.cadenceLabel}
                              {gap.satisfiedUntil ? ` · satisfied until ${formatReviewDate(gap.satisfiedUntil)}` : ""}
                            </p>
                            {!gap.isMet && !gap.isUnknown && (
                              <p className={`mt-1 text-xs ${gap.earned > 0 ? "text-[var(--status-pending)]" : "text-[var(--status-miss)]"}`}>
                                {gap.gap.toFixed(1)} hrs short
                              </p>
                            )}
                            {gap.isUnknown && (
                              <div className="mt-2 rounded-[var(--radius-sm)] border border-[rgba(139,122,184,0.28)] bg-[var(--status-track-bg)] px-3 py-2 text-xs text-[var(--ink)]">
                                <p className="font-semibold">Tell ClearCME if you already completed this.</p>
                                <p className="mt-1 text-[var(--ink-2)]">
                                  {gap.prompt ?? "This requirement may be one-time or long-cycle, so we need your history before counting it as still due."}
                                </p>
                                <p className="mt-1 text-[var(--status-track)]">This is not an error — it keeps recommendations from over-counting CME you may already have.</p>
                                <RequirementAttestation
                                  requirementId={gap.requirementId}
                                  licenseId={license.id}
                                  status={gap.completionStatus}
                                  completedYear={gap.completedYear}
                                  compact
                                />
                              </div>
                            )}

                            {/* Answered history — single status card + clear response */}
                            {!gap.isUnknown && gap.isAttestable && gap.completionStatus !== "none" && (
                              <RequirementAttestation
                                requirementId={gap.requirementId}
                                licenseId={license.id}
                                status={gap.completionStatus}
                                completedYear={gap.completedYear}
                                compact
                              />
                            )}

                            {gap.sourceMeta && (
                              <RequirementSourceDisclosure sourceMeta={gap.sourceMeta} />
                            )}

                            {/* Progress bar */}
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    gap.isMet ? "bg-[var(--status-met)]" : gap.earned > 0 ? "bg-[var(--warm)]" : "bg-[var(--pop)]"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {!gap.isMet && !gap.isUnknown && (
                                <div className="flex flex-col items-end gap-0.5">
                                  <Link
                                    href={`/courses/${keyToSlug(gap.topic)}`}
                                    className="flex-shrink-0 text-xs font-medium px-3 py-1 rounded-lg transition-colors bg-[var(--primary)] text-white hover:bg-[var(--primary-2)]"
                                  >
                                    {TOPIC_LABELS[gap.topic] ?? "Find Accredited CME →"}
                                  </Link>
                                  {HIPPO_TOPICS.has(gap.topic) ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-[var(--mauve)] font-medium">
                                      via Hippo Education
                                    </span>
                                  ) : (
                                    <span className="text-xs text-[var(--ink-3)]">ACCME-accredited • Cat 1</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Gap-specific course feed — Pixel rec #4 */}
                            {!gap.isMet && !gap.isUnknown && (
                              <GapCourseFeed
                                topic={gap.topic}
                                hoursNeeded={gap.gap}
                                limit={hasFullCourseChoice ? 3 : 1}
                                showUpgradePrompt={!hasFullCourseChoice}
                              />
                            )}
                          </div>
                        ),
                      };
                    })}
                  />
                </div>
              )}

              {/* No mandatory topics */}
              {mandatoryGaps.length === 0 && (
                <p className="text-sm text-[var(--ink-3)]">
                  No mandatory topic requirements configured for this license.
                </p>
              )}
            </div>
          )}
        </section>
      ))}

      {/* Certificates — full list lives on its own page now */}
      <Link
        href="/dashboard/certificates"
        className="product-card px-5 py-4 flex items-center justify-between gap-3 hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[rgba(63,95,51,0.12)] flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {certificates.length} certificate{certificates.length === 1 ? "" : "s"} on file
            </p>
            <p className="text-xs text-[var(--ink-3)]">
              {totalHoursAllCerts.toFixed(1)} hrs total · AI-extracted credit details
            </p>
          </div>
        </div>
        <span className="text-sm font-medium text-[var(--primary)] flex-shrink-0">View all →</span>
      </Link>
    </div>
  );
}
