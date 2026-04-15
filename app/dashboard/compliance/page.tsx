export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CertificateList from "@/components/CertificateList";
import UrgencyCard, { NextActionCardProps } from "@/components/dashboard/UrgencyCard";
import ComplianceExportButton from "@/components/dashboard/ComplianceExportButton";
import AuditExportButton from "@/components/dashboard/AuditExportButton";
import { keyToSlug } from "@/lib/courses";

export const metadata = {
  title: "Compliance Map — ClearCME",
};

interface MandatoryGap {
  topic: string;
  description?: string;
  earned: number;
  needed: number;
  gap: number;
  isMet: boolean;
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

/** Best partner URL for each mandatory topic gap. Free/no-login preferred. */
const PARTNER_URLS: Record<string, string> = {
  OPIOID_PRESCRIBING: "https://home.hippoed.com/oud-decoded",
  SUBSTANCE_USE: "https://home.hippoed.com/oud-decoded",
  IMPLICIT_BIAS: "https://www.cmeoutfitters.com/activity/findings-from-an-educational-initiative-addressing-racial-disparities-and-bias-in-health-care-2/",
  ETHICS: "https://www.cmeoutfitters.com/activity/integrating-resilience-ethics-and-traumatic-stress-relief-to-cultivate-a-culture-of-wellbeing/",
  INFECTION_CONTROL: "https://home.hippoed.com/abxstewardship",
  PATIENT_SAFETY: "https://www.acep.org/acepanytime/",
  SUICIDE_PREVENTION: "https://bootcamp.pri-med.com/en/mental-health",
};

/** Topics sourced from Hippo Education — show badge */
const HIPPO_TOPICS = new Set(["SUBSTANCE_USE", "OPIOID_PRESCRIBING", "INFECTION_CONTROL"]);

function RenewalCountdown({ days }: { days: number | null }) {
  if (days === null) return null;
  const isUrgent = days <= 90;
  const isWarning = days <= 180;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        isUrgent
          ? "bg-red-50 text-red-700"
          : isWarning
          ? "bg-amber-50 text-amber-700"
          : "bg-green-50 text-green-700"
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {days <= 0
        ? "Renewal overdue"
        : days === 1
        ? "1 day until renewal"
        : `${days} days until renewal`}
    </div>
  );
}

export default async function CompliancePage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Fetch compliance data + licenses with their rules
  const [licenses, certificates] = await Promise.all([
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.certificate.findMany({
      where: { userId, extractionStatus: "COMPLETED" },
      orderBy: { activityDate: "desc" },
    }),
  ]);

  // For each license, compute compliance inline (so page always shows fresh data)
  const complianceData = await Promise.all(
    licenses.map(async (license) => {
      const rule = await prisma.complianceRule.findUnique({
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
        return {
          topic: req.topic,
          description: req.description ?? undefined,
          earned: earnedForTopic,
          needed: req.hoursRequired,
          gap: Math.max(0, req.hoursRequired - earnedForTopic),
          isMet: earnedForTopic >= req.hoursRequired,
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

  // Build "Your Next Action" card props — pick the most urgent license with a rule
  // Priority: soonest renewal with a gap; fallback to first license with a rule
  const nextActionProps: NextActionCardProps | null = (() => {
    // Find the most actionable license: soonest renewal that has a rule
    const withRules = complianceData.filter((d) => d.rule !== null);
    if (withRules.length === 0) return null;

    // Sort by days until renewal ascending (nulls last), then pick first
    const sorted = [...withRules].sort((a, b) => {
      if (a.daysUntilRenewal === null) return 1;
      if (b.daysUntilRenewal === null) return -1;
      return a.daysUntilRenewal - b.daysUntilRenewal;
    });

    const d = sorted[0];
    const renewalDateLabel = d.license.renewalDate
      ? new Date(d.license.renewalDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "your renewal date";

    return {
      daysUntilRenewal: d.daysUntilRenewal,
      renewalDateLabel,
      generalGapHours: Math.max(0, d.totalHoursNeeded - d.totalHoursEarned),
      mandatoryGaps: d.mandatoryGaps.map((g) => ({
        topic: g.topic,
        gap: g.gap,
        isMet: g.isMet,
        // firstRenewalOnly is surfaced via the rule's mandatoryRequirements
        isOneTime:
          d.rule?.mandatoryRequirements.find((r) => r.topic === g.topic)
            ?.firstRenewalOnly ?? false,
      })),
      isFullyCompliant: d.isCompliant,
      licenseState: d.license.state,
    };
  })();

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Map</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Live status of your state license compliance
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Requirement rules cross-checked against state board guidance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ComplianceExportButton exportData={exportData} />
          <AuditExportButton />
        </div>
      </div>

      {/* Your Next Action card */}
      {nextActionProps && <UrgencyCard {...nextActionProps} />}

      {/* No licenses */}
      {licenses.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="font-semibold text-blue-900 mb-2">No licenses configured</h3>
          <p className="text-sm text-blue-700 mb-4">
            Add your state medical licenses to see personalized compliance requirements.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Add licenses →
          </Link>
        </div>
      )}

      {/* Overall summary */}
      {licenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Hours Earned</p>
            <p className="text-2xl font-bold text-blue-700">{totalHoursAllCerts.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">across all certificates</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Licenses Active</p>
            <p className="text-2xl font-bold text-slate-700">{licenses.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">states tracked</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Certificates</p>
            <p className="text-2xl font-bold text-slate-700">{certificates.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">with extracted data</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Overall Status</p>
            {complianceData.every((d) => d.rule === null) ? (
              <p className="text-lg font-bold text-slate-400">—</p>
            ) : complianceData.filter((d) => d.rule).every((d) => d.isCompliant) ? (
              <p className="text-2xl font-bold text-green-600">✓ Good</p>
            ) : (
              <p className="text-2xl font-bold text-amber-600">⚠ Incomplete</p>
            )}
          </div>
        </div>
      )}

      {/* Per-license compliance cards */}
      {complianceData.map(({ license, rule, totalHoursEarned, totalHoursNeeded, gapHours, isCompliant, mandatoryGaps, daysUntilRenewal }) => (
        <section key={license.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  {license.state} — {license.licenseType}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    !rule
                      ? "bg-slate-100 text-slate-500"
                      : isCompliant
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {!rule ? "Rules pending" : isCompliant ? "✓ Compliant" : "⚠ Requirements Pending"}
                </span>
              </div>
              {license.renewalDate && (
                <p className="text-sm text-slate-500 mt-1">
                  Renewal: {new Date(license.renewalDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <RenewalCountdown days={daysUntilRenewal} />
          </div>

          {!rule ? (
            <div className="px-6 py-8 text-center">
              <p className="text-slate-500 text-sm">
                Compliance rules for {license.state} {license.licenseType} are not yet loaded.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                We&apos;re adding state requirements continuously — check back soon.
              </p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* Hours progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    CME Hours This Cycle
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {totalHoursEarned.toFixed(1)} / {totalHoursNeeded.toFixed(0)} hrs
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCompliant ? "bg-green-500" : totalHoursEarned > 0 ? "bg-blue-500" : "bg-slate-300"
                    }`}
                    style={{ width: `${Math.min(100, (totalHoursEarned / totalHoursNeeded) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-400">
                    {isCompliant ? "All hours completed ✓" : `${gapHours.toFixed(1)} hours still needed`}
                  </span>
                  <span className="text-xs text-slate-400">
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
                      <p className={`text-xs mt-1.5 font-medium ${critical ? "text-red-600" : onTrack ? "text-green-600" : "text-amber-600"}`}>
                        {critical ? "⚠️" : onTrack ? "✓" : "⚡"} To finish by renewal, you need {hrsPerMonth.toFixed(1)} hrs/month
                      </p>
                    );
                  })()
                )}
              </div>

              {/* Mandatory topics */}
              {mandatoryGaps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Mandatory Topics</h3>
                  <div className="space-y-2">
                    {mandatoryGaps.map((gap) => {
                      const pct = Math.min(100, gap.needed > 0 ? (gap.earned / gap.needed) * 100 : 100);
                      const statusIcon = gap.isMet
                        ? "✅"
                        : gap.earned > 0
                        ? "⚠️"
                        : "🔴";

                      return (
                        <div
                          key={gap.topic}
                          className={`rounded-xl border p-4 ${
                            gap.isMet
                              ? "border-green-100 bg-green-50"
                              : gap.earned > 0
                              ? "border-amber-100 bg-amber-50"
                              : "border-red-100 bg-red-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <span className="text-base mt-0.5">{statusIcon}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900">
                                  {formatTopic(gap.topic)}
                                </p>
                                {gap.description && (
                                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{gap.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-slate-900">
                                {gap.earned.toFixed(1)}/{gap.needed.toFixed(0)} hrs
                              </p>
                              {!gap.isMet && (
                                <p className={`text-xs mt-0.5 ${gap.earned > 0 ? "text-amber-700" : "text-red-600"}`}>
                                  {gap.gap.toFixed(1)} hrs short
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  gap.isMet ? "bg-green-500" : gap.earned > 0 ? "bg-amber-500" : "bg-red-400"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {!gap.isMet && (
                              <div className="flex flex-col items-end gap-0.5">
                                <Link
                                  href={`/courses/${keyToSlug(gap.topic)}`}
                                  className={`flex-shrink-0 text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                                    gap.earned > 0
                                      ? "bg-amber-600 text-white hover:bg-amber-700"
                                      : "bg-red-600 text-white hover:bg-red-700"
                                  }`}
                                >
                                  {TOPIC_LABELS[gap.topic] ?? "Find Accredited CME →"}
                                </Link>
                                {HIPPO_TOPICS.has(gap.topic) ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-purple-700 font-medium">
                                    <span>🦛</span> via Hippo Education
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">ACCME-accredited • Cat 1</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No mandatory topics */}
              {mandatoryGaps.length === 0 && (
                <p className="text-sm text-slate-400">
                  No mandatory topic requirements configured for this license.
                </p>
              )}
            </div>
          )}
        </section>
      ))}

      {/* Certificate list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            All Certificates ({certificates.length})
          </h2>
          <Link
            href="/dashboard/upload"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Upload
          </Link>
        </div>

        <CertificateList certs={certificates} totalCount={certificates.length} />
        {certificates.length > 0 && (
          <div className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-b-2xl -mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Total hours</span>
            <span className="text-sm font-bold text-blue-700">
              {totalHoursAllCerts.toFixed(1)} hrs
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
