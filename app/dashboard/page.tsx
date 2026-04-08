export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
  const recentCerts = certificates.slice(0, 5);

  // Onboarding steps: 1=account(always), 2=license, 3=certificate
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

      {/* Onboarding checklist — shows until all 3 steps complete */}
      {!onboardingComplete && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-blue-900 text-base">Finish setting up ClearCME</h3>
              <p className="text-sm text-blue-700 mt-0.5">Complete these steps to see your personalized compliance map.</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full whitespace-nowrap">
              {stepsCompleted}/3 done
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${(stepsCompleted / 3) * 100}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Your setup: {stepsCompleted === 1 ? "━━░░░░" : stepsCompleted === 2 ? "━━━━░░" : "━━━━━━"} {stepsCompleted}/3 steps done
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {onboardingSteps.map((step, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${step.done ? "bg-blue-100/60" : "bg-white border border-blue-200"}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.done ? "bg-blue-600 text-white" : "bg-white border-2 border-blue-300 text-blue-500"}`}>
                    {step.done ? "✓" : i + 1}
                  </span>
                  <span className={`text-sm font-medium ${step.done ? "text-blue-700 line-through opacity-70" : "text-slate-800"}`}>
                    {step.label}
                  </span>
                </div>
                {!step.done && i === 1 && (
                  <Link href="/dashboard/profile" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Add License
                  </Link>
                )}
                {!step.done && i === 2 && (
                  <Link href="/dashboard/upload" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Upload Now
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Hours Earned</p>
          <p className="text-2xl font-bold text-blue-700">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-slate-400 mt-0.5">this cycle</p>
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
              <p className="text-xs text-slate-400 mt-0.5">no renewal set</p>
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
              <p className="text-xs text-slate-400 mt-0.5">no requirements</p>
            </>
          )}
        </div>
      </div>

      {/* License compliance summary */}
      {validCompliance.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Compliance by License</h2>
            <Link href="/dashboard/compliance" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View full map →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {validCompliance.map((data) => (
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
                </div>

                {data.mandatoryTotal > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Mandatory topics: {data.mandatoryMet}/{data.mandatoryTotal} complete
                  </p>
                )}
              </div>
            ))}
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

        {recentCerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm mb-4">No certificates yet.</p>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Upload your first →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recentCerts.map((cert) => (
                <div key={cert.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {cert.title ?? cert.fileName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cert.provider ?? "Unknown provider"}
                      {cert.activityDate && (
                        <> · {new Date(cert.activityDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cert.extractionStatus === "COMPLETED" && cert.creditHours != null && (
                      <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                        {cert.creditHours.toFixed(1)} hrs
                      </span>
                    )}
                    {cert.extractionStatus === "PENDING" && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">Pending</span>
                    )}
                    {cert.extractionStatus === "FAILED" && (
                      <span className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {certificates.length > 5 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <Link
                  href="/dashboard/compliance"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all {certificates.length} certificates →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
