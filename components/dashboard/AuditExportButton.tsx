"use client";

import { useState } from "react";

interface AuditExportButtonProps {
  licenseId?: string;
  /** "default" = full teal button (existing), "inline" = minimal text link */
  variant?: "default" | "inline";
}

export default function AuditExportButton({ licenseId, variant = "default" }: AuditExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = licenseId
        ? `/api/audit-export?licenseId=${encodeURIComponent(licenseId)}`
        : `/api/audit-export`;

      const resp = await fetch(url);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${resp.status}`);
      }

      const blob = await resp.blob();
      const disposition = resp.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] ?? "ClearCME_Audit_Package.zip";

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "inline") {
    return (
      <span className="flex flex-col items-start gap-0.5">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="text-xs text-teal-600 hover:text-teal-800 hover:underline font-medium transition-colors disabled:opacity-60"
        >
          {loading ? "Building ZIP…" : "Download audit trail"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F766E] text-white text-sm font-semibold rounded-xl hover:bg-[#0D9488] transition-colors disabled:opacity-60 shadow-sm"
      >
        {loading ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Building ZIP…
          </>
        ) : (
          <>
            <span>📦</span>
            Download Audit Package
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
