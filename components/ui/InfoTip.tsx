"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const POPOVER_WIDTH = 288; // w-72
const VIEWPORT_MARGIN = 8;
const GAP = 8;
const CLOSE_DELAY_MS = 120;

interface Position {
  top: number;
  left: number;
  width: number;
}

/**
 * Small ⓘ bubble that reveals a popover on hover, focus, or tap.
 * Used next to requirement topics to surface the primary source, effective
 * date, and cadence — physicians are trust-but-verify people, so the citation
 * lives one hover away from every claim.
 *
 * The popover renders into document.body rather than next to the trigger. As a
 * plain absolutely-positioned child it was clipped by the Compliance Map's
 * `overflow-hidden` license card — the ⓘ sits at the card's left edge, so half
 * the bubble (including "Confirmed by ClearCME: <date>") fell outside and was
 * cut off. Fixed positioning plus viewport clamping means it can't be trimmed
 * by an ancestor or run off the edge of a phone screen.
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
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Small grace period so the pointer can travel from the ⓘ onto the popover —
  // the source links inside it have to stay clickable.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const width = Math.min(POPOVER_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
    const height = popoverRef.current?.offsetHeight ?? 0;

    const centred = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, centred),
      Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)
    );

    // Prefer below; flip above when the bubble would hang off the bottom.
    const below = rect.bottom + GAP;
    const fitsBelow = height === 0 || below + height + VIEWPORT_MARGIN <= viewportHeight;
    const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, rect.top - GAP - height);

    setPosition({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    // Runs before paint, so a position left over from a previous open is
    // always overwritten before the bubble is visible.
    reposition();
    // Second pass once the popover has real dimensions, so the flip-above
    // decision uses a measured height rather than 0.
    const frame = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(frame);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          cancelClose();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        onFocus={() => {
          cancelClose();
          setOpen(true);
        }}
        onBlur={scheduleClose}
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(63,95,51,0.3)] bg-[rgba(63,95,51,0.08)] text-[10px] font-bold text-[var(--primary)] transition-colors hover:bg-[rgba(63,95,51,0.16)]"
      >
        i
      </button>
      {/* `open` only ever flips true from a client event, so there is no
          server render of the portal to mismatch against. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: position?.width ?? POPOVER_WIDTH,
              visibility: position ? "visible" : "hidden",
            }}
            className="z-[60] rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-3 text-left text-xs font-normal normal-case leading-relaxed text-[var(--ink-2)] shadow-[var(--shadow-md)]"
          >
            {children}
          </div>,
          document.body
        )}
    </span>
  );
}
