import { NextRequest, NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { inferSpecialTopics, validateTopicAllocations } from "@/lib/certificate-topics";
import { activityFingerprint, validateCertificateFields } from "@/lib/certificate-validation";
import { findActivityDuplicate, lockCertificateUser } from "@/lib/certificate-duplicates";
import { CertificateFileError, deleteCertificateOriginalAndRow } from "@/lib/certificate-storage";
import { z } from "zod";
import type { SpecialTopic } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function userFor(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  return mobileUserId ?? (await auth())?.user?.id;
}
function failure(error: unknown) {
  if (error instanceof CertificateFileError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[certificates] Certificate change failed");
  return NextResponse.json({ error: "Certificate change failed. Please try again." }, { status: 500 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userFor(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteCertificateOriginalAndRow((await params).id, userId);
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}

const patchSchema = z.object({
  title: z.string().nullable().optional(), provider: z.string().nullable().optional(),
  activityDate: z.string().nullable().optional(), creditHours: z.number().nullable().optional(),
  hoursEarned: z.number().nullable().optional(),
  creditType: z.enum(["AMA_PRA_1", "AMA_PRA_2", "AAFP_PRESCRIBED", "AAFP_ELECTIVE", "AOA_1_A", "AOA_1_B", "AOA_2_A", "AOA_2_B", "OTHER"]).optional(),
  topics: z.array(z.string()).optional(), topicHourAllocations: z.unknown().optional(),
  duplicateResolution: z.enum(["keep_both", "merge"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userFor(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid certificate fields" }, { status: 400 });
  const body = parsed.data;
  const { id } = await params;
  try {
    if (body.duplicateResolution === "merge") {
      await deleteCertificateOriginalAndRow(id, userId, true);
      return NextResponse.json({ success: true, merged: true });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await lockCertificateUser(tx, userId);
      const existing = await tx.certificate.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) throw new CertificateFileError("Not found", 404);
      const hours = body.hoursEarned !== undefined ? body.hoursEarned : body.creditHours !== undefined ? body.creditHours : existing.creditHours;
      const fields = validateCertificateFields({
        title: body.title !== undefined ? body.title : existing.title,
        provider: body.provider !== undefined ? body.provider : existing.provider,
        activityDate: body.activityDate !== undefined ? body.activityDate : existing.activityDate,
        hoursEarned: hours, activityMaxHours: existing.activityMaxHours,
      });
      let split: Record<string, number> | undefined;
      try {
        if (body.topicHourAllocations !== undefined) split = validateTopicAllocations(body.topicHourAllocations, fields.creditHours ?? 0);
        else if ((body.creditHours !== undefined || body.hoursEarned !== undefined) && Object.keys(existing.topicHourAllocations as object ?? {}).length) validateTopicAllocations(existing.topicHourAllocations, fields.creditHours ?? 0);
      } catch (error) { throw new CertificateFileError((error as Error).message, 400); }
      const confirmedTopics = split ? Object.keys(split) as SpecialTopic[] : existing.manuallyVerified ? existing.specialTopics : [];
      const topics = body.topics ?? existing.topics;
      const suggestions = inferSpecialTopics({ title: fields.title, topics }).filter((t) => !confirmedTopics.includes(t));
      const fingerprint = activityFingerprint(fields);
      const duplicate = fingerprint !== existing.activityFingerprint ? await findActivityDuplicate(tx, userId, fingerprint, id, fields) : null;
      const possibleDuplicateOfId = body.duplicateResolution === "keep_both" ? null : duplicate?.id ?? existing.possibleDuplicateOfId;
      const fieldEdit = [body.title, body.provider, body.activityDate, body.creditHours, body.hoursEarned, body.creditType].some((v) => v !== undefined);
      return tx.certificate.update({ where: { id }, data: {
        specialTopics: confirmedTopics, suggestedSpecialTopics: suggestions,
        ...((body.title !== undefined || body.topics !== undefined) && { extractedSpecialTopics: [] }),
        ...(split && { topicHourAllocations: split }), ...(body.topics !== undefined && { topics }),
        ...(fieldEdit && { title: fields.title, provider: fields.provider, activityDate: fields.activityDate, creditHours: fields.creditHours, hoursEarned: fields.hoursEarned }),
        ...(body.creditType && { creditType: body.creditType }),
        activityFingerprint: fingerprint, possibleDuplicateOfId,
        manuallyVerified: true,
        // Topic confirmation alone must never certify an incomplete extraction.
        extractionStatus: !fields.valid ? "NEEDS_REVIEW" : fieldEdit ? "COMPLETED" : existing.extractionStatus,
        extractedAt: new Date(),
      } });
    });
    return NextResponse.json({ certificate: updated });
  } catch (error) { return failure(error); }
}
