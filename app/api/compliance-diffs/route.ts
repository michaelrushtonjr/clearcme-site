import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplianceDiffCourseHref } from "@/lib/compliance-diffs";
import { getMobileUserId } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const diffs = await prisma.userComplianceDiff.findMany({
      where: {
        userId,
        isRead: false,
        isDismissed: false,
      },
      include: {
        change: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      diffs.map((diff) => ({
        id: diff.id,
        changeId: diff.changeId,
        impactDescription: diff.impactDescription,
        additionalHoursNeeded: diff.additionalHoursNeeded,
        isRead: diff.isRead,
        isDismissed: diff.isDismissed,
        createdAt: diff.createdAt.toISOString(),
        courseHref: resolveComplianceDiffCourseHref(
          {
            field: diff.change.field,
            oldValue: diff.change.oldValue,
            newValue: diff.change.newValue,
            description: diff.change.description,
          },
          diff.impactDescription,
        ),
        change: {
          id: diff.change.id,
          state: diff.change.state,
          licenseType: diff.change.licenseType,
          changeType: diff.change.changeType,
          field: diff.change.field,
          oldValue: diff.change.oldValue,
          newValue: diff.change.newValue,
          effectiveDate: diff.change.effectiveDate?.toISOString() ?? null,
          detectedAt: diff.change.detectedAt.toISOString(),
          description: diff.change.description,
        },
      })),
    );
  } catch (error) {
    console.error("Compliance diffs API error:", error);
    return NextResponse.json({ error: "Failed to fetch compliance diffs" }, { status: 500 });
  }
}
