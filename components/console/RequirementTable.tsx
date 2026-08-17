"use client";

import { useState, type ReactNode } from "react";

/**
 * Requirement table (1b compliance screen): REQUIREMENT / RULE / PROGRESS /
 * STATUS. Rows render exactly like the design's flat table; rows that carry a
 * `detail` node expand on click (attestation, sources, course matches), so no
 * machinery was lost moving off the old accordion. Detail content is
 * server-rendered and passed in — expanding is pure disclosure, no fetching.
 */
export interface RequirementRow {
  key: string;
  name: string;
  /** Second line under the name — the requirement's own description */
  note?: string | null;
  /** Mono source line, e.g. "Source: Medical Board of California · verified Jul 12, 2026" */
  srcLine?: string | null;
  /** Mono rule cell, lowercase: "per cycle", "one-time", "every 4 yrs", "conditional" */
  rule: string;
  /** Mono progress fraction, e.g. "32.0 / 50" — "n/a" for attestation-only rows */
  hrsLabel: string;
  /** 0–100 */
  pct: number;
  barTone: "met" | "open" | "none";
  /** Uppercased by CSS: "Met", "Open", "On pace", "Needs input", "N/A" */
  status: string;
  statusTone: "met" | "open" | "muted";
  defaultOpen?: boolean;
  /** Aha-moment scroll target (first unmet gap) */
  isScrollTarget?: boolean;
  detail?: ReactNode;
}

export default function RequirementTable({ rows }: { rows: RequirementRow[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      rows.filter((r) => r.defaultOpen && r.detail).map((r) => [r.key, true])
    )
  );

  return (
    <div className="rt">
      <div className="rt-band" aria-hidden="true">
        <span>Requirement</span>
        <span>Rule</span>
        <span>Progress</span>
        <span className="r">Status</span>
      </div>
      {rows.map((row) => {
        const isOpen = !!row.detail && !!open[row.key];
        const cells = (
          <>
            <span className="rt-cell-name">
              <span className="rt-name">{row.name}</span>
              {row.note && <span className="rt-note">{row.note}</span>}
              {row.srcLine && <span className="rt-src">{row.srcLine}</span>}
            </span>
            <span className="rt-rule">{row.rule}</span>
            <span className="rt-prog">
              <span className="num">{row.hrsLabel}</span>
              <span className="rt-bar" aria-hidden="true">
                {row.barTone !== "none" && (
                  <span
                    className={row.barTone}
                    style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }}
                  />
                )}
              </span>
            </span>
            <span className={`rt-status ${row.statusTone}`}>{row.status}</span>
          </>
        );

        return (
          <div
            key={row.key}
            {...(row.isScrollTarget ? { "data-gap-card": "true", tabIndex: -1 } : {})}
          >
            {row.detail ? (
              <button
                type="button"
                className="rt-row"
                aria-expanded={isOpen}
                onClick={() => setOpen((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
              >
                {cells}
              </button>
            ) : (
              <div className="rt-row">{cells}</div>
            )}
            {isOpen && <div className="rt-detail">{row.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}
