"use client";

import { useEffect, useState } from "react";

interface AhaMomentModalProps {
  state: string;
  licenseType: string;
  requirementCount: number;
  gapCount: number;
  renewalDate: string | null;
}

const AHA_KEY = "clearcme_aha_shown";

export default function AhaMomentModal({
  state,
  licenseType,
  requirementCount,
  gapCount,
  renewalDate,
}: AhaMomentModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if there's real data and it hasn't been shown before
    if (requirementCount === 0) return;
    let shouldShow = false;

    try {
      const shown = localStorage.getItem(AHA_KEY);
      if (!shown) {
        shouldShow = true;
      }
    } catch {
      // localStorage unavailable (SSR/private browsing) — skip
    }

    if (!shouldShow) return;

    const timer = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(timer);
  }, [requirementCount]);

  function dismiss() {
    try {
      localStorage.setItem(AHA_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function showGaps() {
    dismiss();
    // Scroll to first gap card
    setTimeout(() => {
      const gapEl = document.querySelector("[data-gap-card]");
      if (gapEl) {
        gapEl.scrollIntoView({ behavior: "smooth", block: "center" });
        (gapEl as HTMLElement).focus?.();
      }
    }, 100);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(16,22,19,0.42)", backdropFilter: "blur(2px)" }}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="aha-title"
    >
      <div
        className="relative max-w-md w-full p-8"
        style={{
          background: "var(--c1b-card, #FBFAF5)",
          border: "1px solid rgba(16,22,19,.13)",
          borderRadius: 10,
          boxShadow: "0 24px 60px -30px rgba(22,32,26,.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: "var(--c1b-muted, #656C60)" }}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p
          className="mono-label"
          style={{ color: "var(--c1b-muted, #656C60)", marginBottom: 10 }}
        >
          Full record
        </p>

        <h2
          id="aha-title"
          className="mb-3"
          style={{
            fontFamily: "var(--serif, Georgia, serif)",
            fontSize: 24,
            fontWeight: 500,
            color: "var(--c1b-ink, #101613)",
          }}
        >
          Your compliance map is ready
        </h2>

        <p className="leading-relaxed mb-6" style={{ fontSize: 14, color: "var(--c1b-ink-2, #4B5349)" }}>
          We mapped your{" "}
          <span style={{ fontWeight: 600, color: "var(--c1b-green, #2E4A2C)" }}>{state} {licenseType}</span>{" "}
          license against{" "}
          <span style={{ fontWeight: 600, color: "var(--c1b-ink, #101613)" }}>{requirementCount} active requirement{requirementCount !== 1 ? "s" : ""}</span>{" "}
          and found{" "}
          <span style={{ fontWeight: 600, color: "var(--c1b-amber-text, #7A5218)" }}>{gapCount} gap{gapCount !== 1 ? "s" : ""}</span>
          {renewalDate ? (
            <>
              {" "}before your{" "}
              <span style={{ fontWeight: 600, color: "var(--c1b-ink, #101613)" }}>{renewalDate}</span> renewal.
            </>
          ) : "."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={showGaps} className="btn-filled flex-1">
            Show me my gaps →
          </button>
          <button onClick={dismiss} className="btn-outline flex-1">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
