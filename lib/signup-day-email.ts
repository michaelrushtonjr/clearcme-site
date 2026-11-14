import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getComplianceSnapshot } from "@/lib/compliance-snapshot";
import { isEmailConfigured, renderSignupDayEmail, sendEmail } from "@/lib/email";
import { deliverEmail } from "@/lib/email-delivery";
import { getOrCreateEmailPreference, unsubscribeUrlFor } from "@/lib/email-preferences";

/**
 * Signup-day email: one message when a new account finishes setup, with days
 * left to renewal and what is still open.
 *
 * OFF by default. It sends only when the environment variable
 * SIGNUP_DAY_EMAIL_ENABLED is exactly "true"; unset, empty or any other value
 * sends nothing and runs no queries.
 *
 * Trigger: the dashboard's first load after setup (/dashboard?onboarded=1).
 * That is the one moment every finished setup reaches, and it comes after the
 * practice questions (DEA registration and the like) are stored, so the email
 * never asks for an answer the physician gave seconds earlier.
 *
 * Once per account, ever: EmailLog.dedupeKey "signup-day:<userId>" is unique,
 * and deliverEmail claims it atomically, so a refresh or a second tab cannot
 * send a second copy. No schema change: EmailLog.kind is free text.
 */
export const SIGNUP_DAY_EMAIL_KIND = "SIGNUP_DAY";

// "Signup day" allows for signing up one evening and finishing setup the next.
export const SIGNUP_DAY_WINDOW_HOURS = 48;

export function signupDayEmailEnabled(): boolean {
  return process.env.SIGNUP_DAY_EMAIL_ENABLED === "true";
}

export function signupDayDedupeKey(userId: string): string {
  return `signup-day:${userId}`;
}

export type SignupDayOutcome =
  | "disabled"
  | "email_not_configured"
  | "no_address"
  | "outside_window"
  | "already_sent"
  | "opted_out"
  | "no_license"
  | "sent"
  | "deduped"
  | "failed";

export async function sendSignupDayEmail(userId: string, now: Date = new Date()): Promise<SignupDayOutcome> {
  if (!signupDayEmailEnabled()) return "disabled";
  if (!isEmailConfigured()) return "email_not_configured";

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, createdAt: true } });
  if (!user?.email) return "no_address";
  if (now.getTime() - user.createdAt.getTime() > SIGNUP_DAY_WINDOW_HOURS * 3_600_000) return "outside_window";

  const dedupeKey = signupDayDedupeKey(userId);
  const previous = await prisma.emailLog.findUnique({ where: { dedupeKey }, select: { status: true } });
  if (previous?.status === "SENT") return "already_sent";

  // Same switch as the renewal reminders: Settings and the unsubscribe link both turn it off.
  const preference = await getOrCreateEmailPreference(userId);
  if (!preference.renewalReminders) return "opted_out";

  const snapshot = await getComplianceSnapshot(userId);
  if (!snapshot || snapshot.licenses.length === 0) return "no_license";

  const delivery = await deliverEmail(
    { userId, kind: SIGNUP_DAY_EMAIL_KIND, dedupeKey, cycleKey: dedupeKey },
    async () => {
      const unsubscribeUrl = unsubscribeUrlFor(preference.unsubscribeToken);
      const { subject, html, text } = renderSignupDayEmail({
        firstName: snapshot.firstName,
        licenses: snapshot.licenses,
        unsubscribeUrl,
      });
      const sent = await sendEmail({ to: snapshot.email, subject, html, text, unsubscribeUrl });
      if (!sent.ok) throw new Error(sent.error ?? "Email delivery failed");
    },
  );
  return delivery.status;
}

/**
 * Queue the email behind the response. Never slows or fails the page that
 * calls it; with the flag off it returns before scheduling anything.
 */
export function scheduleSignupDayEmail(userId: string): void {
  if (!signupDayEmailEnabled()) return;
  const run = async () => {
    try {
      const outcome = await sendSignupDayEmail(userId);
      if (outcome === "failed") console.warn("[signup-day-email] delivery failed; see EmailLog");
    } catch {
      console.warn("[signup-day-email] not sent");
    }
  };
  try {
    after(run);
  } catch {
    // Called outside a request (a script or a test): run without waiting.
    void run();
  }
}
