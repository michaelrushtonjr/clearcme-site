import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Expo Push API endpoint
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

async function sendExpoBatch(messages: ExpoMessage[]): Promise<void> {
  // Chunk into batches of EXPO_BATCH_SIZE
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Expo push batch failed (${res.status}): ${text}`);
    } else {
      const json = await res.json();
      console.log(`Expo push batch sent (${batch.length} msgs):`, JSON.stringify(json?.data?.slice?.(0, 3)));
    }
  }
}

// POST /api/cron/renewal-reminders
// Called by Vercel Cron daily at 09:00 UTC.
// Secured with Bearer token (CRON_SECRET env var).

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Date windows ──────────────────────────────────────────────────────────
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  try {
    // ── Query users with a push token ─────────────────────────────────────
    const users = await prisma.user.findMany({
      where: {
        pushToken: { not: null },
      },
      select: {
        id: true,
        pushToken: true,
        licenseType: true,
        licenses: {
          where: {
            isActive: true,
            renewalDate: {
              gte: now,
              lte: in60Days,
            },
          },
          select: {
            id: true,
            state: true,
            licenseType: true,
            renewalDate: true,
          },
        },
        complianceStatus: {
          select: {
            licenseState: true,
            licenseType: true,
            gapHours: true,
          },
        },
      },
    });

    const messages: ExpoMessage[] = [];

    for (const user of users) {
      if (!user.pushToken || user.licenses.length === 0) continue;

      // Build a compliance lookup map
      const complianceMap = new Map(
        user.complianceStatus.map((cs) => [`${cs.licenseState}-${cs.licenseType}`, cs])
      );

      for (const license of user.licenses) {
        if (!license.renewalDate) continue;

        const msUntilRenewal = license.renewalDate.getTime() - now.getTime();
        const daysUntilRenewal = Math.ceil(msUntilRenewal / (1000 * 60 * 60 * 24));

        const compliance = complianceMap.get(`${license.state}-${license.licenseType}`);
        const gapHours = compliance ? Math.max(0, compliance.gapHours) : null;

        // Determine designation label (MD / DO / etc.)
        const designation = license.licenseType === "DO" ? "DO" : "MD";

        let title: string;
        let body: string;

        if (daysUntilRenewal < 30) {
          // Urgent
          title = "⚠️ Renewal Alert";
          if (gapHours !== null && gapHours > 0) {
            body = `Your ${license.state} ${designation} license renews in ${daysUntilRenewal} days. You still need ${gapHours} CME hours.`;
          } else {
            body = `Your ${license.state} ${designation} license renews in ${daysUntilRenewal} days. Review your compliance now.`;
          }
        } else {
          // 30–60 day heads-up
          title = "📋 CME Reminder";
          body = `Your ${license.state} ${designation} license renews in ${daysUntilRenewal} days. Start tracking your CME now.`;
        }

        messages.push({
          to: user.pushToken,
          title,
          body,
          sound: "default",
          data: {
            licenseId: license.id,
            screen: "compliance",
          },
        });
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({ sent: 0, message: "No upcoming renewals found." });
    }

    await sendExpoBatch(messages);

    console.log(`[renewal-reminders] Sent ${messages.length} push notifications to ${users.length} users.`);

    return NextResponse.json({
      sent: messages.length,
      usersNotified: users.filter((u) => u.licenses.length > 0).length,
    });
  } catch (error) {
    console.error("[renewal-reminders] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
