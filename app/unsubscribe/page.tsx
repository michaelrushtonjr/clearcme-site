import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email Preferences — ClearCME",
};

/**
 * One-click unsubscribe landing page (no login required — token-based).
 * Turns off all reminder emails for the matching EmailPreference row.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let status: "done" | "invalid" = "invalid";
  if (token) {
    const result = await prisma.emailPreference.updateMany({
      where: { unsubscribeToken: token },
      data: { renewalReminders: false, monthlyDigest: false },
    });
    if (result.count > 0) status = "done";
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="product-card max-w-md w-full p-8 text-center">
        {status === "done" ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-[var(--ink)] mb-3">
              You&apos;re unsubscribed
            </h1>
            <p className="text-sm text-[var(--ink-2)] mb-6">
              You won&apos;t receive renewal reminders or monthly compliance digests by email.
              Your compliance tracking continues unchanged in your dashboard, and you can
              re-enable emails anytime in Settings.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-[var(--ink)] mb-3">
              Link not recognized
            </h1>
            <p className="text-sm text-[var(--ink-2)] mb-6">
              This unsubscribe link is invalid or has already been replaced. You can manage
              all email preferences from Settings.
            </p>
          </>
        )}
        <Link href="/dashboard/settings" className="product-btn product-btn-brand">
          Open Settings →
        </Link>
      </div>
    </div>
  );
}
