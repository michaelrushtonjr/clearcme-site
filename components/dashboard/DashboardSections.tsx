"use client";

import { type ReactNode } from "react";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

/**
 * Wraps a dashboard section in a component-level ErrorBoundary.
 * Usage: <DashboardSection label="Compliance Ring">...</DashboardSection>
 */
export function DashboardSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary label={label}>
      {children}
    </ErrorBoundary>
  );
}
