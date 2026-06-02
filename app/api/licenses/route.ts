import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const licenses = await prisma.physicianLicense.findMany({
    where: { userId },
    orderBy: { renewalDate: "asc" },
  });
  return NextResponse.json(licenses);
}

export async function POST(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    state,
    licenseType,
    licenseNumber,
    renewalDate,
    deaNumber,
    deaRegisteredAt,
    deaExpiresAt,
    mateActRequired,
    mateActCompleted,
    npiNumber,
    specialty,
    practiceArea,
  } = body;

  if (!state || !licenseType || !renewalDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Build optional DEA fields
  const deaFields: Record<string, unknown> = {};
  if (deaNumber !== undefined) deaFields.deaNumber = deaNumber || null;
  if (deaRegisteredAt) deaFields.deaRegisteredAt = new Date(deaRegisteredAt);
  if (deaExpiresAt) deaFields.deaExpiresAt = new Date(deaExpiresAt);
  if (typeof mateActRequired === "boolean") deaFields.mateActRequired = mateActRequired;
  if (typeof mateActCompleted === "boolean") deaFields.mateActCompleted = mateActCompleted;

  const npiFields: Record<string, unknown> = {};
  if (npiNumber !== undefined) npiFields.npiNumber = npiNumber || null;

  const userFields: Record<string, unknown> = {};
  if (specialty !== undefined) userFields.specialty = specialty || null;
  if (practiceArea !== undefined) userFields.practiceArea = practiceArea || null;

  const license = await prisma.physicianLicense.upsert({
    where: {
      userId_state_licenseType: {
        userId: userId,
        state,
        licenseType,
      },
    },
    update: {
      licenseNumber: licenseNumber || null,
      renewalDate: new Date(renewalDate),
      isActive: true,
      specialty: specialty || null,
      practiceArea: practiceArea || null,
      ...deaFields,
      ...npiFields,
    },
    create: {
      userId: userId,
      state,
      licenseType,
      licenseNumber: licenseNumber || null,
      renewalDate: new Date(renewalDate),
      isActive: true,
      specialty: specialty || null,
      practiceArea: practiceArea || null,
      ...deaFields,
      ...npiFields,
    },
  });

  if (Object.keys(userFields).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: userFields,
    });
  }

  return NextResponse.json(license, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    id,
    state,
    licenseType,
    licenseNumber,
    renewalDate,
    npiNumber,
    specialty,
    practiceArea,
  } = body;

  if (!id || !state || !licenseType || !renewalDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.physicianLicense.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  const duplicate = await prisma.physicianLicense.findFirst({
    where: {
      userId,
      state,
      licenseType,
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json({ error: "You already have that state/license type on file." }, { status: 409 });
  }

  const npiFields: Record<string, unknown> = {};
  if (npiNumber !== undefined) npiFields.npiNumber = npiNumber || null;

  const userFields: Record<string, unknown> = {};
  if (specialty !== undefined) userFields.specialty = specialty || null;
  if (practiceArea !== undefined) userFields.practiceArea = practiceArea || null;

  const [license] = await prisma.$transaction([
    prisma.physicianLicense.update({
      where: { id },
      data: {
        state,
        licenseType,
        licenseNumber: licenseNumber || null,
        renewalDate: new Date(renewalDate),
        specialty: specialty || null,
        practiceArea: practiceArea || null,
        ...npiFields,
      },
    }),
    ...(Object.keys(userFields).length > 0
      ? [prisma.user.update({ where: { id: userId }, data: userFields })]
      : []),
  ]);

  return NextResponse.json(license);
}

export async function DELETE(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.physicianLicense.deleteMany({
    where: { id, userId },
  });

  return NextResponse.json({ success: true });
}
