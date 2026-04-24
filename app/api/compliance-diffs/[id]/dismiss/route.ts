import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await prisma.userComplianceDiff.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        isDismissed: true,
        isRead: true,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Compliance diff not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Compliance diff dismissal error:", error);
    return NextResponse.json({ error: "Failed to dismiss compliance diff" }, { status: 500 });
  }
}
