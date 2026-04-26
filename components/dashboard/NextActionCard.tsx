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
import { ArrowRight, Sparkles } from "lucide-react";

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
      className="relative overflow-hidden rounded-card border border-brand-tealRule bg-gradient-to-b from-[#FCFBF6] to-brand-paper p-7 shadow-card-2"
    >
      {/* Teal left rule */}
      <div className="absolute inset-y-0 left-0 w-1 bg-brand-teal" aria-hidden />

      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-teal mb-2.5">
        <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
        {eyebrow}
      </div>

      <h2
        id="next-action-title"
        className="font-display text-2xl font-semibold leading-tight tracking-tight text-brand-navy mb-2"
      >
        {title}
      </h2>

      <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{body}</p>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-teal hover:bg-brand-tealDeep px-4 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </Link>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:text-brand-navy hover:bg-brand-paperSoft transition-colors"
          >
            Dismiss for today
          </button>
        )}

        {source && (
          <span className="ml-auto text-xs text-slate-400">{source}</span>
        )}
      </div>
    </section>
  );
}

export function AuditReadyCard() {
  return (
    <section
      aria-labelledby="audit-ready-title"
      className="rounded-card border border-brand-tealRule bg-brand-paper p-6 flex items-center gap-5"
    >
      <div className="w-10 h-10 rounded-lg shrink-0 grid place-items-center bg-brand-tealTint text-brand-teal">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <h3 id="audit-ready-title" className="text-sm font-semibold text-brand-navy">
          You&apos;re done for this cycle.
        </h3>
        <p className="text-sm text-slate-500 mt-0.5 leading-snug">
          Your audit package is ready. We&apos;ll keep watching for rule changes and surface anything that affects you.
        </p>
      </div>
    </section>
  );
}
