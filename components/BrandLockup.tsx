/**
 * BrandLockup
 *
 * Single source of truth for the ClearCME brand mark + wordmark.
 * Uses Mark 03 — Refined Cube (public/clearcme-mark.svg inline).
 *
 * Place at: components/BrandLockup.tsx
 */

import Link from "next/link";
import clsx from "clsx";

type Size = "sm" | "md" | "lg";

interface BrandLockupProps {
  size?: Size;
  /** Renders only the glyph — no wordmark. Use for favicons / compact UI. */
  glyphOnly?: boolean;
  /** Wraps in a Next.js Link. Pass null for unlinked. Default: "/" */
  href?: string | null;
  className?: string;
}

const SIZE_MAP: Record<Size, { glyph: number; text: string; gap: string }> = {
  sm: { glyph: 18, text: "text-base", gap: "gap-2"   },
  md: { glyph: 22, text: "text-lg",   gap: "gap-2.5" },
  lg: { glyph: 28, text: "text-2xl",  gap: "gap-3"   },
};

export function BrandLockup({
  size = "md",
  glyphOnly = false,
  href = "/",
  className,
}: BrandLockupProps) {
  const { glyph, text, gap } = SIZE_MAP[size];

  const inner = (
    <span className={clsx("inline-flex items-center", gap, className)}>
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-brand-teal flex-shrink-0"
        aria-hidden={!glyphOnly}
        role={glyphOnly ? "img" : undefined}
        aria-label={glyphOnly ? "ClearCME" : undefined}
      >
        <path
          d="M11 1.5 L20 6.5 L20 15.5 L11 20.5 L2 15.5 L2 6.5 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M11 1.5 L11 11 M11 11 L2 6.5 M11 11 L20 6.5 M11 11 L11 20.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {!glyphOnly && (
        <span className={clsx("font-bold tracking-tight text-brand-navy", text)}>
          Clear<span className="text-brand-teal">CME</span>
        </span>
      )}
    </span>
  );

  if (href === null) return inner;

  return (
    <Link href={href} aria-label="ClearCME — home">
      {inner}
    </Link>
  );
}
