"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Step {
  label: string;
  done: boolean;
}

interface Props {
  steps: Step[];
  stepsCompleted: number;
}

export default function OnboardingChecklist({ steps, stepsCompleted }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem("clearcme_onboarding_dismissed") === "1");
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("clearcme_onboarding_dismissed", "1");
    setDismissed(true);
  };

  // Don't flash on SSR
  if (!mounted || dismissed) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-blue-900 text-base">Finish setting up ClearCME</h3>
          <p className="text-sm text-blue-700 mt-0.5">Complete these steps to see your personalized compliance map.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full whitespace-nowrap">
            {stepsCompleted}/3 done
          </span>
          <button
            onClick={handleDismiss}
            className="text-xs text-blue-400 hover:text-blue-600 underline underline-offset-2 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Progress bar only — no ASCII text */}
      <div className="mb-5">
        <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${(stepsCompleted / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
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
                {step.done ? "✓" : i + 1}
              </span>
              <span
                className={`text-sm font-medium ${
                  step.done ? "text-blue-700 line-through opacity-70" : "text-slate-800"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!step.done && i === 1 && (
              <Link
                href="/dashboard/profile"
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add License
              </Link>
            )}
            {!step.done && i === 2 && (
              <Link
                href="/dashboard/upload"
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Now
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
