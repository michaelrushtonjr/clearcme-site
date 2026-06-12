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
    const timer = window.setTimeout(() => {
      setMounted(true);
      const saved = loadSteps();
      // Sync real progress into stored state
      const merged = { ...saved };
      if (hasLicense) merged.license = true;
      if (hasCertificate) merged.certificate = true;
      if (hasComplianceData) merged.compliance = true;
      setStored(merged);
      saveSteps(merged);
    }, 0);

    return () => window.clearTimeout(timer);
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

  // All complete — setup is done; get out of the way. The Next Best Action
  // card below is the dashboard's real hero.
  if (allDone) return null;

  // Mostly complete — collapse to a single-line banner pointing at the next
  // step instead of spending prime dashboard space on struck-through tasks.
  if (completed >= steps.length / 2) {
    const next = steps.find((s) => !s.done)!;
    return (
      <div className="product-callout-brand px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[var(--paper)] border-2 border-[rgba(63,95,51,0.25)] flex-shrink-0" />
          <p className="text-sm text-[var(--ink)] min-w-0">
            <span className="font-semibold">Finish setup:</span>{" "}
            <span className="text-[var(--ink-2)]">{next.label}</span>
            <span className="text-xs text-[var(--ink-3)] whitespace-nowrap"> · {completed}/{steps.length} done</span>
          </p>
        </div>
        <Link
          href={next.href}
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-[var(--primary)] text-white rounded-full hover:bg-[var(--primary-2)] transition-colors"
        >
          {next.cta}
        </Link>
      </div>
    );
  }

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="product-callout-brand p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display font-semibold text-[var(--ink)] text-lg">
            Welcome to ClearCME — Let&apos;s get you audit-ready.
          </h3>
          <p className="text-sm text-[var(--ink-2)] mt-0.5">
            Complete these steps to unlock your full compliance dashboard.
          </p>
        </div>
        <span className="product-pill product-pill-track whitespace-nowrap flex-shrink-0">
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="product-progress">
          <div
            className="product-progress-fill transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-[var(--ink-3)] mb-5">
        Progress: {completed}/4 complete · ~3-5 min
      </p>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
              step.done ? "bg-[rgba(63,95,51,0.10)]" : "bg-[var(--paper)] border border-[var(--line)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step.done ? "bg-[var(--primary)] text-white" : "bg-[var(--paper)] border-2 border-[rgba(63,95,51,0.25)] text-[var(--primary)]"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              <span
                className={`text-sm font-medium ${
                  step.done ? "text-[var(--ink-3)] line-through opacity-80" : "text-[var(--ink)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-[var(--primary)] text-white rounded-full hover:bg-[var(--primary-2)] transition-colors"
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
