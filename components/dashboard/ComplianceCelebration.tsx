"use client";

import { useState, useEffect } from "react";
import AuditExportButton from "@/components/dashboard/AuditExportButton";

interface ComplianceCelebrationProps {
  licenseId: string;
  renewalYear: number;
  state: string;
  licenseType: string;
  renewalDateLabel: string;
  totalHoursEarned: number;
  mandatoryTotal: number;
}

export default function ComplianceCelebration({
  licenseId,
  renewalYear,
  state,
  licenseType,
  renewalDateLabel,
  totalHoursEarned,
  mandatoryTotal,
}: ComplianceCelebrationProps) {
  const storageKey = `compliant_celebrated_${licenseId}_${renewalYear}`;
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid hydration flash

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(storageKey) === "1";
    if (!alreadyDismissed) {
      setDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-800 mb-1">
          🎉 You&apos;re compliant for this renewal cycle.
        </p>
        <p className="text-xs text-green-700 mb-2">
          {state} · {licenseType} · Renewal {renewalDateLabel}
        </p>
        <p className="text-xs text-green-700 mb-3">
          All {totalHoursEarned.toFixed(1)} hours earned.
          {mandatoryTotal > 0 ? " All mandatory topics complete." : ""}
        </p>
        <AuditExportButton licenseId={licenseId} variant="default" />
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="text-green-600 hover:text-green-800 text-lg leading-none flex-shrink-0 mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}
