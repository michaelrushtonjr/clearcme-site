/**
 * NextActionCard
 *
 * Headline element on the dashboard. Surfaces the single most useful
 * next move the user could make right now.
 *
 * Selection logic (server-side):
 *   1. Past-due requirement → always wins
 *   2. Topic gap whose chosen course closes the most other gaps
 *   3. Next deadline-soonest topic
 *   4. Fully compliant → render AuditReadyCard instead
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface NextActionCardProps {
  title: React.ReactNode;
  body: React.ReactNode;
  ctaHref: string;
  ctaLabel?: string;
  source?: string;
  onDismiss?: () => void;
  eyebrow?: string;
}

export function NextActionCard({
  title,
  body,
  ctaHref,
  ctaLabel = "View course",
  source,
  onDismiss,
  eyebrow = "Your most useful next move",
}: NextActionCardProps) {
  return (
    <section
      aria-labelledby="next-action-title"
      className="product-callout-ink p-5 sm:p-7"
    >
      <div className="product-callout-eye mb-2.5">
        {eyebrow}
      </div>

      <h2
        id="next-action-title"
        className="font-display text-xl font-semibold leading-tight tracking-tight text-[var(--ink)] mb-2 sm:text-2xl"
      >
        {title}
      </h2>

      <p className="text-sm text-[var(--ink-2)] leading-relaxed max-w-2xl">{body}</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={ctaHref}
          className="product-btn product-btn-brand w-full sm:w-auto"
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </Link>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="product-btn product-btn-secondary px-4"
          >
            Dismiss for today
          </button>
        )}

        {source && (
          <span className="text-xs text-[var(--ink-3)] sm:ml-auto sm:text-right">{source}</span>
        )}
      </div>
    </section>
  );
}

export function AuditReadyCard() {
  return (
    <section
      aria-labelledby="audit-ready-title"
      className="product-callout-brand p-6 flex items-center gap-5"
    >
      <div className="w-10 h-10 rounded-[var(--radius)] shrink-0 grid place-items-center bg-[rgba(63,95,51,0.12)] text-[var(--primary)]">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <h3 id="audit-ready-title" className="font-display text-lg font-semibold text-[var(--ink)]">
          You&apos;re done for this cycle.
        </h3>
        <p className="text-sm text-[var(--ink-2)] mt-0.5 leading-snug">
          Your audit package is ready. We&apos;ll keep watching for rule changes and surface anything that affects you.
        </p>
      </div>
    </section>
  );
}
