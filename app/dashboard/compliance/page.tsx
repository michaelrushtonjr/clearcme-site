export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buildNextAction } from "@/lib/next-action";
import ComplianceExportButton from "@/components/dashboard/ComplianceExportButton";
import AuditExportButton from "@/components/dashboard/AuditExportButton";
import AhaMomentModal from "@/components/dashboard/AhaMomentModal";
import { courseCtaLabel, courseDestination } from "@/lib/course-routing";
import { daysUntil, formatDateUTC } from "@/lib/dates";
import { GapCourseFeed } from "@/components/dashboard/GapCourseFeed";
import { computedComplianceBlockedMessage, isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { formatStateName } from "@/lib/state-names";
import {
  NOT_APPLICABLE_REQUIREMENT_NOTE,
  NOT_COMPLETED_REQUIREMENT_NOTE,
  cadenceLabel,
  evaluateRequirementFulfillment,
  findSatisfyingCertificate,
  linkedCertificateId,
} from "@/lib/requirement-completions";
import {
  conditionSummary,
  parseRequirementNotes,
  shortConditionText,
} from "@/lib/requirement-scope";
import { formatTopic, requirementDisplayName } from "@/lib/requirement-display";
import CredentialTabs from "@/components/console/CredentialTabs";
import FillWhatsLeft from "@/components/console/FillWhatsLeft";
import RequirementTable, { type RequirementRow } from "@/components/console/RequirementTable";
import { matchCoursesForGap, type OpenGap } from "@/lib/course-matcher";
import RequirementAttestation, {
  type AttestationStatus,
  type SuggestedCertificate,
} from "@/components/dashboard/RequirementAttestation";

export const metadata = {
  title: "Compliance Map — ClearCME",
};

interface RequirementSourceMeta {
  sourceTitle?: string;
  sourceUrl?: string;
  lastReviewed?: Date;
  effectiveDate?: Date | null;
  /** The requirement's own hours phrasing, e.g. "10 hrs per cycle" */
  hoursLabel?: string;
  /** Who the requirement binds — the gating clause for conditional rows */
  conditionText?: string;
  /** true when conditionText decides whether the requirement applies at all */
  isConditional: boolean;
  /** One-time / first-renewal timing note */
  timingNote?: string;
  /** State-level cycle context — kept apart from the requirement's own scope */
  stateCycleNote?: string;
  whyThisApplies: string;
}

interface MandatoryGap {
  requirementId: string;
  topic: string;
  /** The state's own name for the requirement, e.g. "Geriatric medicine" */
  displayName: string;
  description?: string;
  /** Gated on a practice condition the license alone can't answer */
  isConditional: boolean;
  /** The gating clause, trimmed for a one-line summary */
  conditionText: string | null;
  /** User told us it's out of scope — excluded from gap maths, never "met" */
  isNotApplicable: boolean;
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
  /** Uploaded cert whose topics/hours look like they satisfy this attestable row */
  suggestedCert: SuggestedCertificate | null;
  /** Title of the certificate a confirmed completion is linked to */
  satisfiedByCertLabel: string | null;
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

function formatReviewDate(date?: Date) {
  if (!date) return null;
  return formatDateUTC(date, { month: "short", day: "numeric", year: "numeric" });
}

function parseSourceUrls(sourceUrl?: string) {
  return (sourceUrl ?? "")
    .split(/;\s*/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

/** Rule cell (mono, lowercase): "per cycle", "one-time", "every 4 yrs", "conditional" */
function ruleCell(label: string, isConditional: boolean): string {
  if (isConditional) return "conditional";
  const everyN = /^Every (\d+) years$/.exec(label);
  if (everyN) return `every ${everyN[1]} yrs`;
  switch (label) {
    case "One-time":
      return "one-time";
    case "Every renewal":
      return "per cycle";
    case "First renewal only":
      return "first renewal";
    case "Initial license only":
      return "initial license";
    case "Recurring long-cycle":
      return "long-cycle";
    default:
      return label.toLowerCase();
  }
}

const detailText = { fontSize: 12.5, lineHeight: 1.55, color: "var(--c1b-ink-2)" } as const;
const detailLabel = { fontWeight: 600, color: "var(--c1b-ink)" } as const;

/** Flattened source/provenance block for an expanded requirement row. */
function SourceBlock({ sourceMeta }: { sourceMeta: RequirementSourceMeta }) {
  const sourceUrls = parseSourceUrls(sourceMeta.sourceUrl);
  const linkStyle = {
    color: "var(--c1b-green)",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  } as const;

  return (
    <div
      style={{
        border: "1px solid var(--c1b-border-card)",
        borderRadius: 8,
        background: "var(--c1b-card)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <p className="mono-label" style={{ color: "var(--c1b-muted)", marginBottom: 2 }}>
        Source / reviewed
      </p>
      {(sourceMeta.sourceUrl || sourceMeta.sourceTitle) && (
        <p style={detailText}>
          <span style={detailLabel}>Official source{sourceUrls.length > 1 ? "s" : ""}: </span>
          {sourceUrls.length > 0 ? (
            sourceUrls.map((url, index) => (
              <span key={url}>
                {index > 0 && " · "}
                <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>
                  {index === 0 ? sourceMeta.sourceTitle ?? "State board guidance" : `Source ${index + 1}`}
                </a>
              </span>
            ))
          ) : (
            <span>{sourceMeta.sourceTitle}</span>
          )}
        </p>
      )}
      {sourceMeta.effectiveDate && (
        <p style={detailText}>
          <span style={detailLabel}>Required since: </span>
          {formatReviewDate(sourceMeta.effectiveDate)}
        </p>
      )}
      {sourceMeta.lastReviewed && (
        <p style={detailText}>
          <span style={detailLabel}>Last reviewed by ClearCME: </span>
          {formatReviewDate(sourceMeta.lastReviewed)}
        </p>
      )}
      {sourceMeta.hoursLabel && (
        <p style={detailText}>
          <span style={detailLabel}>Requirement: </span>
          {sourceMeta.hoursLabel}
        </p>
      )}
      {sourceMeta.conditionText && (
        <p style={detailText}>
          <span style={detailLabel}>{sourceMeta.isConditional ? "Applies when: " : "Scope / caveat: "}</span>
          {sourceMeta.conditionText}
        </p>
      )}
      {sourceMeta.timingNote && (
        <p style={detailText}>
          <span style={detailLabel}>Timing: </span>
          {sourceMeta.timingNote}
        </p>
      )}
      {sourceMeta.stateCycleNote && (
        <p style={detailText}>
          <span style={detailLabel}>State cycle: </span>
          {sourceMeta.stateCycleNote}
        </p>
      )}
      <p style={detailText}>
        <span style={detailLabel}>Why this applies: </span>
        {sourceMeta.whyThisApplies}
      </p>
    </div>
  );
}

function buildRequirementSourceMeta({
  state,
  licenseType,
  sourceUrl,
  ruleUpdatedAt,
  ruleNotes,
  displayName,
  hoursRequired,
  firstRenewalOnly,
  isConditional,
  requirementNotes,
  effectiveDate,
}: {
  state: string;
  licenseType: string;
  sourceUrl?: string | null;
  ruleUpdatedAt?: Date;
  ruleNotes?: string | null;
  displayName: string;
  hoursRequired: number;
  firstRenewalOnly: boolean;
  isConditional: boolean;
  requirementNotes?: string | null;
  effectiveDate?: Date | null;
}): RequirementSourceMeta {
  const stateName = formatStateName(state);
  // The requirement's hours and its gating clause arrive glued together in
  // `notes`; the state's cycle text is a separate fact entirely. Blindly
  // concatenating all three produced sentences that didn't parse.
  const { hoursLabel, detail } = parseRequirementNotes(requirementNotes);

  return {
    sourceTitle: `${stateName} ${licenseType} licensing requirements`,
    sourceUrl: sourceUrl ?? undefined,
    lastReviewed: ruleUpdatedAt,
    effectiveDate: effectiveDate ?? null,
    hoursLabel: hoursLabel ?? undefined,
    conditionText: detail ?? undefined,
    isConditional,
    timingNote: firstRenewalOnly
      ? "Applies as a one-time / first-renewal requirement when applicable."
      : undefined,
    stateCycleNote: ruleNotes ?? undefined,
    whyThisApplies: isConditional
      ? `Your tracked license is ${state} ${licenseType}, and the ${stateName} rule set includes ${hoursRequired.toFixed(0)} hour${hoursRequired === 1 ? "" : "s"} of ${displayName} for physicians who meet a practice condition. Your license alone doesn't tell ClearCME whether it binds you, so we ask rather than assume.`
      : `This appears because your tracked license is ${state} ${licenseType}, and the ${stateName} rule set includes ${hoursRequired.toFixed(0)} hour${hoursRequired === 1 ? "" : "s"} of ${displayName}${firstRenewalOnly ? " as a one-time requirement" : " in this renewal cycle"}.`,
  };
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

      // Topics that appear on more than one requirement in this rule — their
      // rows need distinct names or they read as duplicates.
      const duplicatedTopics = new Set(
        rule.mandatoryRequirements
          .map((r) => r.topic)
          .filter((topic, i, all) => all.indexOf(topic) !== i)
      );

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
        const isNotApplicable = fulfillment.isNotApplicable && !hoursSatisfied;
        const isUnknown = fulfillment.isUnknown && !hoursSatisfied;
        const actionableGap = isUnknown ? 0 : Math.max(0, req.hoursRequired - earnedForTopic);
        const isConditional = req.cadence === "CONDITIONAL";
        const displayName = requirementDisplayName(req.topic, req.description, {
          isConditional,
          topicIsDuplicated: duplicatedTopics.has(req.topic),
        });
        const conditionText = isConditional
          ? shortConditionText(parseRequirementNotes(req.notes).detail)
          : null;
        const completionStatus: AttestationStatus = completion
          ? completion.notes === NOT_APPLICABLE_REQUIREMENT_NOTE
            ? "not_applicable"
            : completion.notes === NOT_COMPLETED_REQUIREMENT_NOTE
            ? "not_completed"
            : "completed"
          : "none";
        // Pre-fill attestables from uploads: when a certificate's extracted
        // topics/hours clearly cover an unanswered attestable row, surface it
        // as "Looks satisfied by <cert>" with a one-tap confirm. All completed
        // certs are searched (not just this cycle) — one-time training from
        // any year satisfies a one-time requirement.
        const suggestionSource =
          !completion && !hoursSatisfied && fulfillment.isAttestable && !fulfillment.isSatisfied
            ? findSatisfyingCertificate(certificates, req.topic, req.hoursRequired)
            : null;
        const suggestedCert: SuggestedCertificate | null = suggestionSource
          ? {
              id: suggestionSource.id,
              title: suggestionSource.title ?? suggestionSource.fileName,
              year: suggestionSource.activityDate?.getUTCFullYear() ?? null,
              hours: suggestionSource.creditHours,
            }
          : null;
        const linkedCert = completion
          ? certificates.find((cert) => cert.id === linkedCertificateId(completion.notes))
          : undefined;
        return {
          requirementId: req.id,
          topic: req.topic,
          displayName,
          description: req.description ?? undefined,
          isConditional,
          conditionText,
          isNotApplicable,
          earned: earnedForTopic,
          needed: req.hoursRequired,
          gap: isMet || isNotApplicable ? 0 : actionableGap,
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
            displayName,
            hoursRequired: req.hoursRequired,
            firstRenewalOnly: req.firstRenewalOnly,
            isConditional,
            requirementNotes: req.notes,
            effectiveDate: req.effectiveDate,
          }),
          completionStatus,
          completedYear: completion?.completedYear ?? null,
          suggestedCert,
          satisfiedByCertLabel: linkedCert ? linkedCert.title ?? linkedCert.fileName : null,
        };
      });
      const allMandatoryMet = mandatoryGapsPreview.every((g) => g.isMet || g.isNotApplicable);
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

  // Shared next-action engine — same recommendation as the dashboard hero card.
  // Here it only decides which requirement row starts expanded.
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
        totalHoursRequired: d.totalHoursNeeded,
        isCompliant: d.isCompliant,
        mandatoryGaps: d.mandatoryGaps.map((g) => ({
          topic: g.topic,
          gap: g.gap,
          isMet: g.isMet,
          isUnknown: g.isUnknown,
          isNotApplicable: g.isNotApplicable,
          // Match by requirement id, not topic — a license can have multiple
          // rows for the same topic (e.g. NV's 2-hr state Substance Use rule
          // alongside the 8-hr federal DEA MATE one-time requirement).
          isOneTime:
            d.rule?.mandatoryRequirements.find((r) => r.id === g.requirementId)
              ?.firstRenewalOnly ?? false,
        })),
      }))
  );

  // The user's full open-gap set — the matcher needs it for cross-credit badges
  const allOpenGaps: OpenGap[] = complianceData.flatMap((d) =>
    d.mandatoryGaps
      .filter((g) => !g.isMet && !g.isNotApplicable && !g.isUnknown && g.gap > 0)
      .map((g) => ({ scope: d.license.state, topic: g.topic }))
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
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Aha-moment modal — fires once on first compliance map visit */}
      {ahaProps && ahaProps.requirementCount > 0 && (
        <AhaMomentModal {...ahaProps} />
      )}

      {/* Header */}
      <div className="dash-head">
        <div>
          <p className="mono-label page-eyebrow">Full record</p>
          <h1 className="page-title">Compliance detail</h1>
          <p className="page-sub">
            Every requirement, cross-checked against state board sources.
          </p>
        </div>
        <div className="actions">
          <AuditExportButton variant="c1b" label="Audit ZIP" c1bStyle="outline" />
          <ComplianceExportButton exportData={exportData} variant="c1b" />
        </div>
      </div>

      {/* No licenses */}
      {licenses.length === 0 && (
        <div className="card" style={{ padding: "36px 24px", textAlign: "center" }}>
          <h3 className="card-title">No licenses configured</h3>
          <p style={{ margin: "8px auto 18px", maxWidth: 420, fontSize: 14, color: "var(--c1b-ink-2)" }}>
            Add your state medical licenses to see personalized compliance requirements.
          </p>
          <Link href="/dashboard/profile" className="btn-filled">
            Add licenses →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      {licenses.length > 0 && (() => {
        const stillToLog = complianceData.reduce((sum, d) => sum + (d.rule ? d.gapHours : 0), 0);
        const allGapsFlat = complianceData.flatMap((d) => d.mandatoryGaps);
        const topicsMet = allGapsFlat.filter((g) => g.isMet).length;
        const topicsNa = allGapsFlat.filter((g) => g.isNotApplicable).length;
        const topicsTotal = allGapsFlat.length;
        const withDeadline = complianceData
          .filter((d) => d.daysUntilRenewal != null)
          .sort((a, b) => (a.daysUntilRenewal ?? 9999) - (b.daysUntilRenewal ?? 9999));
        const next = withDeadline[0];
        return (
          <div className="stat-grid">
            <div className="stat-card">
              <p className="k">Hours filed</p>
              <p className="v">{totalHoursAllCerts.toFixed(1)}</p>
              <p className="s">
                across {certificates.length} certificate{certificates.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="stat-card">
              <p className="k">Still to log</p>
              <p className={`v${stillToLog > 0 ? " amber" : ""}`}>{stillToLog.toFixed(1)}</p>
              <p className="s">
                across {licenses.length} credential{licenses.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="stat-card">
              <p className="k">Topics met</p>
              <p className="v">
                {topicsMet}/{Math.max(0, topicsTotal - topicsNa)}
              </p>
              <p className="s">{topicsNa > 0 ? `${topicsNa} not applicable` : "mandated topics"}</p>
            </div>
            <div className="stat-card">
              <p className="k">Next deadline</p>
              <p className="v">
                {next?.daysUntilRenewal != null
                  ? next.daysUntilRenewal <= 0
                    ? "Due"
                    : `${next.daysUntilRenewal}d`
                  : "—"}
              </p>
              <p className="s">
                {next?.license.renewalDate
                  ? `${formatStateName(next.license.state)} · ${formatDateUTC(next.license.renewalDate, { month: "short", day: "numeric", year: "numeric" })}`
                  : "set a renewal date"}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Per-credential record — tabbed */}
      <CredentialTabs
        tabs={complianceData.map(
          (d) => `${formatStateName(d.license.state)} — ${d.license.licenseType}`
        )}
      >
      {complianceData.map(({ license, rule, totalHoursEarned, totalHoursNeeded, gapHours, isCompliant, mandatoryGaps, daysUntilRenewal, cycleCerts, blockedMessage }) => {
        const rows: RequirementRow[] = [];

        // General hours — first row of the table, same grammar as topic rows
        if (rule && totalHoursNeeded > 0) {
          const generalGap = Math.max(0, totalHoursNeeded - totalHoursEarned);
          const genMet = generalGap === 0;
          let genStatus = "Open";
          let genTone: RequirementRow["statusTone"] = "open";
          let paceSentence: string | null = null;
          if (genMet) {
            genStatus = "Met";
            genTone = "met";
          } else if (daysUntilRenewal !== null && daysUntilRenewal <= 0) {
            genStatus = "Action needed";
          } else if (daysUntilRenewal !== null && daysUntilRenewal > 0) {
            const monthsLeft = daysUntilRenewal / 30.4;
            const hrsPerMonth = monthsLeft > 0 ? gapHours / monthsLeft : gapHours;
            const pctTimeLeft = daysUntilRenewal / (rule.renewalCycle * 30.4);
            const pctDone = totalHoursNeeded > 0 ? totalHoursEarned / totalHoursNeeded : 0;
            const onTrack = pctDone >= 1 - pctTimeLeft;
            genStatus = onTrack ? "On pace" : "Behind";
            genTone = onTrack ? "muted" : "open";
            paceSentence = `To finish by renewal, log ${hrsPerMonth.toFixed(1)} hrs/month.`;
          }
          rows.push({
            key: `${license.id}-general`,
            name: "General hours",
            note: `${totalHoursNeeded.toFixed(0)} hours of accredited CME each renewal cycle`,
            srcLine: `Source: ${formatStateName(license.state)} ${license.licenseType} licensing requirements · verified ${formatDateUTC(rule.updatedAt, { month: "short", day: "numeric", year: "numeric" })}`,
            rule: "per cycle",
            hrsLabel: `${totalHoursEarned.toFixed(1)} / ${totalHoursNeeded.toFixed(0)}`,
            pct: (totalHoursEarned / totalHoursNeeded) * 100,
            barTone: genMet ? "met" : "open",
            status: genStatus,
            statusTone: genTone,
            detail: (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {paceSentence && <p style={detailText}>{paceSentence}</p>}
                <p style={{ fontSize: 12.5, color: "var(--c1b-muted)" }}>
                  {cycleCerts.length} certificate{cycleCerts.length === 1 ? "" : "s"} counted in this cycle.{" "}
                  <Link
                    href="/dashboard/upload"
                    style={{ fontWeight: 600, color: "var(--c1b-green)", textDecoration: "none" }}
                  >
                    Add certificate →
                  </Link>
                </p>
              </div>
            ),
          });
        }

        // Mandatory topic rows — actionable rows stay on top; settled rows
        // (met / not applicable) drop below a "Complete" divider so one-time
        // history doesn't clutter the live cycle work. Nothing is hidden:
        // this page is the audit ledger, so every row stays on the record.
        const actionableRows: RequirementRow[] = [];
        const settledRows: RequirementRow[] = [];
        mandatoryGaps.forEach((gap) => {
          const sourceMeta = gap.sourceMeta;

          let status = "Open";
          let statusTone: RequirementRow["statusTone"] = "open";
          if (gap.isNotApplicable) {
            status = "N/A";
            statusTone = "muted";
          } else if (gap.isMet) {
            status = "Met";
            statusTone = "met";
          } else if (gap.isUnknown) {
            status = "Needs input";
          } else if (daysUntilRenewal !== null && daysUntilRenewal <= 90) {
            status = "Action needed";
          }

          const verifiedLabel = formatReviewDate(sourceMeta?.lastReviewed);
          let srcLine = sourceMeta
            ? `Source: ${sourceMeta.sourceTitle}${verifiedLabel ? ` · verified ${verifiedLabel}` : ""}`
            : null;
          if (gap.satisfiedByCertLabel) {
            srcLine = `Satisfied by ${gap.satisfiedByCertLabel}`;
          } else if (gap.completionStatus === "completed") {
            srcLine = `You attested completion${gap.completedYear ? ` · ${gap.completedYear}` : ""}`;
          } else if (gap.isNotApplicable) {
            srcLine = "You marked this as not applicable";
          } else if (gap.suggestedCert && !gap.isMet) {
            srcLine = `Looks satisfied by ${gap.suggestedCert.title} — open this row to confirm`;
          }

          const note =
            gap.isConditional && gap.conditionText
              ? conditionSummary(gap.conditionText)
              : gap.description && gap.description !== gap.displayName
              ? gap.description
              : null;

          const showCourseBits = !gap.isMet && !gap.isUnknown && !gap.isNotApplicable;
          const destination = courseDestination(gap.topic);

          // The fraction measures THIS cycle's uploaded hours — the right
          // cell for per-cycle rows, the wrong one for a requirement
          // satisfied by attestation/history. "0.0 / 2" under MET reads as
          // deficient; the honest cell there is "met" (never a fabricated
          // fraction), with provenance on the source line.
          const metByHours = gap.needed > 0 && gap.earned >= gap.needed;

          const row: RequirementRow = {
            key: gap.requirementId,
            name: gap.displayName,
            note,
            srcLine,
            rule: ruleCell(gap.cadenceLabel, gap.isConditional),
            hrsLabel:
              gap.isMet && !metByHours
                ? "met"
                : gap.needed > 0
                ? `${gap.earned.toFixed(1)} / ${gap.needed.toFixed(0)}`
                : "n/a",
            pct: gap.isMet ? 100 : gap.needed > 0 ? (gap.earned / gap.needed) * 100 : 0,
            barTone: gap.isMet
              ? "met"
              : gap.needed > 0 && !gap.isNotApplicable && !gap.isUnknown
              ? "open"
              : "none",
            status,
            statusTone,
            defaultOpen:
              nextAction?.topic === gap.topic &&
              nextAction?.licenseState === license.state &&
              !gap.isMet,
            detail: (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* The gating clause is the first thing that decides whether
                    this row is even the physician's problem. */}
                {gap.isConditional && sourceMeta?.conditionText && (
                  <div
                    style={{
                      border: "1px solid var(--c1b-border-card)",
                      background: "var(--c1b-card)",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--c1b-ink)" }}>
                      {formatStateName(license.state)} only requires this of some physicians
                    </p>
                    <p style={{ marginTop: 3, ...detailText }}>
                      {conditionSummary(sourceMeta.conditionText)}
                    </p>
                  </div>
                )}
                {gap.isConditional && gap.description && gap.description !== gap.displayName && (
                  <p style={detailText}>{gap.description}</p>
                )}
                <p style={{ fontSize: 12, color: "var(--c1b-muted)" }}>
                  Cadence: {gap.cadenceLabel}
                  {sourceMeta?.hoursLabel ? ` · ${sourceMeta.hoursLabel}` : ""}
                  {gap.satisfiedUntil ? ` · satisfied until ${formatReviewDate(gap.satisfiedUntil)}` : ""}
                </p>
                {showCourseBits && gap.gap > 0 && (
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--c1b-amber-text)", marginTop: -6 }}>
                    {gap.gap.toFixed(1)} hrs short
                  </p>
                )}

                {gap.isUnknown && (
                  <div
                    style={{
                      border: "1px solid rgba(169,114,42,.32)",
                      background: "rgba(169,114,42,.07)",
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--c1b-ink)" }}>
                      {gap.isConditional
                        ? "Does this apply to you?"
                        : "Tell ClearCME if you already completed this."}
                    </p>
                    <p style={{ marginTop: 4, ...detailText }}>
                      {gap.prompt ?? "This requirement may be one-time or long-cycle, so we need your history before counting it as still due."}
                    </p>
                    <p style={{ marginTop: 4, fontSize: 12, color: "var(--c1b-muted)" }}>
                      This is not an error — it keeps recommendations from over-counting CME you may already have.
                    </p>
                    <RequirementAttestation
                      requirementId={gap.requirementId}
                      licenseId={license.id}
                      status={gap.completionStatus}
                      completedYear={gap.completedYear}
                      allowNotApplicable={gap.isConditional}
                      suggestedCert={gap.suggestedCert}
                      satisfiedByCertLabel={gap.satisfiedByCertLabel}
                      compact
                    />
                  </div>
                )}

                {/* Answered history — single status card + follow-up actions.
                    Also rendered for an unanswered row when an uploaded
                    certificate looks like it satisfies it (pre-fill). */}
                {!gap.isUnknown &&
                  gap.isAttestable &&
                  (gap.completionStatus !== "none" ||
                    (gap.suggestedCert && !gap.isMet && !gap.isNotApplicable)) && (
                  <RequirementAttestation
                    requirementId={gap.requirementId}
                    licenseId={license.id}
                    status={gap.completionStatus}
                    completedYear={gap.completedYear}
                    allowNotApplicable={gap.isConditional}
                    suggestedCert={gap.suggestedCert}
                    satisfiedByCertLabel={gap.satisfiedByCertLabel}
                    compact
                  />
                )}

                {showCourseBits && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <Link
                        href={destination.href}
                        {...(destination.isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                        className="btn-filled"
                        style={{ padding: "8px 14px", fontSize: 12.5 }}
                      >
                        {destination.isExactMatch
                          ? TOPIC_LABELS[gap.topic] ?? "Find Accredited CME →"
                          : courseCtaLabel(gap.topic, formatTopic(gap.topic))}
                      </Link>
                      <span style={{ fontSize: 11.5, color: "var(--c1b-muted)" }}>
                        {HIPPO_TOPICS.has(gap.topic) ? "via Hippo Education" : "ACCME-accredited · Cat 1"}
                      </span>
                    </div>
                    <GapCourseFeed
                      topic={gap.topic}
                      hoursNeeded={gap.gap}
                      limit={hasFullCourseChoice ? 3 : 1}
                      showUpgradePrompt={!hasFullCourseChoice}
                    />
                  </div>
                )}

                {sourceMeta && <SourceBlock sourceMeta={sourceMeta} />}
              </div>
            ),
          };

          if (gap.isMet || gap.isNotApplicable) {
            settledRows.push(row);
          } else {
            actionableRows.push(row);
          }
        });

        if (actionableRows.length > 0) {
          // Aha-moment scroll target — the first live gap
          actionableRows[0].isScrollTarget = true;
        }
        if (settledRows.length > 0) {
          settledRows[0].dividerBefore = "Complete · no action needed";
        }
        rows.push(...actionableRows, ...settledRows);

        const bandSourceUrls = rule ? parseSourceUrls(rule.sourceUrl ?? undefined) : [];
        const sourcesChecked = rule
          ? formatDateUTC(rule.updatedAt, { month: "short", day: "numeric", year: "numeric" })
          : null;

        return (
        <div key={license.id}>
        <section className="card" style={{ overflow: "hidden" }}>
          {/* Dark band header */}
          <div className="dark-band">
            <div className="head">
              <h2 className="t">
                {formatStateName(license.state)} — {license.licenseType}
              </h2>
              <span className="vdiv" aria-hidden="true" />
              <p className="s">
                {license.renewalDate ? `Renews ${formatDateUTC(license.renewalDate)}` : "No renewal date set"}
                {rule ? ` · ${rule.totalHours > 0 ? `${rule.totalHours} hours every ${rule.renewalCycle % 12 === 0 ? `${rule.renewalCycle / 12} year${rule.renewalCycle === 12 ? "" : "s"}` : `${rule.renewalCycle} months`}` : "mandated topics only"}` : ""}
              </p>
            </div>
            <div className="right">
              {sourcesChecked && (
                <p className="src">
                  {bandSourceUrls.length > 0 ? (
                    <a href={bandSourceUrls[0]} target="_blank" rel="noreferrer">
                      Sources checked {sourcesChecked}
                    </a>
                  ) : (
                    <>Sources checked {sourcesChecked}</>
                  )}
                </p>
              )}
              <span className={`chip ${!rule ? "chip-ondark-warn" : isCompliant ? "chip-ondark-ok" : "chip-ondark-warn"}`}>
                {!rule ? "Rules pending" : isCompliant ? "On track" : "Action needed"}
              </span>
            </div>
          </div>

          {!rule ? (
            <div style={{ padding: "30px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--c1b-ink-2)" }}>
                {blockedMessage ?? "Compliance rules for this license are not yet loaded."}
              </p>
              <p style={{ marginTop: 6, fontSize: 12.5, color: "var(--c1b-muted)" }}>
                We&apos;re adding state requirements continuously — check back soon.
              </p>
            </div>
          ) : rows.length > 0 ? (
            <RequirementTable rows={rows} />
          ) : (
            <p style={{ padding: "22px 20px", fontSize: 13.5, color: "var(--c1b-muted)" }}>
              No mandatory topic requirements configured for this license.
            </p>
          )}
        </section>

        {/* "Fill what's left" — verified course matches per open gap (Track B
            data). Renders nothing until a gap has ≥1 verified match. */}
        {mandatoryGaps
          .filter((g) => !g.isMet && !g.isNotApplicable && !g.isUnknown && g.gap > 0)
          .map((g) => (
            <FillWhatsLeft
              key={g.requirementId}
              gapLabel={`${g.displayName} · ${g.gap.toFixed(1)} hrs left`}
              matches={matchCoursesForGap({ scope: license.state, topic: g.topic }, allOpenGaps)}
            />
          ))}
        </div>
        );
      })}
      </CredentialTabs>

      {/* Certificates — full list lives on its own page */}
      <Link
        href="/dashboard/certificates"
        className="card transition-colors hover:border-[var(--c1b-green)]"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          textDecoration: "none",
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--c1b-ink)" }}>
            {certificates.length} certificate{certificates.length === 1 ? "" : "s"} on file
          </span>
          <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "var(--c1b-muted)" }}>
            {totalHoursAllCerts.toFixed(1)} hrs total · AI-extracted credit details
          </span>
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--c1b-green)", flexShrink: 0 }}>
          View all →
        </span>
      </Link>
    </div>
  );
}
