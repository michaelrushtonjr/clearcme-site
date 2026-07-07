"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Small ⓘ bubble that reveals a popover on hover, focus, or tap.
 * Used next to requirement topics to surface the primary source, effective
 * date, and cadence — physicians are trust-but-verify people, so the citation
 * lives one hover away from every claim.
 *
 * Safe to render as a sibling of other interactive elements (never nest it
 * inside a <button>).
 */
export default function InfoTip({
  label = "Requirement details",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(63,95,51,0.3)] bg-[rgba(63,95,51,0.08)] text-[10px] font-bold text-[var(--primary)] transition-colors hover:bg-[rgba(63,95,51,0.16)]"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-3 text-left text-xs font-normal normal-case leading-relaxed text-[var(--ink-2)] shadow-[var(--shadow-md)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
