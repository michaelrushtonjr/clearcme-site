import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getComplianceSnapshot } from "@/lib/compliance-snapshot";
import { renderMonthlyDigestEmail, sendEmail, notifyReminderFailures } from "@/lib/email";
import { getOrCreateEmailPreference, unsubscribeUrlFor } from "@/lib/email-preferences";
import { deliverEmail } from "@/lib/email-delivery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Runs daily: one SENT digest per month; failed sends retry on subsequent days.
async function handle(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const monthKey = new Date().toISOString().slice(0, 7);
  const results = { sent: 0, deduped: 0, optedOut: 0, failed: 0, errors: [] as string[] };
  try {
    const users = await prisma.user.findMany({ where: { email: { not: null }, licenses: { some: { isActive: true } } }, select: { id: true } });
    for (const user of users) {
      try {
        const pref = await getOrCreateEmailPreference(user.id);
        if (!pref.monthlyDigest) { results.optedOut++; continue; }
        const currentKey = `digest:${user.id}:${monthKey}`;
        // Retry a prior month's unfinished delivery before starting this month;
        // at most one digest per user per run, always using current engine data.
        const pending = await prisma.emailLog.findFirst({ where: { userId: user.id, kind: "MONTHLY_DIGEST", status: { in: ["FAILED", "PENDING"] }, attempts: { lt: 5 }, dedupeKey: { not: currentKey } }, orderBy: { lastAttemptAt: "asc" } });
        const dedupeKey = pending?.dedupeKey ?? currentKey;
        const delivery = await deliverEmail({ userId: user.id, kind: "MONTHLY_DIGEST", dedupeKey, cycleKey: dedupeKey }, async () => {
          const snapshot = await getComplianceSnapshot(user.id);
          if (!snapshot || !snapshot.licenses.length) throw new Error("Compliance snapshot unavailable");
          const unsubscribeUrl = unsubscribeUrlFor(pref.unsubscribeToken);
          const { subject, html } = renderMonthlyDigestEmail({ snapshot, unsubscribeUrl });
          const sent = await sendEmail({ to: snapshot.email, subject, html, unsubscribeUrl });
          if (!sent.ok) throw new Error(sent.error ?? "Email delivery failed");
        });
        if (delivery.status === "failed") results.errors.push(`${user.id}: ${delivery.error}`);
        else results[delivery.status]++;
        if (delivery.status !== "deduped") await new Promise((resolve) => setTimeout(resolve, 700));
      } catch (error) { results.errors.push(`${user.id}: ${error instanceof Error ? error.message : "Unknown failure"}`); }
    }
  } catch (error) { results.errors.push(error instanceof Error ? error.message : "Cron failed"); }
  results.failed = results.errors.length;
  await notifyReminderFailures("monthly-digest", results.failed);
  return NextResponse.json(results, { status: results.failed ? 500 : 200 });
}
export const GET = handle;
export const POST = handle;
