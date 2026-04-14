import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper: extract and verify mobile JWT from Authorization header
// Also supports NextAuth session for web clients
async function getMobileUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

// GET /api/notifications/upcoming
// Returns upcoming renewal reminders (within 60 days) for the authenticated user.

export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);

  // Also support NextAuth session for web callers
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    // Try NextAuth session
    const { auth } = await import("@/auth");
    const session = await auth();
    resolvedUserId = session?.user?.id ?? null;
  }

  if (!resolvedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const licenses = await prisma.physicianLicense.findMany({
      where: {
        userId: resolvedUserId,
        isActive: true,
        renewalDate: {
          gte: now,
          lte: in60Days,
        },
      },
      orderBy: { renewalDate: "asc" },
    });

    // Find compliance status for each license to get hours needed
    const complianceStatuses = await prisma.complianceStatus.findMany({
      where: {
        userId: resolvedUserId,
        licenseState: { in: licenses.map((l) => l.state) },
      },
    });

    const complianceByStateType = new Map(
      complianceStatuses.map((cs) => [`${cs.licenseState}-${cs.licenseType}`, cs])
    );

    const reminders = licenses.map((license) => {
      const renewalDate = license.renewalDate!;
      const msUntilRenewal = renewalDate.getTime() - now.getTime();
      const daysUntilRenewal = Math.ceil(msUntilRenewal / (1000 * 60 * 60 * 24));

      const compliance = complianceByStateType.get(`${license.state}-${license.licenseType}`);
      const hoursNeeded = compliance ? Math.max(0, compliance.gapHours) : null;

      return {
        licenseId: license.id,
        state: license.state,
        licenseType: license.licenseType,
        renewalDate: renewalDate.toISOString(),
        daysUntilRenewal,
        hoursNeeded,
      };
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Upcoming notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}
