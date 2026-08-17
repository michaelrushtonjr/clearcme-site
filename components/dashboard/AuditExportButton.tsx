"use client";

import { useState } from "react";
import UpgradeNotice from "@/components/UpgradeNotice";

interface AuditExportButtonProps {
  licenseId?: string;
  /** "default" = full teal button (existing), "inline" = minimal text link,
      "c1b" = console-1b styled button (filled or outline via c1bStyle) */
  variant?: "default" | "inline" | "c1b";
  /** Button label for the c1b variant, e.g. "Export record" / "Audit ZIP" */
  label?: string;
  c1bStyle?: "filled" | "outline";
}

export default function AuditExportButton({
  licenseId,
  variant = "default",
  label = "Download Audit ZIP",
  c1bStyle = "filled",
}: AuditExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = licenseId
        ? `/api/audit-export?licenseId=${encodeURIComponent(licenseId)}`
        : `/api/audit-export`;

      const resp = await fetch(url);
      if (resp.status === 402) {
        setUpgradeRequired(true);
        return;
      }
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

  if (variant === "c1b") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <button
          onClick={handleDownload}
          disabled={loading}
          className={c1bStyle === "filled" ? "btn-filled" : "btn-outline"}
          title="Downloads a ZIP organized by license, requirement, and year."
        >
          {loading ? "Building ZIP…" : label}
        </button>
        {upgradeRequired && <UpgradeNotice feature="export" />}
        {error && <span className="text-xs text-[var(--status-miss)]">{error}</span>}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span className="flex flex-col items-start gap-0.5">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="text-xs text-[var(--primary)] transition-all hover:text-[var(--primary-2)] hover:underline active:scale-95 disabled:opacity-60 disabled:active:scale-100 font-medium"
          title="Downloads a ZIP organized by license, requirement, and year."
        >
          {loading ? "Building ZIP…" : "Download audit ZIP"}
        </button>
        {upgradeRequired && <UpgradeNotice feature="export" />}
        {error && <span className="text-xs text-[var(--status-miss)]">{error}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="product-btn product-btn-brand px-4 py-2.5 text-sm active:scale-95 disabled:opacity-60 disabled:active:scale-100"
        title="Downloads a ZIP organized by license, requirement, and year."
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
          "Download Audit ZIP"
        )}
      </button>
      <p className="max-w-[16rem] text-left text-[11px] leading-snug text-[var(--ink-3)]">
        ZIP organized by license, requirement, and year.
      </p>
      {upgradeRequired && (
        <div className="max-w-xs">
          <UpgradeNotice feature="export" />
        </div>
      )}
      {error && (
        <p className="text-xs text-[var(--status-miss)]">{error}</p>
      )}
    </div>
  );
}
