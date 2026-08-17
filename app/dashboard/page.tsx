export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import AuditExportButton from "@/components/dashboard/AuditExportButton";
import ComplianceDiffNotifications from "@/components/dashboard/ComplianceDiffNotifications";
import PacePlanner from "@/components/console/PacePlanner";
import { courseDestination } from "@/lib/course-routing";
import { daysUntil, formatDateUTC } from "@/lib/dates";
import { buildNextAction } from "@/lib/next-action";
import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { evaluateRequirementFulfillment } from "@/lib/requirement-completions";
import { formatTopic } from "@/lib/requirement-display";
import { formatStateName } from "@/lib/state-names";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [certificates, licenses, requirementCompletions, emailPreference] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.userRequirementCompletion.findMany({
      where: { userId },
    }),
    prisma.emailPreference.findUnique({
      where: { userId },
      select: { renewalReminders: true },
    }),
  ]);

  const completionByRequirementAndLicense = new Map(
    requirementCompletions.map((completion) => [
      `${completion.mandatoryRequirementId}:${completion.physicianLicenseId ?? "global"}`,
      completion,
    ])
  );

  // Quick setup intercept: redirect first-time users with no licenses
  if (licenses.length === 0 && certificates.length === 0) {
    redirect("/dashboard/setup");
  }

  const completedCerts = certificates.filter((c) => c.extractionStatus === "COMPLETED");
  const totalHours = completedCerts.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);

  // Compute compliance for all licenses
  const complianceData = await Promise.all(
    licenses.map(async (license) => {
      if (isComputedComplianceBlocked(license.state, license.licenseType)) return null;

      const rule = await prisma.complianceRule.findUnique({
        where: {
          state_licenseType: { state: license.state, licenseType: license.licenseType },
        },
        include: { mandatoryRequirements: true },
      });
      if (!rule) return null;

      const cycleEnd = license.renewalDate ?? new Date();
      const cycleStart = new Date(cycleEnd);
      cycleStart.setMonth(cycleStart.getMonth() - rule.renewalCycle);

      const cycleCerts = completedCerts.filter((cert) => {
        if (!cert.activityDate) return false;
        return cert.activityDate >= cycleStart && cert.activityDate <= cycleEnd;
      });

      const hoursEarned = cycleCerts.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
      const hoursNeeded = Math.max(0, rule.totalHours - hoursEarned);

      const mandatoryResults = rule.mandatoryRequirements.map((req) => {
        const earned = cycleCerts
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
        const hoursSatisfied = req.hoursRequired > 0 && earned >= req.hoursRequired;
        const isUnknown = fulfillment.isUnknown && !hoursSatisfied;
        const isNotApplicable = fulfillment.isNotApplicable && !hoursSatisfied;
        return {
          topic: req.topic,
          earned,
          needed: req.hoursRequired,
          isMet: hoursSatisfied || fulfillment.isSatisfied || (!historySensitive && req.hoursRequired === 0),
          isUnknown,
          isNotApplicable,
          isOneTime: req.firstRenewalOnly,
        };
      });

      const actionable = mandatoryResults.filter((r) => !r.isMet && !r.isUnknown && !r.isNotApplicable);
      const mandatoryMet = mandatoryResults.filter((r) => r.isMet).length;
      const mandatoryGapHours = actionable.reduce((sum, r) => sum + Math.max(0, r.needed - r.earned), 0);
      const mandatoryPendingCount = actionable.length;
      const effectiveHoursNeeded = Math.max(hoursNeeded, mandatoryGapHours);
      const isCompliant =
        hoursNeeded === 0 && mandatoryResults.every((r) => r.isMet || r.isUnknown || r.isNotApplicable);

      const daysUntilRenewal = daysUntil(license.renewalDate);

      const mandatoryTopics = actionable
        .map((r) => ({
          topic: r.topic,
          hoursNeeded: Math.max(0, r.needed - r.earned),
        }));

      return {
        license,
        rule,
        hoursEarned,
        hoursNeeded,
        mandatoryMet,
        mandatoryTotal: rule.mandatoryRequirements.length,
        mandatoryPendingCount,
        mandatoryGapHours,
        mandatoryTopics,
        mandatoryResults,
        effectiveHoursNeeded,
        daysUntilRenewal,
        isCompliant,
      };
    })
  );

  const validCompliance = complianceData.filter(Boolean) as NonNullable<(typeof complianceData)[number]>[];
  const nextRenewal = [...validCompliance].sort((a, b) => (a.daysUntilRenewal ?? 9999) - (b.daysUntilRenewal ?? 9999))[0];

  const totalHoursStillNeeded = validCompliance.reduce((sum, d) => sum + d.effectiveHoursNeeded, 0);
  const allCompliant = validCompliance.length > 0 && validCompliance.every((d) => d.isCompliant);
  const unansweredHistoryCount = validCompliance.reduce(
    (sum, d) => sum + d.mandatoryResults.filter((r) => r.isUnknown).length,
    0
  );

  const hasLicenses = licenses.length > 0;
  const hasCertificates = certificates.length > 0;

  // Shared next-action engine — same recommendation as the Compliance page
  const nextAction = buildNextAction(
    validCompliance.map((d) => ({
      state: d.license.state,
      licenseType: d.license.licenseType,
      daysUntilRenewal: d.daysUntilRenewal,
      renewalDateLabel: d.license.renewalDate
        ? formatDateUTC(d.license.renewalDate, { month: "short", day: "numeric", year: "numeric" })
        : "your renewal date",
      generalGapHours: d.hoursNeeded,
      totalHoursRequired: d.rule?.totalHours,
      isCompliant: d.isCompliant,
      mandatoryGaps: d.mandatoryResults.map((r) => ({
        topic: r.topic,
        gap: Math.max(0, r.needed - r.earned),
        isMet: r.isMet,
        isUnknown: r.isUnknown,
        isNotApplicable: r.isNotApplicable,
        isOneTime: r.isOneTime,
      })),
    }))
  );

  // Next-action rows (numbered card in the right rail), engine pick first
  const allGaps: { label: string; detail: string; href: string; urgency: number; topic?: string; state?: string }[] = [];
  for (const d of validCompliance) {
    if (d.hoursNeeded > 0) {
      allGaps.push({
        label: `Log ${d.hoursNeeded.toFixed(1)} general hours for ${formatStateName(d.license.state)}`,
        detail:
          d.daysUntilRenewal != null
            ? `${formatStateName(d.license.state)} ${d.license.licenseType} · ${d.daysUntilRenewal} days to renewal`
            : `${formatStateName(d.license.state)} ${d.license.licenseType} · no renewal date set`,
        href: "/dashboard/compliance",
        urgency: d.daysUntilRenewal != null ? 10000 - d.daysUntilRenewal : 0,
        state: d.license.state,
      });
    }
    for (const t of d.mandatoryTopics) {
      allGaps.push({
        label: `Close the ${formatTopic(t.topic).toLowerCase()} requirement`,
        detail: `${formatStateName(d.license.state)} · ${t.hoursNeeded.toFixed(1)} hrs still open`,
        href: courseDestination(t.topic).href,
        urgency: d.daysUntilRenewal != null ? 10000 - d.daysUntilRenewal + 1 : 1,
        topic: t.topic,
        state: d.license.state,
      });
    }
  }
  if (unansweredHistoryCount > 0) {
    allGaps.push({
      label: `Confirm ${unansweredHistoryCount} one-time requirement${unansweredHistoryCount === 1 ? "" : "s"}`,
      detail: "Tell ClearCME what you've already completed — takes under a minute",
      href: "/dashboard/compliance",
      urgency: 5000,
    });
  }
  allGaps.sort((a, b) => {
    const aIsPick = a.topic === nextAction?.topic && a.state === nextAction?.licenseState;
    const bIsPick = b.topic === nextAction?.topic && b.state === nextAction?.licenseState;
    if (aIsPick !== bIsPick) return aIsPick ? -1 : 1;
    return b.urgency - a.urgency;
  });
  const topActions = allGaps.slice(0, 3);

  // Deadline pills, soonest first; the soonest gets the amber (urgent) label
  const deadlinePills = validCompliance
    .filter((d) => d.license.renewalDate)
    .sort((a, b) => (a.daysUntilRenewal ?? 9999) - (b.daysUntilRenewal ?? 9999))
    .map((d, i) => ({
      key: d.license.id,
      state: `${formatStateName(d.license.state)} — ${d.license.licenseType}`,
      date: formatDateUTC(d.license.renewalDate!, { month: "short", day: "numeric", year: "numeric" }),
      months: d.daysUntilRenewal != null ? Math.max(0, Math.round(d.daysUntilRenewal / 30.4)) : null,
      urgent: i === 0 && !d.isCompliant,
    }));

  const paceDeadlines = validCompliance
    .filter((d) => d.license.renewalDate)
    .map((d) => ({
      label: formatStateName(d.license.state),
      date: d.license.renewalDate!.toISOString(),
      dateLabel: formatDateUTC(d.license.renewalDate!, { month: "short", day: "numeric", year: "numeric" }),
    }));

  const sourcesCheckedLabel = validCompliance.length
    ? formatDateUTC(
        new Date(Math.max(...validCompliance.map((d) => +d.rule.updatedAt))),
        { month: "short", day: "numeric", year: "numeric" }
      )
    : null;

  const ledgerStatus = (r: {
    isMet: boolean;
    isUnknown: boolean;
    isNotApplicable: boolean;
    earned: number;
    needed: number;
  }) => {
    if (r.isNotApplicable) return { chip: "N/A", cls: "chip-muted", dot: "dot-na", fill: null };
    if (r.isMet) return { chip: "Met", cls: "chip-met", dot: "dot-met", fill: "fill-met" };
    if (r.isUnknown) return { chip: "Review", cls: "chip-muted", dot: "dot-na", fill: "fill-open" };
    return { chip: "Open", cls: "chip-open", dot: "dot-open", fill: "fill-open" };
  };

  return (
    <div>
      {/* Header row: hero stat + deadline pills / actions */}
      <div className="dash-head">
        <div>
          <p className="mono-label page-eyebrow">
            Compliance status · {validCompliance.length} credential{validCompliance.length === 1 ? "" : "s"}
          </p>
          <div className="hero-stat" style={{ marginTop: 10 }}>
            <span className="num">{totalHoursStillNeeded.toFixed(1)}</span>
            <span className="desc">hours of CME still to log</span>
          </div>
          {deadlinePills.length > 0 && (
            <div className="deadline-pills" style={{ marginTop: 16 }}>
              {deadlinePills.map((p) => (
                <div key={p.key} className={`deadline-pill${p.urgent ? " urgent" : ""}`}>
                  <div className="st">{p.state}</div>
                  <div className="date">
                    {p.date}
                    {p.months != null && <span className="rel"> · {p.months} months</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="actions">
          <Link href="/dashboard/upload" className="btn-outline">
            Add certificate
          </Link>
          <AuditExportButton variant="c1b" label="Export record" c1bStyle="filled" />
        </div>
      </div>

      {/* Onboarding — activation checklist stays until complete */}
      <div style={{ marginTop: 20 }}>
        <OnboardingChecklist
          hasLicense={hasLicenses}
          hasCertificate={hasCertificates}
          hasComplianceData={validCompliance.length > 0}
          // renewalReminders defaults to true in the schema — a missing row
          // means the user never turned them off, so the step counts as done.
          hasRenewalAlerts={emailPreference?.renewalReminders ?? true}
        />
      </div>

      {/* No certificates yet: upload CTA */}
      {!hasCertificates && (
        <div className="card" style={{ marginTop: 20, padding: "28px 24px", textAlign: "center" }}>
          <h2 className="card-title">Upload your first certificate</h2>
          <p style={{ margin: "8px auto 16px", maxWidth: 420, fontSize: 14, color: "var(--c1b-ink-2)" }}>
            Your state requirements are already mapped below. Add a certificate and ClearCME reads
            the hours and files them against the right requirement.
          </p>
          <Link href="/dashboard/upload" className="btn-filled">
            Upload first certificate →
          </Link>
        </div>
      )}

      <ComplianceDiffNotifications />

      <div className="dash-grid">
        {/* Requirement ledger */}
        <section className="card" aria-label="Requirement ledger">
          <div className="card-head">
            <h2 className="card-title">Requirement ledger</h2>
            {sourcesCheckedLabel && <span className="meta">Sources checked {sourcesCheckedLabel}</span>}
          </div>
          {validCompliance.length === 0 && (
            <p style={{ padding: "8px 18px 18px", fontSize: 14, color: "var(--c1b-ink-2)" }}>
              Add a license to see its requirements mapped here.{" "}
              <Link href="/dashboard/profile" style={{ fontWeight: 600, color: "var(--c1b-green)" }}>
                Add a license →
              </Link>
            </p>
          )}
          {validCompliance.map((d) => {
            const renews = d.license.renewalDate
              ? formatDateUTC(d.license.renewalDate, { month: "short", day: "numeric", year: "numeric" })
              : null;
            return (
              <div key={d.license.id}>
                <div className="band-row">
                  <span>
                    {formatStateName(d.license.state)} — {d.license.licenseType}
                    {renews ? ` / Renews ${renews}` : ""}
                  </span>
                  <span className="r">{d.effectiveHoursNeeded.toFixed(1)} left</span>
                </div>

                {/* General hours row */}
                {d.rule.totalHours > 0 && (
                  <Link href="/dashboard/compliance" className="req-row" style={{ textDecoration: "none" }}>
                    <span
                      className={`dot ${d.hoursNeeded === 0 ? "dot-met" : "dot-open"}`}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="name">General hours</span>
                      <span className="note" style={{ display: "block" }}>
                        {d.rule.totalHours} hours every cycle
                      </span>
                    </span>
                    <span className="prog" aria-hidden="true">
                      <span
                        className={d.hoursNeeded === 0 ? "fill-met" : "fill-open"}
                        style={{
                          width: `${Math.min(100, (d.hoursEarned / Math.max(1, d.rule.totalHours)) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="hrs">
                      {d.hoursEarned.toFixed(1)}/{d.rule.totalHours}
                    </span>
                    <span className={`chip ${d.hoursNeeded === 0 ? "chip-met" : "chip-open"}`}>
                      {d.hoursNeeded === 0 ? "Met" : "Open"}
                    </span>
                  </Link>
                )}

                {d.mandatoryResults.map((r, i) => {
                  const s = ledgerStatus(r);
                  const pct =
                    r.needed > 0 ? Math.min(100, (r.earned / r.needed) * 100) : r.isMet ? 100 : 0;
                  return (
                    <Link
                      key={`${d.license.id}-${r.topic}-${i}`}
                      href="/dashboard/compliance"
                      className="req-row"
                      style={{ textDecoration: "none" }}
                    >
                      <span className={`dot ${s.dot}`} aria-hidden="true" />
                      <span>
                        <span className="name">{formatTopic(r.topic)}</span>
                        {r.isOneTime && (
                          <span className="note" style={{ display: "block" }}>
                            One-time requirement
                          </span>
                        )}
                      </span>
                      <span className="prog" aria-hidden="true">
                        {s.fill && <span className={s.fill} style={{ width: `${pct}%` }} />}
                      </span>
                      <span className="hrs">
                        {r.needed > 0 ? `${r.earned.toFixed(1)}/${r.needed}` : "—"}
                      </span>
                      <span className={`chip ${s.cls}`}>{s.chip}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </section>

        {/* Right rail */}
        <div className="rail">
          {!allCompliant && (
            <PacePlanner remainingHours={totalHoursStillNeeded} deadlines={paceDeadlines} />
          )}

          {allCompliant && (
            <section className="card" style={{ padding: 18 }}>
              <h2 className="card-title">You&apos;re audit-ready</h2>
              <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--c1b-ink-2)" }}>
                Every tracked requirement is met. Export your record any time — if your board ever
                asks, it&apos;s just another Tuesday.
              </p>
              <div style={{ marginTop: 12 }}>
                <AuditExportButton variant="c1b" label="Export record" c1bStyle="outline" />
              </div>
            </section>
          )}

          {topActions.length > 0 && (
            <section className="card next-actions" aria-label="Next actions">
              <div className="card-head">
                <h2 className="card-title">Next actions</h2>
              </div>
              {topActions.map((a, i) => (
                <Link key={`${a.label}-${i}`} href={a.href}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="t" style={{ display: "block" }}>
                      {a.label}
                    </span>
                    <span className="s" style={{ display: "block" }}>
                      {a.detail}
                    </span>
                  </span>
                  <span className="go" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </section>
          )}

          <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--c1b-muted)" }}>
            {totalHours.toFixed(1)} hours on file across {completedCerts.length} certificate
            {completedCerts.length === 1 ? "" : "s"}. Requirements are checked against state board
            sources; you&apos;re always responsible for what your board requires.
          </p>
        </div>
      </div>
    </div>
  );
}
