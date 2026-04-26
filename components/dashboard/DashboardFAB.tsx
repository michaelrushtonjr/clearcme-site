"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const actionItemClassName =
  "flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-md transition-all duration-200 ease-out";

export default function DashboardFAB() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleStatusCheck = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsOpen(false);
  };

  const handleExportAudit = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/certificates/export");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] ?? "ClearCME_Audit_Export.pdf";

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
        className={`pointer-events-auto absolute inset-0 bg-slate-950/35 transition-opacity duration-200 ease-out ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div className="pointer-events-none absolute bottom-24 right-4 flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-200 ease-out ${
            isOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          } ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!isOpen}
        >
          <button
            type="button"
            onClick={handleExportAudit}
            disabled={isExporting}
            className={`${actionItemClassName} ${isExporting ? "opacity-70" : ""}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>{isExporting ? "Preparing audit..." : "Export audit"}</span>
          </button>

          <button
            type="button"
            onClick={handleStatusCheck}
            className={actionItemClassName}
          >
            <span aria-hidden="true">📊</span>
            <span>Status check</span>
          </button>

          <Link
            href="/dashboard/upload"
            onClick={() => setIsOpen(false)}
            className={actionItemClassName}
          >
            <span aria-hidden="true">📷</span>
            <span>Upload cert</span>
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
          onClick={() => setIsOpen((open) => !open)}
          className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0F766E] text-white shadow-lg transition-transform duration-200 ease-out ${
            isOpen ? "rotate-45" : "rotate-0"
          }`}
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.25}
          >
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
