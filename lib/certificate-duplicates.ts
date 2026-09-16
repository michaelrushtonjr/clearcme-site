import type { Prisma } from "@prisma/client";
import { activityFingerprint } from "@/lib/certificate-validation";

// Lock by user across completion, manual creation, and edits so concurrent
// scans with different bytes cannot both become the first counted activity.
export async function lockCertificateUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`certificates:${userId}`}, 0))`;
}

export async function findActivityDuplicate(tx: Prisma.TransactionClient, userId: string, fingerprint: string | null, id?: string, fields?: Parameters<typeof activityFingerprint>[0]) {
  if (!fingerprint) return null;
  const match = await tx.certificate.findFirst({
    where: { userId, activityFingerprint: fingerprint, ...(id ? { id: { not: id } } : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true },
  });
  if (match || !fields?.activityDate) return match;
  // Existing records have no fingerprint. Compare their stored metadata for
  // the same day/hours, without reading blobs or rewriting historical hours.
  const start = new Date(fields.activityDate.toISOString().slice(0, 10));
  const end = new Date(start.getTime() + 86_400_000);
  const legacy = await tx.certificate.findMany({
    where: { userId, activityFingerprint: null, creditHours: fields.hoursEarned, activityDate: { gte: start, lt: end }, ...(id ? { id: { not: id } } : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, title: true, provider: true, activityDate: true, creditHours: true },
  });
  return legacy.find((cert) => activityFingerprint({ ...cert, hoursEarned: cert.creditHours }) === fingerprint) ?? null;
}
