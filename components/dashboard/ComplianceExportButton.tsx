"use client";

import { useState } from "react";

interface LicenseExport {
  state: string;
  licenseType: string;
  renewalDate: string | null;
  totalHoursEarned: number;
  totalHoursNeeded: number;
  gapHours: number;
  isCompliant: boolean;
  mandatoryGaps: { topic: string; earned: number; needed: number; gap: number; isMet: boolean }[];
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
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildHtml(data: ExportData): string {
  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const licenseRows = data.licenses
    .map(
      (l) => `
      <div class="card">
        <div class="card-header">
          <strong>${l.state} — ${l.licenseType}</strong>
          <span class="badge ${l.isCompliant ? "badge-green" : "badge-amber"}">${l.isCompliant ? "✓ Compliant" : "⚠ Requirements Pending"}</span>
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
                <span>${g.isMet ? "✅" : "⚠️"} ${formatTopic(g.topic)}</span>
                <span>${g.earned.toFixed(1)} / ${g.needed.toFixed(0)} hrs${!g.isMet ? ` (${g.gap.toFixed(1)} hrs needed)` : ""}</span>
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
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1E2920; padding: 40px; font-size: 13px; background: #FFFDF6; }
    h1 { font-size: 22px; font-weight: 800; color: #1E2920; }
    h2 { font-size: 15px; font-weight: 700; color: #3F4A40; margin: 28px 0 12px; border-bottom: 2px solid #DDD4BD; padding-bottom: 6px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #3F5F33; padding-bottom: 16px; }
    .brand { font-family: Fraunces, Georgia, serif; font-size: 24px; font-weight: 900; color: #1E2920; }
    .brand span { color: #3F5F33; }
    .meta { text-align: right; color: #6B7568; font-size: 12px; }
    .card { background: #F4EFE3; border: 1px solid #DDD4BD; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .badge-green { background: rgba(107,142,102,.18); color: #6B8E66; }
    .badge-amber { background: rgba(201,147,60,.18); color: #A87729; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    table td { padding: 4px 8px; }
    table td:first-child { color: #6B7568; width: 40%; }
    .topics { margin-top: 12px; }
    .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7568; margin-bottom: 6px; }
    .topic-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #ECE3CA; }
    .topic-row.gap { color: #A87729; }
    .topic-row.met { color: #6B8E66; }
    .certs-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .certs-table th { text-align: left; padding: 6px 8px; background: #ECE4CF; font-weight: 600; color: #6B7568; font-size: 11px; text-transform: uppercase; }
    .certs-table td { padding: 6px 8px; border-bottom: 1px solid #ECE3CA; }
    .summary-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .summary-tile { flex: 1; background: #F4EFE3; border: 1px solid #DDD4BD; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-tile .val { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 22px; font-weight: 800; color: #3F5F33; }
    .summary-tile .lbl { font-size: 11px; color: #6B7568; margin-top: 2px; }
    .footer { margin-top: 32px; color: #95A092; font-size: 11px; text-align: center; border-top: 1px solid #DDD4BD; padding-top: 12px; }
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
      <div class="val">${data.licenses.every((l) => l.isCompliant) ? "✓" : "⚠"}</div>
      <div class="lbl">Overall Status</div>
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

export default function ComplianceExportButton({ exportData }: { exportData: ExportData }) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    try {
      const html = buildHtml(exportData);
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        alert("Please allow pop-ups to download your compliance report.");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        setLoading(false);
      };
      // Fallback if onload doesn't fire
      setTimeout(() => setLoading(false), 2000);
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="product-btn product-btn-secondary px-4 py-2.5 text-sm disabled:opacity-60"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {loading ? "Preparing…" : "Download Compliance Report"}
    </button>
  );
}
