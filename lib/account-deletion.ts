import { del, list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { revokeAppleRefreshToken } from "@/lib/apple-tokens";

export class AccountDeletionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export interface AccountDeletionDeps {
  cancelSubscription(stripeSubId: string): Promise<void>;
  deleteStoredDocuments(userId: string, knownUrls: string[]): Promise<number>;
  sendConfirmation(email: string): Promise<void>;
  /** Best-effort Sign in with Apple revocation; resolves to how many tokens Apple confirmed. */
  revokeAppleAccess(refreshTokens: string[]): Promise<number>;
}

/** Cancels immediately. An already-canceled or vanished subscription counts as success. */
async function cancelStripeSubscription(stripeSubId: string) {
  const stripe = getStripe();
  try {
    await stripe.subscriptions.cancel(stripeSubId);
  } catch (error) {
    if ((error as { code?: string }).code === "resource_missing") return;
    const current = await stripe.subscriptions.retrieve(stripeSubId);
    if (current.status !== "canceled") throw error;
  }
}

/** Removes every private blob under the user's prefixes, plus any URL a row still points at. */
async function deleteUserBlobs(userId: string, knownUrls: string[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (knownUrls.length) throw new Error("Document storage is not configured");
    return 0;
  }
  const urls = new Set(knownUrls);
  for (const prefix of [`certificates/${encodeURIComponent(userId)}/`, `audit-exports/${userId}/`]) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const blob of page.blobs) urls.add(blob.url);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  const all = [...urls];
  for (let i = 0; i < all.length; i += 100) await del(all.slice(i, i + 100));
  return all.length;
}

async function sendDeletionEmail(email: string) {
  await sendEmail({
    to: email,
    subject: "Your ClearCME account has been deleted",
    html: `<p>Your ClearCME account and the records in it — licenses, certificates, uploaded documents, and compliance history — have been permanently deleted. Any active subscription was canceled and will not renew.</p><p>If you didn't request this, reply to this email or write to hello@clearcme.ai right away.</p><p>— ClearCME</p>`,
  });
}

async function revokeAppleTokens(refreshTokens: string[]) {
  const results = await Promise.all(refreshTokens.map((token) => revokeAppleRefreshToken(token)));
  return results.filter(Boolean).length;
}

const defaultDeps: AccountDeletionDeps = {
  cancelSubscription: cancelStripeSubscription,
  deleteStoredDocuments: deleteUserBlobs,
  sendConfirmation: sendDeletionEmail,
  revokeAppleAccess: revokeAppleTokens,
};

/**
 * Permanently deletes an account. Order matters and every step is safe to
 * repeat: billing stops first (so nobody is charged for a deleted account),
 * stored documents go next (while rows still point at them), and the user row
 * goes last — its cascade removes licenses, certificates, completions,
 * sessions, linked sign-in methods, and email history.
 */
export async function deleteAccount(userId: string, deps: AccountDeletionDeps = defaultDeps) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      subscription: { select: { stripeSubId: true } },
      certificates: { select: { fileUrl: true } },
      accounts: { where: { provider: "apple", refresh_token: { not: null } }, select: { refresh_token: true } },
    },
  });
  if (!user) throw new AccountDeletionError("Account not found.", 404);

  if (user.subscription?.stripeSubId) {
    try {
      await deps.cancelSubscription(user.subscription.stripeSubId);
    } catch {
      console.error("[account] Subscription cancel failed; nothing deleted", { userId });
      throw new AccountDeletionError("We couldn't cancel your subscription, so nothing was deleted. Try again in a minute, or email hello@clearcme.ai.", 502);
    }
  }

  const knownUrls = user.certificates.flatMap((certificate) => (certificate.fileUrl ? [certificate.fileUrl] : []));
  let documentsRemoved = 0;
  try {
    documentsRemoved = await deps.deleteStoredDocuments(userId, knownUrls);
  } catch {
    console.error("[account] Stored-document removal failed; account rows kept for retry", { userId });
    throw new AccountDeletionError("We couldn't remove your stored documents, so your account was not deleted. Try again in a minute, or email hello@clearcme.ai.", 503);
  }

  // The tokens disappear with the rows, so revoke while we still hold them.
  const appleTokens = user.accounts.flatMap((account) => (account.refresh_token ? [account.refresh_token] : []));
  if (appleTokens.length) {
    try { await deps.revokeAppleAccess(appleTokens); }
    catch { console.error("[account] Apple token revocation failed; deletion continues", { userId }); }
  }

  await prisma.$transaction(async (tx) => {
    const identifiers = [`mobile-session:${userId}`];
    if (user.email) identifiers.push(user.email);
    await tx.verificationToken.deleteMany({ where: { identifier: { in: identifiers } } });
    if (user.email) await tx.mobileEmailCode.deleteMany({ where: { email: user.email.toLowerCase() } });
    await tx.user.delete({ where: { id: userId } });
  });

  console.info("[account] Account deleted", { userId, documentsRemoved });
  if (user.email) {
    try { await deps.sendConfirmation(user.email); }
    catch { console.error("[account] Deletion confirmation email failed", { userId }); }
  }
  return { documentsRemoved };
}
