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
import ReturnBanner from "@/components/dashboard/ReturnBanner";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Capture lastLoginAt before updating it
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true },
  });
  const previousLoginAt = userRecord?.lastLoginAt ?? null;

  // Update lastLoginAt for next session
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

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

      // Breakdown data for the popover
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

  // Build license breakdowns for the popover
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
  const isNewUser = !hasLicenses && !hasCertificates;

  // Return banner data
  const newCertsCount = previousLoginAt
    ? certificates.filter((c) => c.createdAt > previousLoginAt).length
    : 0;

  // Next soonest renewal info for banner
  const nextRenewalForBanner = nextRenewal?.daysUntilRenewal != null
    ? { state: nextRenewal.license.state, daysAway: nextRenewal.daysUntilRenewal }
    : null;

  // Count new compliance rules since last login
  const newRequirementsCount = previousLoginAt
    ? await prisma.complianceRule.count({
        where: {
          state: { in: licenses.map((l) => l.state) },
          updatedAt: { gt: previousLoginAt },
        },
      })
    : 0;
  const recentCerts = certificates.slice(0, 5);

  // Shared credit detection: AMA_PRA_1 certs that cover multiple active license states
  const licenseStates = licenses.map((l) => l.state);
  const sharedCredits: Record<string, string[]> = {};
  if (licenseStates.length >= 2) {
    for (const cert of certificates) {
      if (cert.creditType === "AMA_PRA_1") {
        // AMA PRA Category 1 is accepted by all states — mark all license states
        sharedCredits[cert.id] = licenseStates;
      }
    }
  }

  // Onboarding steps: 1=account(always done), 2=license, 3=certificate
  const onboardingSteps = [
    { label: "Create your account", done: true },
    { label: "Add your first license", done: hasLicenses },
    { label: "Upload a certificate", done: hasCertificates },
  ];
  const stepsCompleted = onboardingSteps.filter((s) => s.done).length;
  const onboardingComplete = stepsCompleted === 3;

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

      {/* Return banner — only shown to returning users after 24hrs */}
      <ReturnBanner
        lastLoginAt={previousLoginAt?.toISOString() ?? null}
        newCertsCount={newCertsCount}
        renewalInfo={nextRenewalForBanner}
        newRequirementsCount={newRequirementsCount}
      />

      {/* Onboarding checklist — client component with dismiss */}
      {!onboardingComplete && (
        <OnboardingChecklist steps={onboardingSteps} stepsCompleted={stepsCompleted} />
      )}

      {/* Empty state for brand-new users: prominent CTA, no empty stat tiles */}
      {isNewUser ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Get your compliance map</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Add your state medical license and we&apos;ll show you exactly which CME credits you need — and how to get them.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm min-h-[44px]"
          >
            Add License →
          </Link>
          <p className="text-xs text-slate-400 mt-4">Takes less than a minute</p>
        </div>
      ) : (
        <>
          {/* Stats row — 2x2 on mobile, 4-across on sm+ */}
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

          {/* License compliance cards with Renewal Ring */}
          {validCompliance.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-slate-900">Compliance by License</h2>
                  {licenses.length >= 2 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                      </svg>
                      Multi-state
                    </span>
                  )}
                  <span
                    title="ClearCME compliance data is verified against primary state board sources by our automated QA system."
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold cursor-default select-none"
                  >
                    ✓ Verified by Vera™
                  </span>
                </div>
                <Link href="/dashboard/compliance" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View full map →
                </Link>
              </div>
              {licenses.length >= 2 && (
                <p className="text-xs text-slate-500 mb-4">
                  Requirements shown per state — some mandatory topics may satisfy multiple states.
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900">
                              {data.license.state} — {data.license.licenseType}
                            </p>
                            {data.license.npiNumber && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                NPI Verified
                              </span>
                            )}
                          </div>
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

                      {/* Mandatory topics status */}
                      {data.mandatoryTotal > 0 && (
                        <p
                          className={`text-xs mt-1.5 font-medium ${
                            data.mandatoryPendingCount > 0 ? "text-amber-600" : "text-green-600"
                          }`}
                        >
                          {data.mandatoryPendingCount > 0
                            ? `⚠️ ${data.mandatoryPendingCount} mandatory topic${data.mandatoryPendingCount === 1 ? "" : "s"} pending`
                            : "✅ All mandatory topics complete"}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent certificates */}
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
              sharedCredits={sharedCredits}
            />
          </section>
        </>
      )}
    </div>
  );
}
