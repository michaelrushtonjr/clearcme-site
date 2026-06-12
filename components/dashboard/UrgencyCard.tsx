"use client";

import Link from "next/link";
import type { NextActionRecommendation, NextActionTheme } from "@/lib/next-action";

/**
 * UrgencyCard — Compliance Map's rendering of the shared next-action engine.
 * All selection logic lives in lib/next-action.ts so the dashboard and the
 * Compliance Map always recommend the same thing.
 */

function themeClasses(theme: NextActionTheme) {
  switch (theme) {
    case "red":
      return {
        wrapper: "bg-[rgba(221,107,64,0.12)] border-[rgba(221,107,64,0.34)]",
        icon: "bg-[var(--status-miss-bg)] text-[var(--status-miss)]",
        headline: "text-[var(--ink)]",
        body: "text-[var(--ink-2)]",
        cta: "product-btn product-btn-urgent",
      };
    case "amber":
      return {
        wrapper: "product-callout-warm",
        icon: "bg-[var(--status-pending-bg)] text-[var(--status-pending)]",
        headline: "text-[var(--ink)]",
        body: "text-[var(--ink-2)]",
        // Brand CTA: one-time requirements are important but not deadline-urgent.
        // Orange is reserved for renewal <90 days (red theme).
        cta: "product-btn product-btn-brand",
      };
    case "blue":
    case "green":
      return {
        wrapper: "product-callout-brand",
        icon:
          theme === "green"
            ? "bg-[var(--status-met-bg)] text-[var(--status-met)]"
            : "bg-[rgba(63,95,51,0.12)] text-[var(--primary)]",
        headline: "text-[var(--ink)]",
        body: "text-[var(--ink-2)]",
        cta: "product-btn product-btn-brand",
      };
  }
}

export default function UrgencyCard({ rec }: { rec: NextActionRecommendation }) {
  const t = themeClasses(rec.theme);

  return (
    <div className={`w-full rounded-2xl border ${t.wrapper} p-5`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${t.icon}`}
        >
          {rec.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="product-callout-eye mb-1">
            Your Next Action
          </p>
          <h2 className={`font-display font-semibold text-xl leading-snug ${t.headline}`}>
            {rec.headline}
          </h2>
          <p className={`text-sm mt-1 ${t.body} opacity-80`}>{rec.explanation}</p>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          {rec.ctaExternal ? (
            <a
              href={rec.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={t.cta}
            >
              {rec.ctaLabel}
            </a>
          ) : (
            <Link
              href={rec.ctaUrl}
              className={t.cta}
            >
              {rec.ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
