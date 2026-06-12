import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import type { Certificate, MandatoryRequirement } from "@prisma/client";
import { isComputedComplianceBlocked, computedComplianceBlockedMessage } from "@/lib/compliance-rule-availability";
import { daysUntil } from "@/lib/dates";
import { cadenceLabel, evaluateRequirementFulfillment } from "@/lib/requirement-completions";

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
    where: { userId, extractionStatus: "COMPLETED" },
  });

  const requirementCompletions = await prisma.userRequirementCompletion.findMany({
    where: { userId },
  });
  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { specialty: true, practiceArea: true },
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
          include: { mandatoryRequirements: true },
        });

    if (!rule) {
      // No rule configured yet, or computed compliance is intentionally blocked for this state.
      complianceResults.push({
        state: license.state,
        licenseType: license.licenseType,
        renewalDate: license.renewalDate,
        status: "NO_RULES_CONFIGURED",
        message: computedComplianceBlockedMessage(license.state, license.licenseType),
      });
      continue;
    }

    // Determine cycle window
    const cycleEnd = license.renewalDate ?? new Date();
    const cycleStart = new Date(cycleEnd);
    cycleStart.setMonth(cycleStart.getMonth() - rule.renewalCycle);

    // Filter certificates within cycle window
    const cycleCerts = certificates.filter((cert: Certificate) => {
      if (!cert.activityDate) return false;
      return cert.activityDate >= cycleStart && cert.activityDate <= cycleEnd;
    });

    const totalHoursEarned = cycleCerts.reduce(
      (sum: number, c: Certificate) => sum + (c.creditHours ?? 0),
      0
    );
    const generalGapHours = Math.max(0, rule.totalHours - totalHoursEarned);

    // Check mandatory topics
    const specialty = license.specialty ?? userProfile?.specialty ?? "";
    const practiceArea = license.practiceArea ?? userProfile?.practiceArea ?? "";
    const isPsychiatry = `${specialty} ${practiceArea}`
      .toLowerCase()
      .includes("psychiat");
    const applicableMandatoryRequirements = rule.mandatoryRequirements.filter((req: MandatoryRequirement) => {
      const text = `${req.description ?? ""} ${req.notes ?? ""}`.toLowerCase();
      const isNvDoPsychiatryCulturalCompetency =
        license.state === "NV" &&
        license.licenseType === "DO" &&
        req.topic === "CULTURAL_COMPETENCY" &&
        text.includes("psychiat");
      return !isNvDoPsychiatryCulturalCompetency || isPsychiatry;
    });

    const mandatoryGaps = applicableMandatoryRequirements.map((req: MandatoryRequirement) => {
      const earnedForTopic = cycleCerts
        .filter((c: Certificate) => c.specialTopics.includes(req.topic))
        .reduce((sum: number, c: Certificate) => sum + (c.creditHours ?? 0), 0);
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
      const hoursSatisfied = req.hoursRequired > 0 && earnedForTopic >= req.hoursRequired;
      const isMet = hoursSatisfied || fulfillment.isSatisfied || (!historySensitive && req.hoursRequired === 0);
      const isUnknown = fulfillment.isUnknown && !hoursSatisfied;

      return {
        requirementId: req.id,
        topic: req.topic,
        description: req.description,
        earned: earnedForTopic,
        needed: req.hoursRequired,
        gap: isMet || isUnknown ? 0 : Math.max(0, req.hoursRequired - earnedForTopic),
        isMet,
        isUnknown,
        isAttestable: fulfillment.isAttestable,
        cadenceLabel: cadenceLabel(req),
        prompt: fulfillment.prompt,
        satisfiedUntil: fulfillment.satisfiedUntil,
      };
    });

    const mandatoryHoursGap = mandatoryGaps.reduce(
      (sum: number, gap: { gap: number }) => sum + Math.max(0, gap.gap),
      0
    );
    const allMandatoryMet = mandatoryGaps.every((gap: { isMet: boolean }) => gap.isMet);
    const gapHours = Math.max(generalGapHours, mandatoryHoursGap);
    const isCompliant = generalGapHours === 0 && allMandatoryMet;

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
    });
  }

  return NextResponse.json({ compliance: complianceResults });
  } catch (error) {
    console.error("Compliance API error:", error);
    return NextResponse.json({ error: "Internal server error", compliance: [] }, { status: 500 });
  }
}
