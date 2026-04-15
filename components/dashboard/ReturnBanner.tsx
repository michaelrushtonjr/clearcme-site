"use client";

import { useEffect, useState } from "react";

interface ReturnBannerProps {
  lastLoginAt: string | null; // ISO string or null
  newCertsCount: number;
  renewalInfo: { state: string; daysAway: number } | null;
  newRequirementsCount: number;
}

const DISMISS_KEY = "clearcme_return_banner_dismissed";

function getDismissedUntil(): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return null;
  return parseInt(val, 10);
}

function setDismissed() {
  const until = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  localStorage.setItem(DISMISS_KEY, String(until));
}

function isBannerDismissed(): boolean {
  const until = getDismissedUntil();
  if (!until) return false;
  return Date.now() < until;
}

export default function ReturnBanner({
  lastLoginAt,
  newCertsCount,
  renewalInfo,
  newRequirementsCount,
}: ReturnBannerProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!lastLoginAt) return; // first visit — skip
    if (isBannerDismissed()) return;

    const last = new Date(lastLoginAt).getTime();
    const now = Date.now();
    const hoursAgo = (now - last) / (1000 * 60 * 60);

    if (hoursAgo < 24) return; // same session — skip

    setVisible(true);
  }, [lastLoginAt]);

  if (!mounted || !visible || !lastLoginAt) return null;

  const last = new Date(lastLoginAt);
  const now = Date.now();
  const daysAgo = (now - last.getTime()) / (1000 * 60 * 60 * 24);

  const dateLabel = last.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Determine urgency level
  let level: "blue" | "amber" | "red";
  let heading: string;

  if (daysAgo <= 7) {
    level = "blue";
    heading = `Welcome back — here's what's changed since ${dateLabel}`;
  } else if (daysAgo <= 30) {
    level = "amber";
    heading = `Welcome back — it's been ${Math.round(daysAgo)} days since your last visit`;
  } else {
    level = "red";
    heading = `It's been a while — your compliance status may have changed`;
  }

  const colorMap = {
    blue: {
      bg: "bg-teal-50",
      border: "border-teal-200",
      headingColor: "text-teal-900",
      bodyColor: "text-teal-800",
      dismissColor: "text-teal-500 hover:text-teal-700",
      bulletColor: "text-teal-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      headingColor: "text-amber-900",
      bodyColor: "text-amber-800",
      dismissColor: "text-amber-500 hover:text-amber-700",
      bulletColor: "text-amber-600",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      headingColor: "text-red-900",
      bodyColor: "text-red-800",
      dismissColor: "text-red-400 hover:text-red-600",
      bulletColor: "text-red-600",
    },
  };

  const colors = colorMap[level];

  const bullets: string[] = [];
  if (newCertsCount > 0) {
    bullets.push(
      `${newCertsCount} new certificate${newCertsCount === 1 ? "" : "s"} uploaded since your last visit`
    );
  }
  if (renewalInfo) {
    bullets.push(
      `Your ${renewalInfo.state} renewal is now ${renewalInfo.daysAway} day${renewalInfo.daysAway === 1 ? "" : "s"} away`
    );
  }
  if (newRequirementsCount > 0) {
    bullets.push(
      `${newRequirementsCount} new requirement${newRequirementsCount === 1 ? "" : "s"} added for your license${newRequirementsCount === 1 ? "" : "s"}`
    );
  }

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  return (
    <div
      className={`relative rounded-2xl border px-5 py-4 ${colors.bg} ${colors.border}`}
      role="status"
    >
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className={`absolute top-3 right-3 p-1 rounded-lg transition-colors ${colors.dismissColor}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 mt-0.5">
          {level === "blue" && (
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {level === "amber" && (
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
          {level === "red" && (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${colors.headingColor}`}>{heading}</p>
          {bullets.length > 0 && (
            <ul className={`mt-2 space-y-1 text-xs ${colors.bodyColor}`}>
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className={`mt-0.5 font-bold ${colors.bulletColor}`}>·</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {bullets.length === 0 && (
            <p className={`mt-1 text-xs ${colors.bodyColor}`}>
              Review your compliance map to make sure everything is current.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
