import { getFederalTraining } from "@/lib/federal-training";
import { prisma } from "@/lib/prisma";
import { daysUntil } from "@/lib/dates";
import { notificationCompliance, licensePractice } from "@/lib/compliance-adapters";
import type { OverallStatus, RequirementStatus } from "@/lib/compliance-engine";

/**
 * Per-user compliance snapshot for email notifications.
 *
 * Mirrors the computation on /dashboard and /dashboard/compliance (same cycle
 * window, same fulfillment evaluation, same license/global completion
 * fallback) so an email never disagrees with what the user sees in-product.
 */

export interface SnapshotMandatoryTopic {
  scope?: "FEDERAL";
  status: RequirementStatus;
  topic: string;
  label: string;
  needed: number;
  earned: number;
  gap: number;
  isMet: boolean;
  isUnknown: boolean;
  /** Physician told us it's out of scope — excluded from gaps, never "met" */
  isNotApplicable: boolean;
}

export interface LicenseSnapshot {
  overall: OverallStatus;
  statusLabel: string;
  uncertainHours: number;
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
    select: { id: true, email: true, name: true, specialty: true, practiceArea: true },
  });
  if (!user) return null;

  const [licenses, certificates, requirementCompletions] = await Promise.all([
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.certificate.findMany({
      where: { userId },
    }),
    prisma.userRequirementCompletion.findMany({
      where: { userId },
    }),
  ]);



  const federalTraining = await getFederalTraining(userId);
  const licenseSnapshots: LicenseSnapshot[] = [];

  for (const license of licenses) {

    const rule = await prisma.complianceRule.findUnique({
      where: {
        state_licenseType: { state: license.state, licenseType: license.licenseType },
      },
      include: { mandatoryRequirements: { where: { retiredAt: null } } },
    });
    const view = notificationCompliance({ federalTraining, license, practice: licensePractice(license, user), rule, requirements: rule?.mandatoryRequirements ?? [], certificates, completions: requirementCompletions, today: new Date() });
    const hoursEarned = view.hoursEarned;
    const generalGapHours = view.generalGapHours;
    const daysUntilRenewal = daysUntil(license.renewalDate);
    const mandatoryTopics: SnapshotMandatoryTopic[] = view.mandatoryGaps.map((result) => ({
      scope: result.scope, topic: result.topic, status: result.status, label: formatTopicLabel(result.topic),
      needed: result.needed, earned: result.earned, gap: result.gap,
      isMet: result.isMet, isUnknown: result.isUnknown, isNotApplicable: result.isNotApplicable,
    }));

    const mandatoryGapHours = mandatoryTopics.filter((t) => t.scope !== "FEDERAL").reduce((sum, t) => sum + t.gap, 0);
    const effectiveGapHours = Math.max(generalGapHours, mandatoryGapHours);
    const isCompliant = view.isCompliant;

    const monthsLeft =
      daysUntilRenewal !== null && daysUntilRenewal > 0 ? daysUntilRenewal / 30.4 : null;
    const paceHoursPerMonth =
      !isCompliant && monthsLeft !== null && effectiveGapHours > 0
        ? Math.round((effectiveGapHours / monthsLeft) * 10) / 10
        : null;

    licenseSnapshots.push({
      overall: view.overall,
      statusLabel: view.statusLabel,
      uncertainHours: view.uncertainHours,
      licenseId: license.id,
      state: license.state,
      licenseType: license.licenseType,
      renewalDate: license.renewalDate,
      daysUntilRenewal,
      totalHoursRequired: rule?.totalHours ?? 0,
      hoursEarned,
      generalGapHours,
      mandatoryTopics,
      completedMandatoryTopics: mandatoryTopics.filter((t) => t.scope !== "FEDERAL" && t.isMet),
      outstandingMandatoryTopics: mandatoryTopics.filter(
        (t) => t.scope !== "FEDERAL" && !t.isMet && !t.isUnknown && !t.isNotApplicable
      ),
      unansweredHistoryCount: mandatoryTopics.filter((t) => t.isUnknown).length,
      isCompliant,
      paceHoursPerMonth,
    });
  }

  const totalGapHours = licenseSnapshots.reduce(
    (sum, l) => sum + Math.max(l.generalGapHours, l.mandatoryTopics.filter((t) => t.scope !== "FEDERAL").reduce((s, t) => s + t.gap, 0)),
    0
  );

  return {
    userId: user.id,
    email: user.email ?? "",
    firstName: (user.name ?? "").trim().split(/\s+/)[0] ?? "",
    licenses: licenseSnapshots,
    totalGapHours: totalGapHours + federalTraining.gap,
    allCompliant: licenseSnapshots.length > 0 && licenseSnapshots.every((l) => l.isCompliant),
  };
}
