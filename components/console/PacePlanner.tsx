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
export default function PacePlanner({
  remainingHours,
  deadlines,
}: {
  remainingHours: number;
  deadlines: PaceDeadline[];
}) {
  const [pace, setPace] = useState(2);

  if (remainingHours <= 0 || deadlines.length === 0) return null;

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
        max={6}
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
