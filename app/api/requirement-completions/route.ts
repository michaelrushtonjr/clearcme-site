import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function yearToDate(year: number | null) {
  return year ? new Date(Date.UTC(year, 0, 1)) : null;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const completions = await prisma.userRequirementCompletion.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ completions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mandatoryRequirementId = typeof body.mandatoryRequirementId === "string" ? body.mandatoryRequirementId : null;
  const physicianLicenseId = typeof body.physicianLicenseId === "string" ? body.physicianLicenseId : null;
  const completedYear = Number.isInteger(body.completedYear) ? Number(body.completedYear) : null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : null;
  const action = body.action === "clear" ? "clear" : "complete";

  if (!mandatoryRequirementId || !physicianLicenseId) {
    return NextResponse.json({ error: "Missing requirement or license" }, { status: 400 });
  }

  const license = await prisma.physicianLicense.findFirst({
    where: { id: physicianLicenseId, userId, isActive: true },
    select: { id: true, state: true, licenseType: true },
  });
  if (!license) return NextResponse.json({ error: "License not found" }, { status: 404 });

  const requirement = await prisma.mandatoryRequirement.findFirst({
    where: {
      id: mandatoryRequirementId,
      complianceRule: {
        state: license.state,
        licenseType: license.licenseType,
      },
    },
    select: { id: true, topic: true },
  });
  if (!requirement) return NextResponse.json({ error: "Requirement not found for this license" }, { status: 404 });

  if (action === "clear") {
    await prisma.userRequirementCompletion.deleteMany({
      where: { userId, mandatoryRequirementId, physicianLicenseId },
    });
    return NextResponse.json({ ok: true, completion: null });
  }

  if (completedYear !== null) {
    const currentYear = new Date().getUTCFullYear();
    if (completedYear < 1950 || completedYear > currentYear + 1) {
      return NextResponse.json({ error: "Invalid completion year" }, { status: 400 });
    }
  }

  const completion = await prisma.userRequirementCompletion.upsert({
    where: {
      userId_mandatoryRequirementId_physicianLicenseId: {
        userId,
        mandatoryRequirementId,
        physicianLicenseId,
      },
    },
    create: {
      userId,
      physicianLicenseId,
      mandatoryRequirementId,
      topic: requirement.topic,
      completedYear,
      completedAt: yearToDate(completedYear),
      notes,
    },
    update: {
      completedYear,
      completedAt: yearToDate(completedYear),
      notes,
      source: "SELF_ATTESTED",
    },
  });

  return NextResponse.json({ ok: true, completion });
}
