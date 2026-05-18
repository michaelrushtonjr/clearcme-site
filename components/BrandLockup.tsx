/**
 * BrandLockup
 *
 * Single source of truth for the ClearCME brand mark + wordmark.
 * Uses the ClearCME rounded-C/check mark (public/clearcme-mark.svg inline).
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
  sm: { glyph: 24, text: "text-base", gap: "gap-2"   },
  md: { glyph: 32, text: "text-lg",   gap: "gap-2.5" },
  lg: { glyph: 40, text: "text-2xl",  gap: "gap-3"   },
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
        viewBox="0 0 504 504"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-hidden={!glyphOnly}
        role={glyphOnly ? "img" : undefined}
        aria-label={glyphOnly ? "ClearCME" : undefined}
      >
        <path fill="#f0e8dd" d="M69.02,253.13c0-32.98-.03-65.95,.03-98.92,.01-7.78,1.32-15.39,3.3-22.88,2.39-9.05,6.01-17.53,10.75-25.46,2.69-4.5,5.69-8.77,9.03-12.79,6.03-7.26,12.86-13.52,20.54-18.73,10.02-6.8,20.87-11.41,32.6-13.73,5.92-1.17,11.89-1.61,17.91-1.61,60.59,0,121.18-.04,181.77,.06,7.17,.01,14.26,1.19,21.21,3.24,6.12,1.8,12.02,4.14,17.68,7.13,6.5,3.43,12.41,7.81,18.02,12.69,8.37,7.27,15.23,15.88,20.75,25.67,5.1,9.03,8.83,18.67,10.88,29,.88,4.42,1.69,8.85,1.84,13.37,.71,21.5,.24,43,.29,64.51,.09,43.62-.03,87.25,.07,130.88,.02,9.87-.97,19.53-3.56,29.01-2.33,8.54-5.85,16.54-10.22,24.11-3.14,5.43-6.82,10.43-10.87,15.16-7.09,8.27-15.3,14.95-24.51,20.35-8.64,5.07-17.85,8.44-27.52,10.37-4.54,.91-9.14,1.44-13.79,1.43-62.07-.03-124.15,0-186.22-.05-7.92,0-15.68-1.46-23.27-3.87-9.46-3-18.19-7.6-26.31-13.5-5.61-4.07-10.71-8.79-15.34-14.05-6.71-7.63-12.22-16.14-16.42-25.57-3.56-7.98-6-16.33-7.44-25.03-.98-5.92-1.21-11.86-1.2-17.85,.04-30.98,.02-61.95,.02-92.93Z" />
        <path fill="#de5d32" d="M358.13,205.88l-106.48,109.36c-1.92,1.9-4.98,1.95-6.9,.1l-24.17-23.26-11.57-10.58c-1.05-.96-1.62-2.33-1.57-3.76l-.15-32.35c.24-7.13,10.13-10.47,15.13-5.45l21.35,21.47c1.92,1.93,5.08,1.9,7.02-.07l62.82-67.63c.94-.96,2.22-1.5,3.55-1.5h34.78c7.22-.03,11.35,8.55,6.19,13.67Z" />
        <path fill="#2b392b" d="M347.98,386.5H200.17c-35.56,0-64.39-28.96-64.39-64.68V167.93c0-26.83,21.65-48.58,48.36-48.58h163.84c6.88,0,12.45,5.6,12.45,12.51v35.88c0,6.95-5.63,12.56-12.55,12.51l-142.04-1.04c-6.48-.05-11.75,5.23-11.72,11.74l.59,124.54c.03,6.89,5.6,12.45,12.45,12.45h140.8c6.88,0,12.45,5.6,12.45,12.51v33.53c0,6.91-5.58,12.51-12.45,12.51Z" />
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
