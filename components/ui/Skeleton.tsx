"use client";

import React from "react";

/**
 * Base skeleton shimmer component.
 * Uses CSS @keyframes with a linear-gradient sweep over 1.5s.
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <div
        className={`skeleton-shimmer rounded ${className}`}
        style={style}
        aria-hidden="true"
      />
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -400px 0;
          }
          100% {
            background-position: 400px 0;
          }
        }
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            #e2e8f0 0%,
            #f1f5f9 40%,
            #e2e8f0 80%
          );
          background-size: 800px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

/**
 * Circular skeleton (for rings / avatars).
 */
export function SkeletonCircle({
  size = 80,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Text line skeleton with configurable width.
 */
export function SkeletonLine({
  width = "100%",
  height = 14,
  className = "",
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <Skeleton
      className={`rounded ${className}`}
      style={{ width, height }}
    />
  );
}
