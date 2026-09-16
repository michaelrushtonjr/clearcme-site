import { NextRequest, NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { inferSpecialTopics, validateTopicAllocations } from "@/lib/certificate-topics";
import type { SpecialTopic } from "@prisma/client";
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
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, provider, activityDate, creditHours, creditType, topics, topicHourAllocations } = body;
  if (topics !== undefined && (!Array.isArray(topics) || topics.some((t: unknown) => typeof t !== "string"))) return NextResponse.json({ error: "Topics must be text labels" }, { status: 400 });
  let split: Record<string, number> | undefined;
  try {
    if (topicHourAllocations !== undefined) split = validateTopicAllocations(topicHourAllocations, Number(creditHours ?? existing.creditHours));
    else if (creditHours !== undefined && Object.keys(existing.topicHourAllocations as object ?? {}).length) validateTopicAllocations(existing.topicHourAllocations, Number(creditHours));
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const confirmedTopics = split ? Object.keys(split) as SpecialTopic[] : existing.manuallyVerified ? existing.specialTopics : [];
  const suggestions = inferSpecialTopics({ title: title ?? existing.title, topics: topics ?? existing.topics }).filter((t) => !confirmedTopics.includes(t));

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
      specialTopics: confirmedTopics,
      suggestedSpecialTopics: suggestions,
      ...(split && { topicHourAllocations: split }),
      ...(topics !== undefined && { topics }),
      ...(title !== undefined && { title }),
      ...(provider !== undefined && { provider }),
      ...(activityDate !== undefined && { activityDate: new Date(activityDate) }),
      ...(creditHours !== undefined && { creditHours: Number(creditHours) }),
      ...(validCreditType && { creditType: validCreditType }),
      // The physician has confirmed or corrected these fields themselves —
      // the record now counts regardless of how extraction went.
      manuallyVerified: true,
      extractionStatus: [title, provider, activityDate, creditHours, creditType].some((v) => v !== undefined) ? "COMPLETED" : existing.extractionStatus,
      extractedAt: new Date(),
    },
  });

  return NextResponse.json({ certificate: updated });
}
