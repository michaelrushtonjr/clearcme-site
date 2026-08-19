"use client";

import { useState } from "react";

export interface PaceDeadline {
  /** e.g. "New York" or "DEA" */
  label: string;
  date: string; // ISO
  dateLabel: string; // "Sep 30, 2027"
}

/**
 * Pace planner (1b dashboard right rail). Pure client arithmetic:
 * finish = now + ceil(remainingHrs / pace) months, verdict computed against
 * the user's real deadline list (soonest first).
 */
/** Whole calendar months from now until `date` (floor), minimum 1 — the same
 * add-a-month convention the finish math uses, so a pace derived from it
 * can't land one `ceil` past the deadline. */
function monthsUntil(date: Date): number {
  const now = new Date();
  let m = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  if (date.getDate() < now.getDate()) m -= 1;
  return Math.max(1, m);
}

const roundUpHalf = (n: number) => Math.ceil(n * 2) / 2;

export default function PacePlanner({
  remainingHours,
  deadlines,
}: {
  remainingHours: number;
  deadlines: PaceDeadline[];
}) {
  // Required pace targets the EARLIEST deadline — clearing that clears
  // everything, so the slider opens on a passing plan instead of the old
  // fixed 2.0 (which opened "Too slow" for any real gap). Rounded UP to the
  // 0.5 step: nearest-rounding can open one month past the deadline.
  const requiredPerMonth = (() => {
    if (remainingHours <= 0 || deadlines.length === 0) return 0;
    const earliest = deadlines
      .map((d) => new Date(d.date))
      .sort((a, b) => +a - +b)[0];
    return remainingHours / monthsUntil(earliest);
  })();

  const [pace, setPace] = useState(() =>
    requiredPerMonth > 0 ? roundUpHalf(requiredPerMonth) : 2
  );

  if (remainingHours <= 0 || deadlines.length === 0) return null;

  // A gap the old fixed 6.0 cap couldn't express now stretches the range:
  // headroom to 1.5x the required pace, so "faster than needed" stays
  // reachable at every gap size.
  const sliderMax = Math.max(6, roundUpHalf(requiredPerMonth * 1.5));

  const months = Math.ceil(remainingHours / pace);
  const finish = new Date();
  finish.setMonth(finish.getMonth() + months);
  const finishLabel = finish.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const sorted = [...deadlines].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const last = sorted[sorted.length - 1];
  const cleared = sorted.filter((d) => finish <= new Date(d.date));
  const slipped = sorted.filter((d) => finish > new Date(d.date));

  let tone: "ok" | "warn" | "bad";
  let message: string;
  if (slipped.length === 0) {
    tone = "ok";
    message = `Everything closes before ${sorted[0].label} on ${sorted[0].dateLabel} — your earliest deadline.`;
  } else if (cleared.length === 0) {
    tone = "bad";
    message = "Too slow — every deadline slips.";
  } else {
    tone = "warn";
    const slippedNames = slipped.map((d) => d.label).join(" and ");
    const clearedNames = cleared.map((d) => d.label).join(" and ");
    message = `${slippedNames} slips past ${slipped[0].dateLabel}. ${clearedNames} still clear${cleared.length === 1 ? "s" : ""}.`;
  }

  return (
    <section className="pace-card">
      <div className="head">
        <span className="mono-label l">Pace planner</span>
        <span className="r">{remainingHours.toFixed(1)} hrs left</span>
      </div>
      <div className="pace-val">
        <span className="num">{pace.toFixed(1)}</span>
        <span className="unit">hours / month</span>
      </div>
      <input
        type="range"
        min={0.5}
        max={sliderMax}
        step={0.5}
        value={pace}
        onChange={(e) => setPace(Number(e.target.value))}
        aria-label="CME hours per month"
      />
      <div className="divider" />
      <p className="finish">You&apos;d finish {finishLabel}</p>
      <p className="last-deadline">
        Last deadline — {last.dateLabel}
      </p>
      <div className={`verdict ${tone}`} role="status">
        {message}
      </div>
      <p className="disclaimer">
        A planning estimate from the hours you&apos;ve filed. You&apos;re always responsible for
        what your board requires.
      </p>
    </section>
  );
}
