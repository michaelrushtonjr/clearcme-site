import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { generateCEBrokerReport, isCEBrokerState } from "@/lib/cebroker-export";
import { prisma } from "@/lib/prisma";

function formatFileDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const licenseId = request.nextUrl.searchParams.get("licenseId");
    if (!licenseId) {
      return NextResponse.json({ error: "licenseId is required" }, { status: 400 });
    }

    const license = await prisma.physicianLicense.findFirst({
      where: {
        id: licenseId,
        userId,
        isActive: true,
      },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    if (!isCEBrokerState(license.state)) {
      return NextResponse.json(
        { error: `${license.state} does not use CE Broker self-report exports` },
        { status: 422 }
      );
    }

    const rule = await prisma.complianceRule.findUnique({
      where: {
        state_licenseType: {
          state: license.state,
          licenseType: license.licenseType,
        },
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: `Compliance rule missing for ${license.state} ${license.licenseType}` },
        { status: 404 }
      );
    }

    const cycleEnd = license.renewalDate ?? new Date();
    const cycleStart = new Date(cycleEnd);
    cycleStart.setMonth(cycleStart.getMonth() - rule.renewalCycle);

    const certificates = await prisma.certificate.findMany({
      where: {
        userId,
        extractionStatus: "COMPLETED",
        activityDate: {
          gte: cycleStart,
          lte: cycleEnd,
        },
      },
      orderBy: [
        { activityDate: "asc" },
        { createdAt: "asc" },
      ],
    });

    const report = generateCEBrokerReport(certificates, license);
    const fileName = `cebroker-report-${license.state.toLowerCase()}-${formatFileDate(new Date())}.csv`;

    return new NextResponse(`\uFEFF${report.csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("CE Broker export error:", error);
    return NextResponse.json({ error: "Failed to generate CE Broker export" }, { status: 500 });
  }
}
