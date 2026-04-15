"use client";

import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  "⚠ NV MDs renew July 1 — are your 40 hours complete?",
  "⚠ DOs renew December 31 — check your AOA Category 1 hours",
  "⚠ FL physicians renew Jan 31 — medical errors CME required every cycle",
  "⚠ TX physicians renew Aug 31 — CE Broker tracking required since Sept 2025",
  "⚠ CA physicians renew Jan 31 odd years — 12hrs pain management required",
  "⚠ NY registration renews every 2 years — don't miss your mandatory trainings",
  "⚠ IL physicians renew Jan 31 — opioid requirement dropped to 1hr in 2025",
  "⚠ PA physicians renew Dec 31 even years — 100hrs required, 20 must be Cat 1",
];

const STORAGE_KEY = "urgency_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function UrgencyBanner() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const dismissed = JSON.parse(raw) as { ts: number };
        if (Date.now() - dismissed.ts < DISMISS_DURATION_MS) {
          return; // still within 24h window
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore parse errors
    }
    setVisible(true);
  }, []);

  // Rotate messages every 4 seconds with a fade
  useEffect(() => {
    if (!visible) return;

    intervalRef.current = setInterval(() => {
      // fade out
      setOpacity(0);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % MESSAGES.length);
        // fade in
        setOpacity(1);
      }, 300);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now() }));
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="bg-[#7C2D12] text-white text-xs py-2 px-4 w-full text-center font-medium relative flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span
        style={{
          opacity,
          transition: "opacity 300ms ease-in-out",
          display: "inline-block",
        }}
      >
        {MESSAGES[index]}
      </span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors text-sm leading-none"
      >
        ✕
      </button>
    </div>
  );
}
