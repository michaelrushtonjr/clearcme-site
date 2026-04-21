export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import CertificateList from "@/components/CertificateList";
import HoursNeededTile from "@/components/HoursNeededTile";
import RenewalRing from "@/components/RenewalRing";
import GapCard from "@/components/dashboard/GapCard";
import AuditExportButton from "@/components/dashboard/AuditExportButton";
import ComplianceCelebration from "@/components/dashboard/ComplianceCelebration";
import { DashboardSection } from "@/components/dashboard/DashboardSections";
import { keyToSlug } from "@/lib/courses";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [certificates, licenses] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
  ]);

  // Quick setup intercept: redirect first-time users with no licenses
  if (licenses.length === 0 && certificates.length === 0) {
    redirect("/dashboard/setup");
  }

  const completedCerts = certificates.filter((c) => c.extractionStatus === "COMPLETED");
  const totalHours = completedCerts.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);

  // Compute compliance for all licenses
  const complianceData = await Promise.all(
    licenses.map(async (license) => {
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
        return {
          topic: req.topic,
          earned,
          needed: req.hoursRequired,
          isMet: earned >= req.hoursRequired,
        };
      });

      const mandatoryMet = mandatoryResults.filter((r) => r.isMet).length;
      const mandatoryGapHours = mandatoryResults
        .filter((r) => !r.isMet)
        .reduce((sum, r) => sum + Math.max(0, r.needed - r.earned), 0);
      const mandatoryPendingCount = rule.mandatoryRequirements.length - mandatoryMet;
      const effectiveHoursNeeded = Math.max(hoursNeeded, mandatoryGapHours);
      const isCompliant = hoursNeeded === 0 && mandatoryMet === rule.mandatoryRequirements.length;

      const daysUntilRenewal = license.renewalDate
        ? Math.ceil((license.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      // Breakdown data for the popover (unmet only — for gap display)
      const mandatoryTopics = mandatoryResults
        .filter((r) => !r.isMet)
        .map((r) => ({
          topic: r.topic,
          hoursNeeded: Math.max(0, r.needed - r.earned),
        }));

      // All mandatory topics for chip display (met + unmet)
      const allMandatoryTopics = mandatoryResults.map((r) => ({
        topic: r.topic,
        hoursNeeded: Math.max(0, r.needed - r.earned),
        isMet: r.isMet,
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
        allMandatoryTopics,
        effectiveHoursNeeded,
        daysUntilRenewal,
        isCompliant,
      };
    })
  );

  const validCompliance = complianceData.filter(Boolean) as NonNullable<(typeof complianceData)[number]>[];
  const nextRenewal = validCompliance.sort((a, b) => (a.daysUntilRenewal ?? 9999) - (b.daysUntilRenewal ?? 9999))[0];

  const totalMandatoryMet = validCompliance.reduce((sum, d) => sum + d.mandatoryMet, 0);
  const totalMandatoryRequired = validCompliance.reduce((sum, d) => sum + d.mandatoryTotal, 0);
  const totalHoursStillNeeded = validCompliance.reduce((sum, d) => sum + d.effectiveHoursNeeded, 0);

  // Build license breakdowns for the popover
  const licenseBreakdowns = validCompliance.map((d) => ({
    state: d.license.state,
    licenseType: d.license.licenseType,
    generalHoursNeeded: d.hoursNeeded,
    mandatoryGapHours: d.mandatoryGapHours,
    mandatoryPendingCount: d.mandatoryPendingCount,
    mandatoryTopics: d.mandatoryTopics,
  }));

  // Topic name shortening map for chip display
  const TOPIC_SHORT_NAMES: Record<string, string> = {
    OPIOID_PRESCRIBING: "Opioid/DEA MATE",
    SUBSTANCE_USE: "Substance Use",
    IMPLICIT_BIAS: "Implicit Bias",
    PATIENT_SAFETY: "Patient Safety",
    SUICIDE_PREVENTION: "Suicide Prevention",
    DOMESTIC_VIOLENCE: "Domestic Violence",
    HUMAN_TRAFFICKING: "Human Trafficking",
    ETHICS: "Ethics",
    DEA_MATE_ACT: "DEA MATE Act",
  };

  const hasLicenses = licenses.length > 0;
  const hasCertificates = certificates.length > 0;
  const isNewUser = !hasLicenses && !hasCertificates;
  const recentCerts = certificates.slice(0, 5);

  const onboardingComplete = hasLicenses && hasCertificates && validCompliance.length > 0;

  // Build top 3 compliance gaps for the attention card (ordered by urgency)
  const allGaps: { label: string; detail: string; href: string; urgency: number }[] = [];
  for (const d of validCompliance) {
    // General hour gaps
    if (d.hoursNeeded > 0) {
      allGaps.push({
        label: `${d.license.state} ${d.license.licenseType}: ${d.hoursNeeded.toFixed(1)} hrs still needed`,
        detail: d.daysUntilRenewal != null ? `${d.daysUntilRenewal} days to renewal` : "No renewal date set",
        href: "/dashboard/compliance",
        urgency: d.daysUntilRenewal != null ? 10000 - d.daysUntilRenewal : 0,
      });
    }
    // Mandatory topic gaps
    for (const t of d.mandatoryTopics) {
      allGaps.push({
        label: `${d.license.state}: ${t.topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())} — ${t.hoursNeeded.toFixed(1)} hrs short`,
        detail: "Mandatory topic requirement",
        href: "/dashboard/compliance",
        urgency: d.daysUntilRenewal != null ? 10000 - d.daysUntilRenewal + 1 : 1,
      });
    }
  }
  allGaps.sort((a, b) => b.urgency - a.urgency);
  const topGaps = allGaps.slice(0, 3);
  const allGapsCount = allGaps.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Your CME compliance dashboard
        </p>
      </div>

      {/* Onboarding checklist — 4-step activation */}
      <DashboardSection label="Onboarding Checklist">
        <OnboardingChecklist
          hasLicense={hasLicenses}
          hasCertificate={hasCertificates}
          hasComplianceData={validCompliance.length > 0}
        />
      </DashboardSection>

      {/* Empty state: no certificates uploaded yet — guided command center */}
      {!hasCertificates ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Your Compliance Command Center</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              Upload your first CME certificate and ClearCME will automatically track your hours, flag gaps, and keep you audit-ready.
            </p>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm min-h-[44px]"
            >
              Upload first certificate →
            </Link>
            <p className="text-xs text-slate-400 mt-4">AI extracts credit info automatically</p>
          </div>

          {/* Preview panels — placeholder values */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center opacity-75">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Renewal Countdown</p>
              <p className="text-2xl font-bold text-slate-300">— days</p>
              <p className="text-xs text-slate-400 mt-1">Available after first upload</p>
            </div>
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center opacity-75">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Mandatory Topics</p>
              <p className="text-2xl font-bold text-slate-300">0 / —</p>
              <p className="text-xs text-slate-400 mt-1">Tracked per state requirement</p>
            </div>
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center opacity-75">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Hours Progress</p>
              <p className="text-2xl font-bold text-slate-300">0 of 40</p>
              <p className="text-xs text-slate-400 mt-1">hours logged</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Persistent gap summary card — above the fold */}
          {topGaps.length > 0 && (
            <DashboardSection label="Compliance Gaps">
              <GapCard
                gaps={topGaps}
                renewalDays={nextRenewal?.daysUntilRenewal ?? null}
                allGapsCount={allGapsCount}
              />
            </DashboardSection>
          )}

          {/* Stats row — 2x2 on mobile, 4-across on sm+ */}
          <DashboardSection label="Stats Overview">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/dashboard/compliance"
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all min-h-[44px]"
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Hours Earned</p>
              {hasCertificates ? (
                <>
                  <p className="text-2xl font-bold text-blue-700">{totalHours.toFixed(1)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">this cycle</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-300">—</p>
                  <p className="text-xs text-slate-400 mt-0.5">upload a certificate</p>
                </>
              )}
            </Link>

            {/* Clickable Hours Still Needed tile with popover breakdown */}
            <HoursNeededTile
              totalHoursStillNeeded={totalHoursStillNeeded}
              hasData={validCompliance.length > 0}
              licenses={licenseBreakdowns}
            />

            <Link
              href="/dashboard/compliance"
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all min-h-[44px]"
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Days to Renewal</p>
              {nextRenewal?.daysUntilRenewal != null ? (
                <>
                  <p className={`text-2xl font-bold ${
                    nextRenewal.daysUntilRenewal <= 90
                      ? "text-red-600"
                      : nextRenewal.daysUntilRenewal <= 180
                      ? "text-amber-600"
                      : "text-slate-700"
                  }`}>
                    {nextRenewal.daysUntilRenewal}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{nextRenewal.license.state} {nextRenewal.license.licenseType}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-300">—</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasLicenses ? "no renewal set" : "add a license"}
                  </p>
                </>
              )}
            </Link>

            <Link
              href="/dashboard/compliance"
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all min-h-[44px]"
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Mandatory Topics</p>
              {totalMandatoryRequired > 0 ? (
                <>
                  <p className={`text-2xl font-bold ${
                    totalMandatoryMet === totalMandatoryRequired ? "text-green-600" : "text-amber-600"
                  }`}>
                    {totalMandatoryMet}/{totalMandatoryRequired}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">complete</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-300">—</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasLicenses ? "none required" : "add a license"}
                  </p>
                </>
              )}
            </Link>
          </div>
          </DashboardSection>

          {/* License compliance cards with Renewal Ring */}
          {validCompliance.length > 0 && (
            <DashboardSection label="License Compliance">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Compliance by License</h2>
                <Link href="/dashboard/compliance" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View full map →
                </Link>
              </div>

              {/* Rec 4: Compliance celebration cards (one per compliant license) */}
              {validCompliance
                .filter((d) => d.isCompliant)
                .map((data) => {
                  const renewalYear = data.license.renewalDate
                    ? new Date(data.license.renewalDate).getFullYear()
                    : new Date().getFullYear();
                  const renewalDateLabel = data.license.renewalDate
                    ? new Date(data.license.renewalDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                  return (
                    <div key={`celebration-${data.license.id}`} className="mb-4">
                      <ComplianceCelebration
                        licenseId={data.license.id}
                        renewalYear={renewalYear}
                        state={data.license.state}
                        licenseType={data.license.licenseType}
                        renewalDateLabel={renewalDateLabel}
                        totalHoursEarned={data.hoursEarned}
                        mandatoryTotal={data.mandatoryTotal}
                      />
                    </div>
                  );
                })}

              <div className="grid sm:grid-cols-2 gap-4 mb-3">
                {validCompliance.map((data) => {
                  const monthsLeft = data.daysUntilRenewal != null ? data.daysUntilRenewal / 30.4 : null;
                  const hrsPerMonth =
                    monthsLeft != null && monthsLeft > 0
                      ? data.effectiveHoursNeeded / monthsLeft
                      : null;

                  return (
                    <Link
                      key={data.license.id}
                      href="/dashboard/compliance"
                      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-semibold text-slate-900">
                            {data.license.state} — {data.license.licenseType}
                          </p>
                          {data.daysUntilRenewal != null && (
                            <p
                              className={`text-xs mt-0.5 font-medium ${
                                data.daysUntilRenewal <= 90
                                  ? "text-red-600"
                                  : data.daysUntilRenewal <= 180
                                  ? "text-amber-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {data.daysUntilRenewal <= 0
                                ? "Renewal overdue"
                                : `${data.daysUntilRenewal} days to renewal`}
                            </p>
                          )}
                          <span
                            className={`inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full ${
                              data.isCompliant
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {data.isCompliant ? "✓ Compliant" : "⚠ Incomplete"}
                          </span>
                        </div>

                        {/* Renewal Ring */}
                        <RenewalRing
                          hoursEarned={data.hoursEarned}
                          totalHours={data.rule.totalHours}
                          daysUntilRenewal={data.daysUntilRenewal}
                          effectiveHoursNeeded={data.effectiveHoursNeeded}
                          isCompliant={data.isCompliant}
                          hrsPerMonth={hrsPerMonth}
                        />
                      </div>

                      {/* Hours sub-line */}
                      <p className="text-xs text-slate-500">
                        {data.hoursEarned.toFixed(1)} / {data.rule.totalHours} hrs earned
                      </p>

                      {/* Rec 1: Named mandatory topic chips */}
                      {data.allMandatoryTopics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {data.allMandatoryTopics.map((t) => {
                            const shortName =
                              TOPIC_SHORT_NAMES[t.topic] ??
                              t.topic
                                .replace(/_/g, " ")
                                .toLowerCase()
                                .replace(/\b\w/g, (l: string) => l.toUpperCase());
                            const slug = keyToSlug(t.topic);
                            if (t.isMet) {
                              return (
                                <span
                                  key={t.topic}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-[11px] font-medium rounded-full"
                                >
                                  ✓ {shortName}
                                </span>
                              );
                            }
                            return (
                              <Link
                                key={t.topic}
                                href={`/courses/${encodeURIComponent(slug)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium rounded-full hover:bg-amber-100 transition-colors"
                              >
                                {shortName}
                                {" — "}
                                {t.hoursNeeded % 1 === 0
                                  ? t.hoursNeeded.toFixed(0)
                                  : t.hoursNeeded.toFixed(1)}{" "}
                                hrs
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
              {/* Add Another License CTA */}
              <div className="flex justify-center mt-1">
                <Link
                  href="/dashboard/profile"
                  className="text-sm text-teal-600 hover:text-teal-800 hover:underline transition-colors border border-dashed border-teal-300 rounded-lg px-4 py-2 hover:border-teal-500"
                >
                  ＋ Add Another License
                </Link>
              </div>
            </section>
            </DashboardSection>
          )}

          {/* Rec 3: Audit trail card — visible below license cards */}
          <DashboardSection label="Audit Trail">
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm">
            <p className="font-semibold text-teal-900 mb-1">📄 Your audit trail is ready</p>
            <p className="text-teal-700 text-xs mb-3">
              Download a board-ready summary of your CME credits and compliance status at any time.
            </p>
            <AuditExportButton variant="default" />
          </div>
          </DashboardSection>

          {/* Recent certificates */}
          <DashboardSection label="Recent Certificates">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Certificates</h2>
              <Link
                href="/dashboard/upload"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors min-h-[44px] inline-flex items-center"
              >
                + Upload certificate
              </Link>
            </div>

            <CertificateList
              certs={recentCerts}
              totalCount={certificates.length}
              showViewAll
            />
          </section>
          </DashboardSection>
        </>
      )}
    </div>
  );
}
