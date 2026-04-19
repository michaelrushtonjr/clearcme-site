import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import type { Certificate, MandatoryRequirement } from "@prisma/client";

// GET /api/compliance — compute and return compliance status for the current user
export async function GET(req: NextRequest) {
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

  const complianceResults = [];

  for (const license of licenses) {
    // Get compliance rules for this state + license type
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
      // No rule configured yet for this state
      complianceResults.push({
        state: license.state,
        licenseType: license.licenseType,
        renewalDate: license.renewalDate,
        status: "NO_RULES_CONFIGURED",
        message: `Compliance rules for ${license.state} ${license.licenseType} not yet loaded.`,
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
    const gapHours = Math.max(0, rule.totalHours - totalHoursEarned);
    const isCompliant = gapHours === 0;

    // Check mandatory topics
    const mandatoryGaps = rule.mandatoryRequirements.map((req: MandatoryRequirement) => {
      const earnedForTopic = cycleCerts
        .filter((c: Certificate) => c.specialTopics.includes(req.topic))
        .reduce((sum: number, c: Certificate) => sum + (c.creditHours ?? 0), 0);

      return {
        topic: req.topic,
        description: req.description,
        earned: earnedForTopic,
        needed: req.hoursRequired,
        gap: Math.max(0, req.hoursRequired - earnedForTopic),
        isMet: earnedForTopic >= req.hoursRequired,
      };
    });

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
}
