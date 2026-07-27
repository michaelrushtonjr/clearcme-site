import { NextRequest, NextResponse } from "next/server";
import { isEmailConfigured, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/apple-secret-check
 * Vercel Cron, daily. Apple's Sign in with Apple client secret is a JWT that
 * Apple caps at 6 months of validity — when it lapses, "Continue with Apple"
 * fails silently with error=Configuration. This decodes the JWT's own exp
 * claim and emails an alert at 30/21/14 days out, then daily from 7 days out
 * (and daily after expiry until rotated).
 *
 * Note: Vercel Cron invokes with GET and sends `Authorization: Bearer
 * ${CRON_SECRET}` automatically when the env var is set.
 */

const ALERT_TO = process.env.APPLE_SECRET_ALERT_EMAIL ?? "michaelrushtonjr@gmail.com";
const MARKER_DAYS = [30, 21, 14] as const;
const DAILY_FROM_DAYS = 7;

function decodeJwtExp(jwt: string): number | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function alertHtml(daysLeft: number, expiresAt: string) {
  const status =
    daysLeft < 0
      ? `<strong style="color:#b91c1c">Apple sign-in is DOWN — the client secret expired ${-daysLeft} day(s) ago (${expiresAt}).</strong>`
      : `The Apple sign-in client secret expires in <strong>${daysLeft} day(s)</strong> (${expiresAt}).`;
  return `
    <p>${status}</p>
    <p>To rotate it:</p>
    <ol>
      <li>Apple Developer portal → Certificates, Identifiers &amp; Profiles → Keys — use the existing Sign in with Apple key (.p8) or create one.</li>
      <li>Generate a fresh client-secret JWT (ES256, max 6-month expiry) for the Services ID used by clearcme.ai.</li>
      <li>Update <code>AUTH_APPLE_SECRET</code> in Vercel env → redeploy.</li>
    </ol>
    <p>This alert comes from the daily <code>/api/cron/apple-secret-check</code> job.</p>`;
}

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.AUTH_APPLE_SECRET;
  const appleEnabled = !!(process.env.AUTH_APPLE_ID && secret);

  if (!appleEnabled) {
    return NextResponse.json({ ok: true, skipped: "Apple sign-in not configured" });
  }

  const exp = decodeJwtExp(secret!);
  if (exp === null) {
    // A secret that isn't a decodable JWT will fail at Apple's token exchange.
    if (isEmailConfigured()) {
      await sendEmail({
        to: ALERT_TO,
        subject: "ClearCME: AUTH_APPLE_SECRET is not a valid JWT",
        html: `<p>The <code>AUTH_APPLE_SECRET</code> env var could not be decoded as a JWT, so Apple sign-in is likely broken. Rotate it via the Apple Developer portal and update Vercel env.</p>`,
      });
    }
    return NextResponse.json({ ok: false, error: "AUTH_APPLE_SECRET is not a decodable JWT" });
  }

  const expiresAt = new Date(exp * 1000).toISOString().slice(0, 10);
  const daysLeft = Math.floor((exp * 1000 - Date.now()) / 86_400_000);
  const shouldAlert =
    daysLeft <= DAILY_FROM_DAYS || (MARKER_DAYS as readonly number[]).includes(daysLeft);

  let alerted = false;
  if (shouldAlert && isEmailConfigured()) {
    const subject =
      daysLeft < 0
        ? "ClearCME: Apple sign-in is DOWN — client secret expired"
        : `ClearCME: Apple sign-in secret expires in ${daysLeft} day(s)`;
    const result = await sendEmail({ to: ALERT_TO, subject, html: alertHtml(daysLeft, expiresAt) });
    alerted = result.ok;
  }

  return NextResponse.json({ ok: daysLeft > 0, daysLeft, expiresAt, alerted });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
