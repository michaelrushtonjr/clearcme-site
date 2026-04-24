"use client";

import { useEffect, useRef, useState } from "react";

import { isCEBrokerState } from "@/lib/cebroker-export";

interface CEBrokerExportButtonProps {
  licenseId: string;
  state: string;
}

export default function CEBrokerExportButton({
  licenseId,
  state,
}: CEBrokerExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  if (!isCEBrokerState(state)) {
    return null;
  }

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/certificates/cebroker-export?licenseId=${encodeURIComponent(licenseId)}`
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] ?? `cebroker-report-${state.toLowerCase()}.csv`;

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      setShowToast(true);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
      }, 4000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-600 px-4 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992V4.356m-2.132 14.296A9 9 0 105.982 5.35m0 0V9.5m0-4.15H10"
                />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5.25H7.5A2.25 2.25 0 005.25 7.5v10.5A2.25 2.25 0 007.5 20.25h9A2.25 2.25 0 0018.75 18V7.5a2.25 2.25 0 00-2.25-2.25H15m-6 0A2.25 2.25 0 0011.25 7.5h1.5A2.25 2.25 0 0015 5.25m-6 0A2.25 2.25 0 0111.25 3h1.5A2.25 2.25 0 0115 5.25m-6 0h6"
                />
              </svg>
              Export for CE Broker
            </>
          )}
        </button>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>

      {showToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-teal-200 bg-[#FAFAF7] px-4 py-3 text-sm text-slate-800 shadow-lg"
        >
          <p className="font-medium text-teal-800">
            CE Broker report downloaded — upload it at cebroker.com/self-report
          </p>
        </div>
      ) : null}
    </>
  );
}
