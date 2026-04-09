export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import CertificateList from "@/components/CertificateList";

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
      const gapHours = hoursNeeded;

      const mandatoryMet = rule.mandatoryRequirements.filter((req) => {
        const earned = cycleCerts
          .filter((c) => c.specialTopics.includes(req.topic))
          .reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
        return earned >= req.hoursRequired;
      }).length;

      const daysUntilRenewal = license.renewalDate
        ? Math.ceil((license.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        license,
        rule,
        hoursEarned,
        hoursNeeded,
        gapHours,
        mandatoryMet,
        mandatoryTotal: rule.mandatoryRequirements.length,
        daysUntilRenewal,
        isCompliant: hoursNeeded === 0,
      };
    })
  );

  const validCompliance = complianceData.filter(Boolean) as NonNullable<(typeof complianceData)[number]>[];
  const nextRenewal = validCompliance.sort((a, b) => (a.daysUntilRenewal ?? 9999) - (b.daysUntilRenewal ?? 9999))[0];

  const totalMandatoryMet = validCompliance.reduce((sum, d) => sum + d.mandatoryMet, 0);
  const totalMandatoryRequired = validCompliance.reduce((sum, d) => sum + d.mandatoryTotal, 0);
  const totalHoursStillNeeded = validCompliance.reduce((sum, d) => sum + d.hoursNeeded, 0);

  const hasLicenses = licenses.length > 0;
  const hasCertificates = certificates.length > 0;
  const isNewUser = !hasLicenses && !hasCertificates;
  const recentCerts = certificates.slice(0, 5);

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
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm"
          >
            Add License →
          </Link>
          <p className="text-xs text-slate-400 mt-4">Takes less than a minute</p>
        </div>
      ) : (
        <>
          {/* Stats row — only show when there's meaningful data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
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
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Hours Still Needed</p>
              {validCompliance.length > 0 ? (
                <>
                  <p className={`text-2xl font-bold ${totalHoursStillNeeded === 0 ? "text-green-600" : "text-amber-600"}`}>
                    {totalHoursStillNeeded.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {totalHoursStillNeeded === 0 ? "all clear ✓" : "to complete"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-300">—</p>
                  <p className="text-xs text-slate-400 mt-0.5">add a license</p>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
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
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
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
            </div>
          </div>

          {/* License compliance summary with pace indicator */}
          {validCompliance.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Compliance by License</h2>
                <Link href="/dashboard/compliance" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View full map →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {validCompliance.map((data) => {
                  const monthsLeft = data.daysUntilRenewal != null ? data.daysUntilRenewal / 30.4 : null;
                  const hrsPerMonth = monthsLeft != null && monthsLeft > 0 ? data.gapHours / monthsLeft : null;
                  const pctTimeLeft = data.daysUntilRenewal != null ? data.daysUntilRenewal / (data.rule.renewalCycle * 30.4) : null;
                  const pctDone = data.rule.totalHours > 0 ? data.hoursEarned / data.rule.totalHours : 0;
                  const onTrack = pctTimeLeft != null ? pctDone >= (1 - pctTimeLeft) : true;
                  const critical = data.daysUntilRenewal != null && data.daysUntilRenewal < 60 && pctDone < 0.5;

                  return (
                    <div key={data.license.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {data.license.state} — {data.license.licenseType}
                          </p>
                          {data.daysUntilRenewal != null && (
                            <p className={`text-xs mt-0.5 font-medium ${
                              data.daysUntilRenewal <= 90
                                ? "text-red-600"
                                : data.daysUntilRenewal <= 180
                                ? "text-amber-600"
                                : "text-slate-400"
                            }`}>
                              {data.daysUntilRenewal <= 0
                                ? "Renewal overdue"
                                : `${data.daysUntilRenewal} days to renewal`}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          data.isCompliant
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {data.isCompliant ? "✓ Compliant" : "⚠ Gaps"}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Hours</span>
                          <span>{data.hoursEarned.toFixed(1)} / {data.rule.totalHours} hrs</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${data.isCompliant ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${Math.min(100, (data.hoursEarned / data.rule.totalHours) * 100)}%` }}
                          />
                        </div>
                        {/* Pace indicator */}
                        {!data.isCompliant && hrsPerMonth != null && data.daysUntilRenewal != null && data.daysUntilRenewal > 0 && (
                          <p className={`text-xs mt-1.5 font-medium ${critical ? "text-red-600" : onTrack ? "text-green-600" : "text-amber-600"}`}>
                            {critical ? "⚠️" : onTrack ? "✓" : "⚡"} {hrsPerMonth.toFixed(1)} hrs/month needed
                          </p>
                        )}
                      </div>

                      {data.mandatoryTotal > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          Mandatory topics: {data.mandatoryMet}/{data.mandatoryTotal} complete
                        </p>
                      )}
                    </div>
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
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
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
        </>
      )}
    </div>
  );
}
