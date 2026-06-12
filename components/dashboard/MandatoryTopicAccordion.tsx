"use client";

import { useState, type ReactNode } from "react";

export interface TopicAccordionRow {
  key: string;
  /** Always-visible one-line summary (status icon · name · hours · chip) */
  summary: ReactNode;
  /** Server-rendered detail content revealed on expand */
  details: ReactNode;
  defaultOpen?: boolean;
  /** Marks the aha-moment scroll target (first unmet gap) */
  isScrollTarget?: boolean;
  /** Tone classes for the row container, e.g. status background/border */
  toneClassName?: string;
}

/**
 * Collapses the Mandatory Topics list to one-line rows. Detail content is
 * rendered on the server and passed in as children, so expanding is instant —
 * no fetching, just disclosure. The row matching the next-action
 * recommendation starts open.
 */
export default function MandatoryTopicAccordion({ rows }: { rows: TopicAccordionRow[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.filter((r) => r.defaultOpen).map((r) => [r.key, true]))
  );

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const isOpen = !!open[row.key];
        return (
          <div
            key={row.key}
            {...(row.isScrollTarget ? { "data-gap-card": "true", tabIndex: -1 } : {})}
            className={`rounded-[var(--radius)] border ${row.toneClassName ?? "bg-[var(--paper)] border-[var(--line)]"}`}
          >
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[52px]"
            >
              <div className="flex-1 min-w-0">{row.summary}</div>
              <svg
                className={`w-4 h-4 flex-shrink-0 text-[var(--ink-3)] transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && <div className="px-4 pb-4">{row.details}</div>}
          </div>
        );
      })}
    </div>
  );
}
