import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getComplianceSnapshot } from "@/lib/compliance-snapshot";
import { isEmailConfigured, renderMonthlyDigestEmail, sendEmail } from "@/lib/email";
import { getOrCreateEmailPreference, unsubscribeUrlFor } from "@/lib/email-preferences";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/monthly-digest
 * Vercel Cron, 1st of each month. Sends the monthly compliance digest:
 * per-license status, completed vs. outstanding required CME, and the
 * hours-per-month pace that finishes everything before renewal.
 * EmailLog dedupe key (one per user per calendar month) makes re-runs safe.
 */

const SEND_DELAY_MS = 700;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ sent: 0, skipped: "RESEND_API_KEY not configured" });
  }

  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const results: { sent: number; deduped: number; optedOut: number; errors: string[] } = {
    sent: 0,
    deduped: 0,
    optedOut: 0,
    errors: [],
  };

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      licenses: { some: { isActive: true } },
    },
    select: { id: true },
  });

  for (const user of users) {
    try {
      const pref = await getOrCreateEmailPreference(user.id);
      if (!pref.monthlyDigest) {
        results.optedOut += 1;
        continue;
      }

      const dedupeKey = `digest:${user.id}:${monthKey}`;
      let log;
      try {
        log = await prisma.emailLog.create({
          data: { userId: user.id, kind: "MONTHLY_DIGEST", dedupeKey },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          results.deduped += 1;
          continue;
        }
        throw err;
      }

      const snapshot = await getComplianceSnapshot(user.id);
      if (!snapshot || snapshot.licenses.length === 0) {
        await prisma.emailLog.delete({ where: { id: log.id } }).catch(() => {});
        continue;
      }

      const unsubscribeUrl = unsubscribeUrlFor(pref.unsubscribeToken);
      const { subject, html } = renderMonthlyDigestEmail({ snapshot, unsubscribeUrl });

      const sendResult = await sendEmail({ to: snapshot.email, subject, html, unsubscribeUrl });
      if (!sendResult.ok) {
        await prisma.emailLog.delete({ where: { id: log.id } }).catch(() => {});
        results.errors.push(`${user.id}: ${sendResult.error}`);
        continue;
      }

      results.sent += 1;
      await sleep(SEND_DELAY_MS);
    } catch (err) {
      results.errors.push(`${user.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  console.log(
    `[monthly-digest] sent=${results.sent} deduped=${results.deduped} optedOut=${results.optedOut} errors=${results.errors.length}`
  );
  return NextResponse.json(results);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
