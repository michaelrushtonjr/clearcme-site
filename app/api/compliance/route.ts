import { NextRequest, NextResponse } from "next/server";
import { apiCompliance } from "@/lib/compliance-adapters";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import type { Certificate, MandatoryRequirement } from "@prisma/client";
import { isComputedComplianceBlocked, computedComplianceBlockedMessage } from "@/lib/compliance-rule-availability";
import {
  cadenceLabel,
  findSatisfyingCertificate,
  linkedCertificateId,
} from "@/lib/requirement-completions";
import { requirementDisplayName } from "@/lib/requirement-display";

// GET /api/compliance — compute and return compliance status for the current user
export async function GET(req: NextRequest) {
  try {
  // Support both NextAuth session (web) and mobile JWT
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all physician licenses
  const licenses = await prisma.physicianLicense.findMany({
    where: { userId, isActive: true },
  });

  if (licenses.length === 0) {
    return NextResponse.json({ compliance: [], message: "No active licenses found." });
  }

  // Get all certificates for this user
  const certificates = await prisma.certificate.findMany({
    where: { userId },
  });

  const requirementCompletions = await prisma.userRequirementCompletion.findMany({
    where: { userId },
  });
  const completionByRequirementAndLicense = new Map(
    requirementCompletions.map((completion) => [
      `${completion.mandatoryRequirementId}:${completion.physicianLicenseId ?? "global"}`,
      completion,
    ])
  );

  const complianceResults = [];

  for (const license of licenses) {
    const computedComplianceBlocked = isComputedComplianceBlocked(license.state, license.licenseType);

    // Get compliance rules for this state + license type
    const rule = computedComplianceBlocked
      ? null
      : await prisma.complianceRule.findUnique({
          where: {
            state_licenseType: {
              state: license.state,
              licenseType: license.licenseType,
            },
          },
          include: { mandatoryRequirements: { where: { retiredAt: null } } },
        });

    const view = apiCompliance({ license, rule, requirements: rule?.mandatoryRequirements ?? [], certificates, completions: requirementCompletions, today: new Date() });
    if (!rule) {
      // No rule configured yet, or computed compliance is intentionally blocked for this state.
      complianceResults.push({
        state: license.state,
        licenseType: license.licenseType,
        renewalDate: license.renewalDate,
        status: view.overall,
        overall: view.overall,
        evaluation: view.evaluation,
        isCompliant: false,
        message: computedComplianceBlockedMessage(license.state, license.licenseType),
      });
      continue;
    }

    const { cycleStart, cycleEnd } = view;
    const cycleCerts = certificates.filter((cert) => view.evaluation.countedCertificateIds.includes(cert.id));
    const totalHoursEarned = view.hoursEarned;
    const generalGapHours = view.generalGapHours;
    const applicableMandatoryRequirements = rule.mandatoryRequirements;

    const duplicatedTopics = new Set(
      applicableMandatoryRequirements
        .map((r: MandatoryRequirement) => r.topic)
        .filter((topic, i, all) => all.indexOf(topic) !== i)
    );

    const mandatoryGaps = applicableMandatoryRequirements.map((req: MandatoryRequirement) => {
      const result = view.mandatoryGaps.find((r) => r.requirementId === req.id)!;
      const earnedForTopic = result.earned;
      const completion =
        completionByRequirementAndLicense.get(`${req.id}:${license.id}`) ??
        completionByRequirementAndLicense.get(`${req.id}:global`);
      const fulfillment = { ...result, isSatisfied: result.isMet };
      const hoursSatisfied = req.hoursRequired > 0 && earnedForTopic >= req.hoursRequired;
      const { isMet, isUnknown, isNotApplicable } = result;

      // Mirror of the Compliance Map's attestation pre-fill: surface the
      // uploaded certificate that looks like it satisfies an unanswered
      // attestable row, searching all completed certs (any year), so clients
      // can offer "Looks satisfied by <cert>" with a one-tap confirm.
      const suggestionSource =
        !completion && !hoursSatisfied && fulfillment.isAttestable && !fulfillment.isSatisfied
          ? findSatisfyingCertificate(certificates, req.topic, req.hoursRequired)
          : null;
      const linkedCert = completion
        ? certificates.find((c: Certificate) => c.id === linkedCertificateId(completion.notes))
        : undefined;

      return {
        requirementId: req.id,
        status: result.status,
        topic: req.topic,
        // Human-readable row name — clients should render this, never the
        // raw topic enum (CT's OTHER_MANDATORY row was showing as the enum).
        displayName: requirementDisplayName(req.topic, req.description, {
          isConditional: req.cadence === "CONDITIONAL",
          topicIsDuplicated: duplicatedTopics.has(req.topic),
        }),
        description: req.description,
        earned: earnedForTopic,
        needed: req.hoursRequired,
        gap: isMet || isUnknown || isNotApplicable ? 0 : Math.max(0, req.hoursRequired - earnedForTopic),
        isMet,
        isUnknown,
        isNotApplicable,
        isAttestable: fulfillment.isAttestable,
        cadenceLabel: cadenceLabel(req),
        prompt: fulfillment.prompt,
        satisfiedUntil: fulfillment.satisfiedUntil,
        suggestedCertificateId: suggestionSource?.id ?? null,
        suggestedCertificateTitle: suggestionSource
          ? suggestionSource.title ?? suggestionSource.fileName
          : null,
        satisfiedByCertificateId: linkedCert?.id ?? null,
        satisfiedByCertificateTitle: linkedCert ? linkedCert.title ?? linkedCert.fileName : null,
      };
    });

    const mandatoryHoursGap = mandatoryGaps.reduce(
      (sum: number, gap: { gap: number }) => sum + Math.max(0, gap.gap),
      0
    );
    const gapHours = Math.max(generalGapHours, mandatoryHoursGap);
    const isCompliant = view.isCompliant;

    // Upsert compliance status record
    await prisma.complianceStatus.upsert({
      where: {
        userId_licenseState_licenseType_cycleStart: {
          userId,
          licenseState: license.state,
          licenseType: license.licenseType,
          cycleStart,
        },
      },
      update: {
        totalHoursEarned,
        totalHoursNeeded: rule.totalHours,
        isCompliant,
        gapHours,
        mandatoryGaps,
        computedAt: new Date(),
        cycleEnd,
      },
      create: {
        userId,
        licenseState: license.state,
        licenseType: license.licenseType,
        cycleStart,
        cycleEnd,
        totalHoursEarned,
        totalHoursNeeded: rule.totalHours,
        isCompliant,
        gapHours,
        mandatoryGaps,
      },
    });

    complianceResults.push({
      state: license.state,
      licenseType: license.licenseType,
      renewalDate: license.renewalDate,
      cycleStart,
      cycleEnd,
      totalHoursEarned,
      totalHoursNeeded: rule.totalHours,
      gapHours,
      isCompliant,
      mandatoryGaps,
      certificatesInCycle: cycleCerts.length,
      overall: view.overall,
      status: view.overall,
      statusLabel: view.statusLabel,
      uncertainHours: view.uncertainHours,
      evaluation: view.evaluation,
    });
  }

  return NextResponse.json({ compliance: complianceResults });
  } catch (error) {
    console.error("Compliance API error:", error);
    return NextResponse.json({ error: "Internal server error", compliance: [] }, { status: 500 });
  }
}
