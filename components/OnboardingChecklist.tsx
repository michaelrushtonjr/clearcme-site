"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Step {
  key: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
}

interface Props {
  hasLicense: boolean;
  hasCertificate: boolean;
  hasComplianceData: boolean;
}

const STORAGE_KEY = "onboarding_steps";

function loadSteps(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSteps(steps: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(steps));
}

export default function OnboardingChecklist({ hasLicense, hasCertificate, hasComplianceData }: Props) {
  const [mounted, setMounted] = useState(false);
  const [stored, setStored] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    const saved = loadSteps();
    // Sync real progress into stored state
    const merged = { ...saved };
    if (hasLicense) merged.license = true;
    if (hasCertificate) merged.certificate = true;
    if (hasComplianceData) merged.compliance = true;
    setStored(merged);
    saveSteps(merged);
  }, [hasLicense, hasCertificate, hasComplianceData]);

  if (!mounted) return null;

  const steps: Step[] = [
    {
      key: "license",
      label: "Add your state license",
      done: !!stored.license,
      href: "/dashboard/profile",
      cta: "Add License",
    },
    {
      key: "certificate",
      label: "Upload your first CME certificate",
      done: !!stored.certificate,
      href: "/dashboard/upload",
      cta: "Upload",
    },
    {
      key: "compliance",
      label: "Review your compliance map",
      done: !!stored.compliance,
      href: "/dashboard/compliance",
      cta: "Review",
    },
    {
      key: "alerts",
      label: "Turn on renewal alerts",
      done: !!stored.alerts,
      href: "/dashboard/settings",
      cta: "Settings",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  // All complete — show audit-ready card
  if (allDone) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="font-bold text-green-900 text-lg">You&apos;re audit-ready</h3>
        <p className="text-sm text-green-700 mt-1">All setup steps complete. Your compliance tracking is fully configured.</p>
      </div>
    );
  }

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-blue-900 text-base">
            Welcome to ClearCME — Let&apos;s get you audit-ready.
          </h3>
          <p className="text-sm text-blue-700 mt-0.5">
            Complete these steps to unlock your full compliance dashboard.
          </p>
        </div>
        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-blue-500 mb-5">
        Progress: {completed}/4 complete · ~3-5 min
      </p>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
              step.done ? "bg-blue-100/60" : "bg-white border border-blue-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step.done ? "bg-blue-600 text-white" : "bg-white border-2 border-blue-300 text-blue-500"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              <span
                className={`text-sm font-medium ${
                  step.done ? "text-blue-700 line-through opacity-70" : "text-slate-800"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {step.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
