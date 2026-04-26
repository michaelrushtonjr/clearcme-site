export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import HoursNeededTile from "@/components/HoursNeededTile";
import GapCard from "@/components/dashboard/GapCard";
import AuditExportButton from "@/components/dashboard/AuditExportButton";
import ComplianceDiffNotifications from "@/components/dashboard/ComplianceDiffNotifications";
import { DashboardSection } from "@/components/dashboard/DashboardSections";
import { NextActionCard, AuditReadyCard } from "@/components/dashboard/NextActionCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { keyToSlug } from "@/lib/courses";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

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

      const mandatoryTopics = mandatoryResults
        .filter((r) => !r.isMet)
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
  const allCompliant = validCompliance.length > 0 && validCompliance.every((d) => d.isCompliant);

  const licenseBreakdowns = validCompliance.map((d) => ({
    state: d.license.state,
    licenseType: d.license.licenseType,
    generalHoursNeeded: d.hoursNeeded,
    mandatoryGapHours: d.mandatoryGapHours,
    mandatoryPendingCount: d.mandatoryPendingCount,
    mandatoryTopics: d.mandatoryTopics,
  }));

  const hasLicenses = licenses.length > 0;
  const hasCertificates = certificates.length > 0;

  // Build top 3 compliance gaps for the attention card (ordered by urgency)
  const allGaps: { label: string; detail: string; href: string; urgency: number }[] = [];
  for (const d of validCompliance) {
    if (d.hoursNeeded > 0) {
      allGaps.push({
        label: `${d.license.state} ${d.license.licenseType}: ${d.hoursNeeded.toFixed(1)} hrs still needed`,
        detail: d.daysUntilRenewal != null ? `${d.daysUntilRenewal} days to renewal` : "No renewal date set",
        href: "/dashboard/compliance",
        urgency: d.daysUntilRenewal != null ? 10000 - d.daysUntilRenewal : 0,
      });
    }
    for (const t of d.mandatoryTopics) {
      allGaps.push({
        label: `${d.license.state}: ${t.topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())} — ${t.hoursNeeded.toFixed(1)} hrs short`,
        detail: "Mandatory topic requirement",
        href: `/courses/${encodeURIComponent(keyToSlug(t.topic))}`,
        urgency: d.daysUntilRenewal != null ? 10000 - d.daysUntilRenewal + 1 : 1,
      });
    }
  }
  allGaps.sort((a, b) => b.urgency - a.urgency);
  const topGaps = allGaps.slice(0, 3);
  const allGapsCount = allGaps.length;

  // Primary renewal description for status line
  const primaryRenewalDescription = nextRenewal?.daysUntilRenewal != null
    ? `${nextRenewal.license.state} renews in ${nextRenewal.daysUntilRenewal} days`
    : "no renewal date set";

  return (
    <div className="space-y-8">
      {/* Greeting + status line */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-navy">
          Hello{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          <strong className="text-brand-navy font-semibold">
            {licenses.length} active license{licenses.length === 1 ? "" : "s"}
          </strong>{" "}
          · {primaryRenewalDescription} · {totalHours.toFixed(1)} hours logged this cycle
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

      {/* Empty state: no certificates yet */}
      {!hasCertificates ? (
        <div className="space-y-6">
          <div className="bg-brand-paper rounded-card border border-brand-rule p-10 text-center">
            <div className="w-16 h-16 bg-brand-tealTint rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-brand-navy mb-2">Your Compliance Command Center</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              Upload your first CME certificate and ClearCME will automatically track your hours, flag gaps, and keep you audit-ready.
            </p>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-teal text-white font-semibold rounded-xl hover:bg-brand-tealDeep transition-colors text-sm shadow-card-1 min-h-[44px]"
            >
              Upload first certificate →
            </Link>
            <p className="text-xs text-slate-400 mt-4">AI extracts credit info automatically</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["Renewal Countdown", "Mandatory Topics", "Hours Progress"].map((label) => (
              <div key={label} className="bg-brand-paper rounded-card border border-dashed border-brand-rule p-5 text-center opacity-75">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                <p className="text-2xl font-bold text-slate-300">—</p>
                <p className="text-xs text-slate-400 mt-1">Available after first upload</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* NextActionCard or AuditReadyCard */}
          {allCompliant ? (
            <AuditReadyCard />
          ) : topGaps.length > 0 ? (
            <NextActionCard
              title={<>Complete your <em>{topGaps[0].label.split(":")[0]}</em> requirement</>}
              body={topGaps[0].label}
              ctaHref={topGaps[0].href}
              ctaLabel="View compliance map"
              source={topGaps[0].detail}
            />
          ) : null}

          {/* Plan to finish — gap summary (compressed) */}
          {topGaps.length > 0 && (
            <DashboardSection label="Compliance Gaps">
              <GapCard
                gaps={topGaps}
                renewalDays={nextRenewal?.daysUntilRenewal ?? null}
                allGapsCount={allGapsCount}
              />
            </DashboardSection>
          )}

          {/* Compliance diff notifications */}
          <DashboardSection label="Compliance Diff Notifications">
            <ComplianceDiffNotifications />
          </DashboardSection>

          {/* KPI strip — 3 cells (no Days to Renewal) */}
          <DashboardSection label="Stats Overview">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/dashboard/compliance"
                className="bg-brand-paper rounded-card border border-brand-rule p-5 hover:border-brand-tealRule hover:shadow-card-1 transition-all min-h-[44px]"
              >
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Hours Earned</p>
                {hasCertificates ? (
                  <>
                    <p className="text-2xl font-bold text-brand-teal">{totalHours.toFixed(1)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">this cycle</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-300">—</p>
                    <p className="text-xs text-slate-400 mt-0.5">upload a certificate</p>
                  </>
                )}
              </Link>

              <HoursNeededTile
                totalHoursStillNeeded={totalHoursStillNeeded}
                hasData={validCompliance.length > 0}
                licenses={licenseBreakdowns}
              />

              <Link
                href="/dashboard/compliance"
                className="bg-brand-paper rounded-card border border-brand-rule p-5 hover:border-brand-tealRule hover:shadow-card-1 transition-all min-h-[44px]"
              >
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Mandatory Topics</p>
                {totalMandatoryRequired > 0 ? (
                  <>
                    <p className={`text-2xl font-bold ${totalMandatoryMet === totalMandatoryRequired ? "text-brand-emerald" : "text-brand-amber"}`}>
                      {totalMandatoryMet}/{totalMandatoryRequired}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">complete</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-300">—</p>
                    <p className="text-xs text-slate-400 mt-0.5">{hasLicenses ? "none required" : "add a license"}</p>
                  </>
                )}
              </Link>
            </div>
          </DashboardSection>

          {/* Activity feed */}
          <ActivityFeed items={[]} />

          {/* Audit trail card */}
          <DashboardSection label="Audit Trail">
            <div className="bg-brand-tealTint border border-brand-tealRule rounded-card p-4 text-sm">
              <p className="font-semibold text-brand-navy mb-1">Your audit trail is ready</p>
              <p className="text-slate-600 text-xs mb-3">
                Download a board-ready summary of your CME credits and compliance status at any time.
              </p>
              <AuditExportButton variant="default" />
            </div>
          </DashboardSection>
        </>
      )}
    </div>
  );
}
