import { prisma } from "@/lib/prisma";
import { daysUntil } from "@/lib/dates";
import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { evaluateRequirementFulfillment } from "@/lib/requirement-completions";

/**
 * Per-user compliance snapshot for email notifications.
 *
 * Mirrors the computation on /dashboard and /dashboard/compliance (same cycle
 * window, same fulfillment evaluation, same license/global completion
 * fallback) so an email never disagrees with what the user sees in-product.
 */

export interface SnapshotMandatoryTopic {
  topic: string;
  label: string;
  needed: number;
  earned: number;
  gap: number;
  isMet: boolean;
  isUnknown: boolean;
}

export interface LicenseSnapshot {
  licenseId: string;
  state: string;
  licenseType: string;
  renewalDate: Date | null;
  daysUntilRenewal: number | null;
  totalHoursRequired: number;
  hoursEarned: number;
  generalGapHours: number;
  mandatoryTopics: SnapshotMandatoryTopic[];
  completedMandatoryTopics: SnapshotMandatoryTopic[];
  outstandingMandatoryTopics: SnapshotMandatoryTopic[];
  unansweredHistoryCount: number;
  isCompliant: boolean;
  /** hours/month required to close the gap by renewal (null when compliant or no date) */
  paceHoursPerMonth: number | null;
}

export interface UserComplianceSnapshot {
  userId: string;
  email: string;
  firstName: string;
  licenses: LicenseSnapshot[];
  totalGapHours: number;
  allCompliant: boolean;
}

export function formatTopicLabel(topic: string): string {
  return topic
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function getComplianceSnapshot(userId: string): Promise<UserComplianceSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user?.email) return null;

  const [licenses, certificates, requirementCompletions] = await Promise.all([
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.certificate.findMany({
      where: { userId, extractionStatus: "COMPLETED" },
    }),
    prisma.userRequirementCompletion.findMany({
      where: { userId },
    }),
  ]);

  const completionByRequirementAndLicense = new Map(
    requirementCompletions.map((completion) => [
      `${completion.mandatoryRequirementId}:${completion.physicianLicenseId ?? "global"}`,
      completion,
    ])
  );

  const licenseSnapshots: LicenseSnapshot[] = [];

  for (const license of licenses) {
    if (isComputedComplianceBlocked(license.state, license.licenseType)) continue;

    const rule = await prisma.complianceRule.findUnique({
      where: {
        state_licenseType: { state: license.state, licenseType: license.licenseType },
      },
      include: { mandatoryRequirements: true },
    });
    if (!rule) continue;

    const cycleEnd = license.renewalDate ?? new Date();
    const cycleStart = new Date(cycleEnd);
    cycleStart.setMonth(cycleStart.getMonth() - rule.renewalCycle);

    const cycleCerts = certificates.filter((cert) => {
      if (!cert.activityDate) return false;
      return cert.activityDate >= cycleStart && cert.activityDate <= cycleEnd;
    });

    const hoursEarned = cycleCerts.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
    const generalGapHours = Math.max(0, rule.totalHours - hoursEarned);
    const daysUntilRenewal = daysUntil(license.renewalDate);

    const mandatoryTopics: SnapshotMandatoryTopic[] = rule.mandatoryRequirements.map((req) => {
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
        daysUntilRenewal,
      });
      const historySensitive = req.firstRenewalOnly || req.cadence !== "EVERY_RENEWAL";
      const hoursSatisfied = req.hoursRequired > 0 && earned >= req.hoursRequired;
      const isMet =
        hoursSatisfied || fulfillment.isSatisfied || (!historySensitive && req.hoursRequired === 0);
      const isUnknown = fulfillment.isUnknown && !hoursSatisfied;
      return {
        topic: req.topic,
        label: formatTopicLabel(req.topic),
        needed: req.hoursRequired,
        earned,
        gap: isMet || isUnknown ? 0 : Math.max(0, req.hoursRequired - earned),
        isMet,
        isUnknown,
      };
    });

    const mandatoryGapHours = mandatoryTopics.reduce((sum, t) => sum + t.gap, 0);
    const effectiveGapHours = Math.max(generalGapHours, mandatoryGapHours);
    const isCompliant =
      generalGapHours === 0 && mandatoryTopics.every((t) => t.isMet || t.isUnknown);

    const monthsLeft =
      daysUntilRenewal !== null && daysUntilRenewal > 0 ? daysUntilRenewal / 30.4 : null;
    const paceHoursPerMonth =
      !isCompliant && monthsLeft !== null && effectiveGapHours > 0
        ? Math.round((effectiveGapHours / monthsLeft) * 10) / 10
        : null;

    licenseSnapshots.push({
      licenseId: license.id,
      state: license.state,
      licenseType: license.licenseType,
      renewalDate: license.renewalDate,
      daysUntilRenewal,
      totalHoursRequired: rule.totalHours,
      hoursEarned,
      generalGapHours,
      mandatoryTopics,
      completedMandatoryTopics: mandatoryTopics.filter((t) => t.isMet),
      outstandingMandatoryTopics: mandatoryTopics.filter((t) => !t.isMet && !t.isUnknown),
      unansweredHistoryCount: mandatoryTopics.filter((t) => t.isUnknown).length,
      isCompliant,
      paceHoursPerMonth,
    });
  }

  const totalGapHours = licenseSnapshots.reduce(
    (sum, l) => sum + Math.max(l.generalGapHours, l.mandatoryTopics.reduce((s, t) => s + t.gap, 0)),
    0
  );

  return {
    userId: user.id,
    email: user.email,
    firstName: (user.name ?? "").trim().split(/\s+/)[0] ?? "",
    licenses: licenseSnapshots,
    totalGapHours,
    allCompliant: licenseSnapshots.length > 0 && licenseSnapshots.every((l) => l.isCompliant),
  };
}
