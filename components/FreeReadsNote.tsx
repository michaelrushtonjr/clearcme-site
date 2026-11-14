import Link from "next/link";
import type { FreeReads } from "@/lib/entitlements";

/** "2 of 3" — the count both wordings share. */
export function freeReadsCount(reads: FreeReads): string {
  return `${reads.left} of ${reads.limit}`;
}

/** Which limit card to show once no reads are left: the 3 clean reads, or the 10-scan backstop. */
export function freeReadsBlockReason(reads: FreeReads | null | undefined): false | "slots" | "attempts" {
  if (!reads || reads.left > 0) return false;
  return reads.used >= reads.limit ? "slots" : "attempts";
}

/**
 * How many certificate reads a limited account has left, shown before the
 * physician uploads and updated after each read. Renders nothing for accounts
 * with unlimited reads (paid or grandfathered).
 */
export default function FreeReadsNote({ reads }: { reads: FreeReads | null | undefined }) {
  if (!reads) return null;
  const count = freeReadsCount(reads);

  return (
    <div
      role="status"
      className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 text-left text-sm text-[var(--ink-2)]"
    >
      {/* In the iPhone app: the count only — no plan name, price or place to buy. */}
      <strong className="app-hide font-semibold text-[var(--ink)]">{count} free certificate reads left.</strong>
      <strong className="app-only font-semibold text-[var(--ink)]">{count} certificate reads left on your current plan.</strong>{" "}
      {reads.left > 0 ? (
        <>
          A read is used only when a certificate is read cleanly. You can always{" "}
          <Link href="/dashboard/certificates/new" className="font-medium text-[var(--primary)] underline underline-offset-2">
            add CME by hand
          </Link>
          .
        </>
      ) : (
        <>
          You can still{" "}
          <Link href="/dashboard/certificates/new" className="font-medium text-[var(--primary)] underline underline-offset-2">
            add CME by hand
          </Link>
          , as much as you like.
        </>
      )}
    </div>
  );
}
