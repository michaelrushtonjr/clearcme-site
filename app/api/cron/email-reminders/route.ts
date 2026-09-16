import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getComplianceSnapshot } from "@/lib/compliance-snapshot";
import { renderRenewalReminderEmail, sendEmail, notifyReminderFailures } from "@/lib/email";
import { getOrCreateEmailPreference, unsubscribeUrlFor } from "@/lib/email-preferences";
import { deliverEmail } from "@/lib/email-delivery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const REMINDER_MARKERS = [90, 60, 30, 7] as const;

async function handle(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const results = { sent: 0, deduped: 0, optedOut: 0, failed: 0, errors: [] as string[] };
  try {
    for (const marker of REMINDER_MARKERS) {
      const end = new Date(today.getTime() + (marker + 1) * 86400000);
      const licenses = await prisma.physicianLicense.findMany({
        where: { isActive: true, renewalDate: { lt: end }, user: { email: { not: null } } },
        select: { id: true, userId: true, state: true, licenseType: true, renewalDate: true },
      });
      for (const license of licenses) {
        try {
          if (!license.renewalDate) continue;
          const pref = await getOrCreateEmailPreference(license.userId);
          if (!pref.renewalReminders) { results.optedOut++; continue; }
          const date = license.renewalDate.toISOString().slice(0, 10);
          const dedupeKey = `renewal:${license.id}:${marker}:${date}`;
          const delivery = await deliverEmail({ userId: license.userId, kind: "RENEWAL_REMINDER", dedupeKey, cycleKey: `${license.id}:${date}` }, async () => {
            const snapshot = await getComplianceSnapshot(license.userId);
            const entry = snapshot?.licenses.find((item) => item.licenseId === license.id);
            if (!snapshot || !entry) throw new Error("Compliance snapshot unavailable");
            const unsubscribeUrl = unsubscribeUrlFor(pref.unsubscribeToken);
            const { subject, html } = renderRenewalReminderEmail({ firstName: snapshot.firstName, license: entry, unsubscribeUrl });
            const sent = await sendEmail({ to: snapshot.email, subject, html, unsubscribeUrl });
            if (!sent.ok) throw new Error(sent.error ?? "Email delivery failed");
          });
          if (delivery.status === "failed") results.errors.push(`${license.id}: ${delivery.error}`);
          else results[delivery.status]++;
          // Keep Resend's existing throttle, including failed sends.
          if (delivery.status !== "deduped") await new Promise((resolve) => setTimeout(resolve, 700));
        } catch (error) { results.errors.push(`${license.id}: ${error instanceof Error ? error.message : "Unknown failure"}`); }
      }
    }
  } catch (error) { results.errors.push(error instanceof Error ? error.message : "Cron failed"); }
  results.failed = results.errors.length;
  await notifyReminderFailures("email-reminders", results.failed);
  return NextResponse.json(results, { status: results.failed ? 500 : 200 });
}
export const GET = handle;
export const POST = handle;
