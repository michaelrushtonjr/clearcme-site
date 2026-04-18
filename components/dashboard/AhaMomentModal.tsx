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
    try {
      const shown = localStorage.getItem(AHA_KEY);
      if (!shown) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (SSR/private browsing) — skip
    }
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
      style={{ backgroundColor: "rgba(15,118,110,0.15)", backdropFilter: "blur(2px)" }}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="aha-title"
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-teal-100 max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h2 id="aha-title" className="text-xl font-bold text-[#1E293B] mb-3">
          Your compliance map is ready
        </h2>

        <p className="text-slate-600 leading-relaxed mb-6">
          We mapped your{" "}
          <span className="font-semibold text-[#0F766E]">{state} {licenseType}</span>{" "}
          license against{" "}
          <span className="font-semibold text-slate-800">{requirementCount} active requirement{requirementCount !== 1 ? "s" : ""}</span>{" "}
          and found{" "}
          <span className="font-semibold text-amber-600">{gapCount} gap{gapCount !== 1 ? "s" : ""}</span>
          {renewalDate ? (
            <>
              {" "}before your{" "}
              <span className="font-semibold text-slate-800">{renewalDate}</span> renewal.
            </>
          ) : "."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={showGaps}
            className="flex-1 px-4 py-3 bg-[#0F766E] text-white font-semibold rounded-xl hover:bg-[#0D9488] transition-colors text-sm"
          >
            Show me my gaps →
          </button>
          <button
            onClick={dismiss}
            className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
