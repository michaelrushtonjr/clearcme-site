import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { MobileAuthError } from "@/lib/mobile-identity";
import { isEmailConfigured, renderSignInCodeEmail, sendEmail } from "@/lib/email";

const CODE_TTL_MS = 10 * 60_000;
const RESEND_GAP_MS = 30_000;
const WINDOW_MS = 15 * 60_000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

const hashCode = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");
const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * App Review needs credentials that work without an inbox. When both env vars
 * are set, that one address signs in with the fixed code; it must already exist
 * as a (seeded, fictional) account. Unset either variable to switch it off.
 */
function reviewAccount(): { email: string; code: string } | null {
  const email = normalizeEmail(process.env.REVIEW_DEMO_EMAIL);
  const code = process.env.REVIEW_DEMO_CODE?.trim();
  return email && code && code.length >= 8 ? { email, code } : null;
}

export async function startEmailSignIn(email: string, now = new Date()) {
  if (reviewAccount()?.email === email) return;
  if (!isEmailConfigured()) throw new MobileAuthError("Email sign-in isn't available right now. Use Apple or Google.", 503);

  const existing = await prisma.mobileEmailCode.findUnique({ where: { email } });
  const inWindow = existing && now.getTime() - existing.windowStart.getTime() < WINDOW_MS;
  if (existing && now.getTime() - existing.lastSentAt.getTime() < RESEND_GAP_MS) throw new MobileAuthError("We just sent a code. Give it a moment, then try again.", 429);
  if (inWindow && existing.sendCount >= MAX_SENDS_PER_WINDOW) throw new MobileAuthError("Too many codes requested. Try again in 15 minutes.", 429);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const data = {
    codeHash: hashCode(email, code), expires: new Date(now.getTime() + CODE_TTL_MS), attempts: 0, lastSentAt: now,
    sendCount: inWindow ? existing.sendCount + 1 : 1, windowStart: inWindow ? existing.windowStart : now,
  };
  await prisma.mobileEmailCode.upsert({ where: { email }, create: { email, ...data }, update: data });

  const { subject, html } = renderSignInCodeEmail({ code });
  const sent = await sendEmail({ to: email, subject, html });
  if (!sent.ok) {
    console.error("[mobile-email] Sign-in code email failed to send");
    throw new MobileAuthError("We couldn't send the email. Try again, or use Apple or Google.", 502);
  }
}

/** Verifies the code and returns the (possibly new) user. Codes are single-use. */
export async function verifyEmailSignIn(email: string, code: string, now = new Date()) {
  const review = reviewAccount();
  if (review?.email === email) return verifyReviewAccount(review, code, now);
  if (!/^\d{6}$/.test(code)) throw new MobileAuthError("That code isn't right. Check the email and try again.", 401);

  return prisma.$transaction(async (tx) => {
    const row = await tx.mobileEmailCode.findUnique({ where: { email } });
    if (!row || row.expires <= now || row.attempts >= MAX_ATTEMPTS) throw new MobileAuthError("That code has expired. Request a new one.", 401);
    if (!safeEqual(row.codeHash, hashCode(email, code))) {
      // Committed by returning a marker instead of throwing inside the transaction.
      await tx.mobileEmailCode.update({ where: { email }, data: { attempts: { increment: 1 } } });
      return null;
    }
    // Spend the code without dropping the send-rate window.
    const spent = await tx.mobileEmailCode.updateMany({ where: { email, codeHash: row.codeHash, expires: { gt: now } }, data: { expires: now, attempts: MAX_ATTEMPTS } });
    if (spent.count !== 1) throw new MobileAuthError("That code has expired. Request a new one.", 401);
    const existing = await tx.user.findUnique({ where: { email } });
    return existing
      ? tx.user.update({ where: { id: existing.id }, data: { lastLoginAt: now, emailVerified: existing.emailVerified ?? now } })
      : tx.user.create({ data: { email, emailVerified: now, lastLoginAt: now } });
  }).then((user) => {
    if (!user) throw new MobileAuthError("That code isn't right. Check the email and try again.", 401);
    return user;
  });
}

async function verifyReviewAccount(review: { email: string; code: string }, code: string, now: Date) {
  const row = await prisma.mobileEmailCode.findUnique({ where: { email: review.email } });
  const locked = row && row.expires > now && row.attempts >= 10;
  if (locked) throw new MobileAuthError("Too many attempts. Try again in 15 minutes.", 429);
  if (!safeEqual(code, review.code)) {
    const fresh = !row || row.expires <= now;
    const data = { codeHash: "review", expires: fresh ? new Date(now.getTime() + WINDOW_MS) : row.expires, attempts: fresh ? 1 : row.attempts + 1 };
    await prisma.mobileEmailCode.upsert({ where: { email: review.email }, create: { email: review.email, ...data }, update: data });
    throw new MobileAuthError("That code isn't right. Check the email and try again.", 401);
  }
  const user = await prisma.user.findUnique({ where: { email: review.email } });
  if (!user) throw new MobileAuthError("That code isn't right. Check the email and try again.", 401);
  if (row) await prisma.mobileEmailCode.update({ where: { email: review.email }, data: { attempts: 0 } });
  return prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
}
