"use client";

import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  "⚠ NV MDs renew July 1 — are your 40 Cat 1 hours complete?",
  "⚠ TX MDs & DOs renew Aug 31 — CE Broker tracking required",
  "⚠ AL MDs renew Sept 30 — 25 Cat 1 hours required annually",
  "⚠ WA MDs & DOs renew Oct 1 — 200 hours due every 4 years",
  "⚠ NE MDs & DOs renew Oct 1 even years — 50 Cat 1 hours required",
  "⚠ KS MDs renew Aug 1 — DOs renew Oct 31 — verify your cycle",
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
    }, 6000);

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
