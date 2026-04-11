"use client";

import { useEffect, useRef, useState } from "react";

interface MandatoryTopicBreakdown {
  topic: string;
  hoursNeeded: number;
}

interface LicenseBreakdown {
  state: string;
  licenseType: string;
  generalHoursNeeded: number;
  mandatoryGapHours: number;
  mandatoryPendingCount: number;
  mandatoryTopics: MandatoryTopicBreakdown[];
}

interface HoursNeededTileProps {
  totalHoursStillNeeded: number;
  hasData: boolean;
  licenses: LicenseBreakdown[];
}

export default function HoursNeededTile({
  totalHoursStillNeeded,
  hasData,
  licenses,
}: HoursNeededTileProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => hasData && setOpen(!open)}
        className="w-full text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all min-h-[44px]"
        aria-expanded={open}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Hours Still Needed
        </p>
        {hasData ? (
          <>
            <p
              className={`text-2xl font-bold ${
                totalHoursStillNeeded === 0 ? "text-green-600" : "text-amber-600"
              }`}
            >
              {totalHoursStillNeeded.toFixed(1)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalHoursStillNeeded === 0 ? "all clear ✓" : "tap for breakdown ↓"}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-300">—</p>
            <p className="text-xs text-slate-400 mt-0.5">add a license</p>
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900">Hours Breakdown</p>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1"
              aria-label="Close"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {licenses.length === 0 ? (
            <p className="text-xs text-slate-400">No compliance data available.</p>
          ) : (
            licenses.map((lic, i) => (
              <div
                key={i}
                className={i > 0 ? "mt-3 pt-3 border-t border-slate-100" : ""}
              >
                <p className="text-xs font-semibold text-slate-700 mb-1.5">
                  {lic.state} — {lic.licenseType}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">General hours needed</span>
                    <span className="font-medium text-slate-700">
                      {lic.generalHoursNeeded.toFixed(1)} hrs
                    </span>
                  </div>
                  {lic.mandatoryPendingCount > 0 && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Mandatory topics pending</span>
                        <span className="font-medium text-amber-600">
                          {lic.mandatoryGapHours.toFixed(1)} hrs (
                          {lic.mandatoryPendingCount} topic
                          {lic.mandatoryPendingCount !== 1 ? "s" : ""})
                        </span>
                      </div>
                      {lic.mandatoryTopics
                        .filter((t) => t.hoursNeeded > 0)
                        .map((topic, j) => (
                          <div
                            key={j}
                            className="flex justify-between text-xs pl-3 text-slate-400"
                          >
                            <span>• {topic.topic}</span>
                            <span>{topic.hoursNeeded.toFixed(1)} hrs</span>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
