"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppShell } from "@/lib/app-shell";
import { openReportPopup, printWhenReady } from "@/lib/compliance-report-window";
import { formatDateUTC } from "@/lib/dates";

interface LicenseExport {
  state: string;
  licenseType: string;
  renewalDate: string | null;
  totalHoursEarned: number;
  totalHoursNeeded: number;
  gapHours: number;
  overall: import("@/lib/compliance-engine").OverallStatus;
  isCompliant: boolean;
  mandatoryGaps: {
    status: import("@/lib/compliance-engine").RequirementStatus;
    topic: string;
    earned: number;
    needed: number;
    gap: number;
    isMet: boolean;
    displayName?: string;
    isUnknown?: boolean;
    completionStatus?: string;
  }[];
}

interface CertExport {
  title: string;
  provider: string;
  activityDate: string | null;
  creditHours: number;
  creditType: string;
}

interface ExportData {
  licenses: LicenseExport[];
  certificates: CertExport[];
  totalHoursAllCerts: number;
}

function formatTopic(topic: string): string {
  const MAP: Record<string, string> = {
    OPIOID_PRESCRIBING: "Opioid Prescribing",
    PAIN_MANAGEMENT: "Pain Management",
    IMPLICIT_BIAS: "Implicit Bias",
    END_OF_LIFE_CARE: "End-of-Life Care",
    DOMESTIC_VIOLENCE: "Domestic Violence",
    CHILD_ABUSE: "Child Abuse",
    ELDER_ABUSE: "Elder Abuse",
    HUMAN_TRAFFICKING: "Human Trafficking",
    INFECTION_CONTROL: "Infection Control",
    PATIENT_SAFETY: "Patient Safety",
    ETHICS: "Ethics",
    CULTURAL_COMPETENCY: "Cultural Competency",
    SUBSTANCE_USE: "Substance Use / MATE Act",
    SUICIDE_PREVENTION: "Suicide Prevention",
    OTHER_MANDATORY: "Mandatory Topic",
    GENERAL_CME: "General CME",
  };
  return MAP[topic] ?? topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return formatDateUTC(iso);
}

function buildHtml(data: ExportData): string {
  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const licenseRows = data.licenses
    .map(
      (l) => `
      <div class="card">
        <div class="card-header">
          <strong>${l.state} — ${l.licenseType}</strong>
          <span class="badge ${l.isCompliant ? "badge-green" : "badge-amber"}">${l.overall === "UNKNOWN" ? "Needs your answer" : l.overall === "NOT_COMPUTED" ? "Rules pending" : l.isCompliant ? "Compliant" : "Action needed"}</span>
        </div>
        <table>
          <tr><td>Renewal Date</td><td>${formatDate(l.renewalDate)}</td></tr>
          <tr><td>Hours Earned</td><td>${l.totalHoursEarned.toFixed(1)} / ${l.totalHoursNeeded.toFixed(0)} hrs</td></tr>
          <tr><td>Gap Hours</td><td>${l.gapHours.toFixed(1)} hrs</td></tr>
        </table>
        ${
          l.mandatoryGaps.length > 0
            ? `<div class="topics">
            <div class="section-label">Mandatory Topics</div>
            ${l.mandatoryGaps
              .map(
                (g) => `
              <div class="topic-row ${g.isMet ? "met" : "gap"}">
                <span>${g.displayName ?? formatTopic(g.topic)}</span>
                <span>${g.earned.toFixed(1)} / ${g.needed.toFixed(0)} hrs${
                  g.isMet
                    ? g.completionStatus === "completed" && g.earned < g.needed
                      ? " (attested complete — certificate not on file)"
                      : ""
                    : g.status === "EXPIRED" ? " (expired)" : g.status === "NOT_APPLICABLE" ? " (not applicable)" : g.isUnknown
                    ? " (awaiting your answer)"
                    : ` (${g.gap.toFixed(1)} hrs needed)`
                }</span>
              </div>`
              )
              .join("")}
          </div>`
            : ""
        }
      </div>`
    )
    .join("");

  const certRows = data.certificates
    .map(
      (c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${c.title || "—"}</td>
        <td>${c.provider || "—"}</td>
        <td>${formatDate(c.activityDate)}</td>
        <td>${c.creditHours.toFixed(1)} hrs</td>
        <td>${c.creditType.replace(/_/g, " ")}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ClearCME Compliance Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #101613; padding: 40px; font-size: 13px; background: #FFFFFF; }
    h1 { font-size: 22px; font-weight: 700; color: #101613; }
    h2 { font-size: 15px; font-weight: 700; color: #22371F; margin: 28px 0 12px; border-bottom: 2px solid #E3E0D3; padding-bottom: 6px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #22371F; padding-bottom: 16px; }
    .brand { font-family: Newsreader, Georgia, serif; font-size: 24px; font-weight: 600; color: #101613; }
    .brand span { color: #2E4A2C; }
    .meta { text-align: right; color: #656C60; font-size: 12px; }
    .card { background: #FBFAF5; border: 1px solid rgba(16,22,19,.13); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; }
    .badge { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; }
    .badge-green { background: #E3E7DA; color: #2E4A2C; }
    .badge-amber { background: #F3E3CC; color: #7A5218; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    table td { padding: 4px 8px; }
    table td:first-child { color: #656C60; width: 40%; }
    .topics { margin-top: 12px; }
    .section-label { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #656C60; margin-bottom: 6px; }
    .topic-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid rgba(16,22,19,.08); }
    .topic-row.gap { color: #7A5218; }
    .topic-row.met { color: #2E4A2C; }
    .certs-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .certs-table th { text-align: left; padding: 6px 8px; background: #F0ECE1; font-weight: 600; color: #656C60; font-size: 11px; text-transform: uppercase; }
    .certs-table td { padding: 6px 8px; border-bottom: 1px solid rgba(16,22,19,.08); }
    .summary-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .summary-tile { flex: 1; background: #FBFAF5; border: 1px solid rgba(16,22,19,.13); border-radius: 8px; padding: 12px; text-align: center; }
    .summary-tile .val { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 22px; font-weight: 600; color: #2E4A2C; }
    .summary-tile .lbl { font-size: 11px; color: #656C60; margin-top: 2px; }
    .footer { margin-top: 32px; color: #656C60; font-size: 11px; text-align: center; border-top: 1px solid #E3E0D3; padding-top: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Clear<span>CME</span></div>
      <div style="color:#6B7568;font-size:12px;margin-top:4px;">Physician CME Compliance Report</div>
    </div>
    <div class="meta">
      <div>Generated: ${now}</div>
      <div style="margin-top:2px;font-style:italic;color:#95A092;">AI-extracted data — verify before relying on for compliance</div>
    </div>
  </div>

  <div class="summary-row">
    <div class="summary-tile">
      <div class="val">${data.totalHoursAllCerts.toFixed(1)}</div>
      <div class="lbl">Total Hours Earned</div>
    </div>
    <div class="summary-tile">
      <div class="val">${data.licenses.length}</div>
      <div class="lbl">Active Licenses</div>
    </div>
    <div class="summary-tile">
      <div class="val">${data.certificates.length}</div>
      <div class="lbl">Certificates</div>
    </div>
    <div class="summary-tile">
      <div class="val">${data.licenses.filter((l) => l.isCompliant).length}/${data.licenses.length}</div>
      <div class="lbl">Licenses Compliant</div>
    </div>
  </div>

  <h2>License Compliance</h2>
  ${licenseRows || '<p style="color:#95A092;font-size:12px;">No licenses configured.</p>'}

  <h2>Uploaded Certificates (${data.certificates.length})</h2>
  ${
    data.certificates.length > 0
      ? `<table class="certs-table">
    <thead>
      <tr>
        <th>#</th><th>Course Title</th><th>Provider</th><th>Date</th><th>Hours</th><th>Type</th>
      </tr>
    </thead>
    <tbody>${certRows}</tbody>
  </table>`
      : '<p style="color:#95A092;font-size:12px;">No certificates on file.</p>'
  }

  <div class="footer">
    ClearCME · clearcme.ai · This report is for personal compliance tracking only and does not constitute legal, medical, or regulatory advice.
  </div>
</body>
</html>`;
}

export default function ComplianceExportButton({
  exportData,
  variant = "default",
}: {
  exportData: ExportData;
  /** "c1b" renders the console-1b filled button */
  variant?: "default" | "c1b";
}) {
  const inAppShell = useAppShell();
  // The report shown on this page, when a separate window is not available.
  const [inlineReport, setInlineReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeReport = useCallback(() => setInlineReport(null), []);

  // Everything here is synchronous, so the button has no waiting state to get
  // stuck in: the report opens in a new window, or on this page, or the
  // physician is told plainly that it could not be opened.
  const handleExport = () => {
    setError(null);
    try {
      const html = buildHtml(exportData);
      const popup = openReportPopup(html, window, { inAppShell });
      if (popup) printWhenReady(popup);
      else setInlineReport(html);
    } catch {
      setError("We couldn't open your compliance report. Please try again.");
    }
  };

  const extras = (
    <>
      {error && (
        <p role="alert" style={{ marginTop: 6, fontSize: 12, color: "#9A3B1F" }}>
          {error}
        </p>
      )}
      {inlineReport && <InlineReport html={inlineReport} onClose={closeReport} />}
    </>
  );

  if (variant === "c1b") {
    return (
      <>
        <button onClick={handleExport} className="btn-filled">
          Compliance report
        </button>
        {extras}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleExport}
        className="product-btn product-btn-secondary px-4 py-2.5 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download Compliance Report
      </button>
      {extras}
    </>
  );
}

const barButton: React.CSSProperties = {
  border: "1px solid rgba(16,22,19,.25)",
  borderRadius: 8,
  padding: "10px 14px",
  minHeight: 44,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  background: "#FBFAF5",
  color: "#101613",
};

/**
 * The report on the current page, for when a new window is not available (a
 * blocked pop-up, or the iPhone app's web view). The report sits in a frame
 * that cannot run scripts; Print asks the browser to print just that frame.
 */
function InlineReport({ html, onClose }: { html: string; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [printError, setPrintError] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const print = () => {
    setPrintError(false);
    try {
      const frameWindow = frameRef.current?.contentWindow;
      if (!frameWindow) throw new Error("Report frame unavailable");
      frameWindow.focus();
      frameWindow.print();
    } catch {
      setPrintError(true);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compliance report"
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", background: "#F4EFE3" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(16,22,19,.13)",
          background: "#FFFFFF",
        }}
      >
        <strong style={{ fontSize: 15, color: "#101613" }}>Compliance report</strong>
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={print} style={{ ...barButton, background: "#22371F", borderColor: "#22371F", color: "#FFFFFF" }}>
            Print or save as PDF
          </button>
          <button type="button" ref={closeRef} onClick={onClose} style={barButton}>
            Close
          </button>
        </span>
        {printError && (
          <p role="alert" style={{ flexBasis: "100%", margin: 0, fontSize: 13, color: "#9A3B1F" }}>
            Printing isn&apos;t available here. Your report is shown below; open clearcme.ai in your browser to print or save it.
          </p>
        )}
        <p className="app-only" style={{ flexBasis: "100%", margin: 0, fontSize: 12, color: "#656C60" }}>
          If Print does nothing in the app, open clearcme.ai in Safari to print or save this report.
        </p>
      </div>
      <iframe
        ref={frameRef}
        title="Compliance report"
        srcDoc={html}
        // No allow-scripts: certificate text can never run as code. allow-modals lets Print open.
        sandbox="allow-same-origin allow-modals"
        style={{ flex: 1, width: "100%", border: 0, background: "#FFFFFF" }}
      />
    </div>,
    document.body,
  );
}
