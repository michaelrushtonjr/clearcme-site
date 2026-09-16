import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { mateActDeadline } from "@/lib/mate-act";
import { evaluateFederalTraining } from "@/lib/compliance-engine";

export async function getFederalTraining(userId: string) {
  const [record, user, registrations] = await Promise.all([
    prisma.federalTrainingRecord.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { hasDeaRegistration: true, deaFirstQualifyingAt: true } }),
    prisma.physicianLicense.findMany({ where: { userId }, select: { deaNumber: true, deaRegisteredAt: true } }),
  ]);
  const registered = registrations.some((license) => license.deaNumber || license.deaRegisteredAt);
  // Legacy deaRegisteredAt was also populated from renewal certificates. Its
  // provenance cannot establish the FIRST qualifying event. Keep it readable.
  const deadline = mateActDeadline({ firstQualifyingAt: user?.deaFirstQualifyingAt }).date;
  return evaluateFederalTraining({ record, registered: registered ? true : user?.hasDeaRegistration ?? null, deadline });
}

export async function saveFederalAttestation(tx: Prisma.TransactionClient, userId: string, input: {
  completed: boolean; basis?: "EIGHT_HOUR_TRAINING" | "BOARD_CERT_ADDICTION" | "GRADUATED_AFTER_2023" | "OTHER";
  completedAt?: Date | null; evidenceCertificateId?: string | null; notes?: string | null;
}) {
  if (!input.completed) {
    await tx.federalTrainingRecord.deleteMany({ where: { userId } });
    await tx.physicianLicense.updateMany({ where: { userId }, data: { mateActCompleted: false } });
    return null;
  }
  if (input.evidenceCertificateId) {
    const evidence = await tx.certificate.findFirst({ where: { id: input.evidenceCertificateId, userId } });
    if (!evidence) throw new Error("Evidence certificate not found");
  }
  const data = { basis: input.basis ?? "EIGHT_HOUR_TRAINING", completedAt: input.completedAt, evidenceCertificateId: input.evidenceCertificateId, notes: input.notes, attestedAt: new Date() };
  const record = await tx.federalTrainingRecord.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  // Compatibility only. Readers must use the single federal record.
  await tx.physicianLicense.updateMany({ where: { userId }, data: { mateActCompleted: true } });
  return record;
}
