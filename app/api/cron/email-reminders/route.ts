import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getComplianceSnapshot } from "@/lib/compliance-snapshot";
import { isEmailConfigured, renderRenewalReminderEmail, sendEmail } from "@/lib/email";
import { getOrCreateEmailPreference, unsubscribeUrlFor } from "@/lib/email-preferences";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/email-reminders
 * Vercel Cron, daily. Sends renewal-reminder emails when a license is exactly
 * 90, 60, 30, or 7 days from renewal. EmailLog dedupe keys make re-runs safe.
 *
 * Note: Vercel Cron invokes with GET and sends `Authorization: Bearer
 * ${CRON_SECRET}` automatically when the env var is set.
 */

const REMINDER_MARKERS = [90, 60, 30, 7] as const;
const SEND_DELAY_MS = 700; // stay under Resend rate limits

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ sent: 0, skipped: "RESEND_API_KEY not configured" });
  }

  const today = utcToday();
  const results: { sent: number; deduped: number; optedOut: number; errors: string[] } = {
    sent: 0,
    deduped: 0,
    optedOut: 0,
    errors: [],
  };

  for (const marker of REMINDER_MARKERS) {
    const target = new Date(today.getTime() + marker * 24 * 60 * 60 * 1000);
    const nextDay = new Date(target.getTime() + 24 * 60 * 60 * 1000);

    const licenses = await prisma.physicianLicense.findMany({
      where: {
        isActive: true,
        renewalDate: { gte: target, lt: nextDay },
        user: { email: { not: null } },
      },
      select: { id: true, userId: true, state: true, licenseType: true, renewalDate: true },
    });

    for (const license of licenses) {
      try {
        const pref = await getOrCreateEmailPreference(license.userId);
        if (!pref.renewalReminders) {
          results.optedOut += 1;
          continue;
        }

        const dedupeKey = `renewal:${license.id}:${marker}:${target.toISOString().slice(0, 10)}`;
        let log;
        try {
          log = await prisma.emailLog.create({
            data: { userId: license.userId, kind: "RENEWAL_REMINDER", dedupeKey },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            results.deduped += 1;
            continue;
          }
          throw err;
        }

        const snapshot = await getComplianceSnapshot(license.userId);
        const licenseSnapshot = snapshot?.licenses.find((l) => l.licenseId === license.id);
        if (!snapshot || !licenseSnapshot) {
          // No computable rule for this license — release the dedupe slot.
          await prisma.emailLog.delete({ where: { id: log.id } }).catch(() => {});
          continue;
        }

        const unsubscribeUrl = unsubscribeUrlFor(pref.unsubscribeToken);
        const { subject, html } = renderRenewalReminderEmail({
          firstName: snapshot.firstName,
          license: licenseSnapshot,
          unsubscribeUrl,
        });

        const sendResult = await sendEmail({ to: snapshot.email, subject, html, unsubscribeUrl });
        if (!sendResult.ok) {
          // Release the dedupe slot so tomorrow's run can retry.
          await prisma.emailLog.delete({ where: { id: log.id } }).catch(() => {});
          results.errors.push(`${license.state} ${license.licenseType} (${license.id}): ${sendResult.error}`);
          continue;
        }

        results.sent += 1;
        await sleep(SEND_DELAY_MS);
      } catch (err) {
        results.errors.push(
          `${license.id}: ${err instanceof Error ? err.message : "unknown error"}`
        );
      }
    }
  }

  console.log(
    `[email-reminders] sent=${results.sent} deduped=${results.deduped} optedOut=${results.optedOut} errors=${results.errors.length}`
  );
  return NextResponse.json(results);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
