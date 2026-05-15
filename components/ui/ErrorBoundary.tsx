"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  /** Human-readable label for the section, e.g. "Compliance Ring" */
  label: string;
  /** Optional fallback to render instead of the default inline error */
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Component-level error boundary.
 * Catches render errors within a dashboard section and shows an inline
 * retry card with amber border — never a full-page crash or modal.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in dev; could send to Sentry in production
    console.error(
      `[ErrorBoundary] ${this.props.label}:`,
      error,
      errorInfo.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="product-callout-warm px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--ink)]">
              Couldn&apos;t load {this.props.label}.
            </p>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Something went wrong rendering this section.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="product-btn product-btn-urgent flex-shrink-0 text-sm px-4 py-2"
          >
            Tap to retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
