import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/certificates/[id] — delete a certificate
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.certificate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PATCH /api/certificates/[id] — manually update certificate fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, provider, activityDate, creditHours, creditType } = body;

  const CREDIT_TYPES = [
    "AMA_PRA_1",
    "AMA_PRA_2",
    "AAFP_PRESCRIBED",
    "AAFP_ELECTIVE",
    "AOA_1_A",
    "AOA_1_B",
    "AOA_2_A",
    "AOA_2_B",
    "OTHER",
  ] as const;
  const validCreditType = CREDIT_TYPES.find((t) => t === creditType);

  const updated = await prisma.certificate.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(provider !== undefined && { provider }),
      ...(activityDate !== undefined && { activityDate: new Date(activityDate) }),
      ...(creditHours !== undefined && { creditHours: Number(creditHours) }),
      ...(validCreditType && { creditType: validCreditType }),
      // The physician has confirmed or corrected these fields themselves —
      // the record now counts regardless of how extraction went.
      manuallyVerified: true,
      extractionStatus: "COMPLETED",
      extractedAt: new Date(),
    },
  });

  return NextResponse.json({ certificate: updated });
}
