import { prisma } from "@/lib/prisma";

export type DeliveryResult = { status: "sent" | "deduped" } | { status: "failed"; error: string };

// Unique dedupe key plus conditional claim protects against overlapping cron
// invocations. A stale PENDING lease is retryable after a terminated function.
export async function deliverEmail(input: { userId: string; kind: string; dedupeKey: string; cycleKey: string }, send: () => Promise<void>): Promise<DeliveryResult> {
  const now = new Date();
  const stale = new Date(now.getTime() - 15 * 60_000);
  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "EmailLog" (id, "userId", kind, "dedupeKey", "cycleKey", status, attempts, "lastAttemptAt")
    VALUES (${crypto.randomUUID()}, ${input.userId}, ${input.kind}, ${input.dedupeKey}, ${input.cycleKey}, 'PENDING', 1, ${now})
    ON CONFLICT ("dedupeKey") DO UPDATE SET status = 'PENDING', attempts = "EmailLog".attempts + 1,
      "lastAttemptAt" = ${now}, "lastError" = NULL
    WHERE "EmailLog".status <> 'SENT' AND "EmailLog".attempts < 5
      AND ("EmailLog".status = 'FAILED' OR "EmailLog"."lastAttemptAt" IS NULL OR "EmailLog"."lastAttemptAt" < ${stale})
    RETURNING id`;
  if (!claimed.length) {
    const log = await prisma.emailLog.findUnique({ where: { dedupeKey: input.dedupeKey } });
    return log?.status === "FAILED" || (log?.status === "PENDING" && log.lastAttemptAt && log.lastAttemptAt < stale)
      ? { status: "failed", error: log.lastError ?? "Delivery exhausted five attempts; operator review required" }
      : { status: "deduped" };
  }
  const id = claimed[0].id;
  try {
    await send();
    await prisma.emailLog.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    await prisma.emailLog.update({ where: { id }, data: { status: "FAILED", lastError: message.slice(0, 1000) } });
    return { status: "failed", error: message };
  }
}
