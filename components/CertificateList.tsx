"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DeleteCertButton from "@/components/DeleteCertButton";
import VerifiedProviderBadge from "@/components/VerifiedProviderBadge";
import { formatDateUTC } from "@/lib/dates";

interface Cert {
  id: string;
  title?: string | null;
  courseName?: string | null;
  fileName?: string | null;
  provider?: string | null;
  providerName?: string | null;
  activityDate: Date | string | null;
  creditHours: number | null;
  extractionStatus: string;
  extractionError?: string | null;
  specialTopics?: string[];
  creditType?: string | null;
}

interface Props {
  certs: Cert[];
  totalCount: number;
  showViewAll?: boolean;
  /** Map of certId → state codes where the cert counts */
  sharedCredits?: Record<string, string[]>;
}

const CREDIT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "AMA_PRA_1", label: "AMA PRA Category 1" },
  { value: "AMA_PRA_2", label: "AMA PRA Category 2" },
  { value: "AAFP_PRESCRIBED", label: "AAFP Prescribed" },
  { value: "AAFP_ELECTIVE", label: "AAFP Elective" },
  { value: "AOA_1_A", label: "AOA Category 1-A" },
  { value: "AOA_1_B", label: "AOA Category 1-B" },
  { value: "AOA_2_A", label: "AOA Category 2-A" },
  { value: "AOA_2_B", label: "AOA Category 2-B" },
  { value: "OTHER", label: "Other" },
];

function StatusBadge({ status, creditHours }: { status: string; creditHours: number | null }) {
  if (status === "COMPLETED" && creditHours != null) {
    return (
      <span className="product-pill product-pill-met whitespace-nowrap">
        {creditHours.toFixed(1)} hrs
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="product-pill product-pill-met whitespace-nowrap">Completed</span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="product-pill product-pill-miss whitespace-nowrap">Extraction failed</span>
    );
  }
  if (status === "NEEDS_REVIEW") {
    return (
      <span className="product-pill product-pill-pending whitespace-nowrap">Review needed</span>
    );
  }
  return (
    <span className="product-pill product-pill-pending whitespace-nowrap">Processing</span>
  );
}

/** Format a Date/ISO string as the value an <input type="date"> expects. */
function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function ManualEntryForm({ cert, onSaved }: { cert: Cert; onSaved: () => void }) {
  const [fields, setFields] = useState({
    title: cert.title ?? "",
    provider: cert.provider ?? "",
    date: toDateInputValue(cert.activityDate),
    creditHours: cert.creditHours != null ? String(cert.creditHours) : "",
    creditType: cert.creditType ?? "AMA_PRA_1",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title || undefined,
          provider: fields.provider || undefined,
          activityDate: fields.date || undefined,
          creditHours: fields.creditHours ? parseFloat(fields.creditHours) : undefined,
          creditType: fields.creditType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Save failed");
      } else {
        onSaved();
      }
    } catch {
      setSaveError("Network error — please try again");
    }
    setSaving(false);
  };

  return (
    <div className="mt-3 space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-2)] p-4">
      <div>
        <label className="product-label">Course Title</label>
        <input
          type="text"
          value={fields.title}
          onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Advanced Cardiac Life Support"
          className="product-input"
        />
      </div>
      <div>
        <label className="product-label">Provider / Accreditor</label>
        <input
          type="text"
          value={fields.provider}
          onChange={(e) => setFields((f) => ({ ...f, provider: e.target.value }))}
          placeholder="e.g. American Heart Association"
          className="product-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="product-label">Completion Date</label>
          <input
            type="date"
            value={fields.date}
            onChange={(e) => setFields((f) => ({ ...f, date: e.target.value }))}
            className="product-input"
          />
        </div>
        <div>
          <label className="product-label">Hours of CME</label>
          <input
            type="number"
            min="0"
            step="0.25"
            value={fields.creditHours}
            onChange={(e) => setFields((f) => ({ ...f, creditHours: e.target.value }))}
            placeholder="e.g. 2.5"
            className="product-input"
          />
        </div>
      </div>
      <div>
        <label className="product-label">Credit Type</label>
        <select
          value={fields.creditType}
          onChange={(e) => setFields((f) => ({ ...f, creditType: e.target.value }))}
          className="product-input"
        >
          {CREDIT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {saveError && <p className="text-xs text-[var(--status-miss)]">{saveError}</p>}

      <button
        onClick={handleSave}
        disabled={saving || (!fields.title && !fields.provider && !fields.date && !fields.creditHours)}
        className="product-btn product-btn-brand w-full min-h-0 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save details"}
      </button>
    </div>
  );
}

function CertificateRow({
  cert,
  sharedStates,
  autoOpen,
}: {
  cert: Cert;
  sharedStates?: string[];
  autoOpen: boolean;
}) {
  const router = useRouter();
  const [manualEdit, setManualEdit] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpen) {
      rowRef.current?.scrollIntoView({ block: "center" });
    }
  }, [autoOpen]);

  // A #cert-<id> deep link opens the form without a click; saving closes it.
  const editing = (manualEdit || autoOpen) && !justSaved;

  const certificateTitle = cert.title ?? cert.courseName ?? cert.fileName ?? "Untitled certificate";
  const providerName = cert.provider ?? cert.providerName ?? "Unknown provider";
  const needsAttention = cert.extractionStatus === "FAILED" || cert.extractionStatus === "NEEDS_REVIEW";

  return (
    <div ref={rowRef} id={`cert-${cert.id}`} className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--ink)] text-sm truncate">
            {certificateTitle}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-3)]">
            <span>{providerName}</span>
            <VerifiedProviderBadge providerName={cert.provider ?? cert.providerName} />
            {cert.activityDate && (
              <span>
                {formatDateUTC(cert.activityDate, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          {sharedStates && sharedStates.length >= 2 && (
            <span className="product-pill product-pill-met mt-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Counts for: {sharedStates.join(", ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={cert.extractionStatus} creditHours={cert.creditHours} />
          <DeleteCertButton certId={cert.id} certTitle={certificateTitle} />
        </div>
      </div>

      {needsAttention && !justSaved && (
        <div className="mt-2">
          <p className="text-xs text-[var(--ink-2)]">
            {cert.extractionStatus === "FAILED"
              ? "We couldn't read this certificate automatically — enter the details manually and the hours still count."
              : "Some fields couldn't be read with confidence. Review and confirm the details so the hours count."}
            {cert.extractionError && (
              <span className="text-[var(--ink-3)]"> ({cert.extractionError})</span>
            )}
          </p>
          {editing ? (
            <ManualEntryForm
              cert={cert}
              onSaved={() => {
                setJustSaved(true);
                setManualEdit(false);
                router.refresh();
              }}
            />
          ) : (
            <button
              onClick={() => setManualEdit(true)}
              className="mt-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-2)]"
            >
              {cert.extractionStatus === "FAILED" ? "Enter details manually →" : "Review details →"}
            </button>
          )}
        </div>
      )}
      {justSaved && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--status-met)]">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Saved — these hours now count toward your requirements.
        </p>
      )}
    </div>
  );
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export default function CertificateList({ certs, totalCount, showViewAll = false, sharedCredits }: Props) {
  // /dashboard/certificates#cert-<id> deep-links (e.g. from the upload flow)
  // open that certificate's manual-entry form directly. useSyncExternalStore
  // keeps the server render hash-free, so hydration stays consistent.
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => ""
  );
  const attentionId = hash.match(/^#cert-(.+)$/)?.[1] ?? null;

  if (certs.length === 0) {
    return (
      <div className="product-card p-8 text-center">
        <div className="w-12 h-12 bg-[var(--bg-2)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[var(--ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-[var(--ink-2)] text-sm mb-4">No certificates yet.</p>
        <Link
          href="/dashboard/upload"
          className="product-btn product-btn-brand"
        >
          Upload your first →
        </Link>
      </div>
    );
  }

  return (
    <div className="product-card overflow-hidden">
      <div className="divide-y divide-[var(--line-soft)]">
        {certs.map((cert) => (
          <CertificateRow
            key={cert.id}
            cert={cert}
            sharedStates={sharedCredits?.[cert.id]}
            autoOpen={
              attentionId === cert.id &&
              (cert.extractionStatus === "FAILED" || cert.extractionStatus === "NEEDS_REVIEW")
            }
          />
        ))}
      </div>
      {showViewAll && totalCount > certs.length && (
        <div className="px-5 py-3 border-t border-[var(--line-soft)] bg-[var(--bg-2)]">
          <Link
            href="/dashboard/compliance"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-2)] font-medium"
          >
            View all {totalCount} certificates →
          </Link>
        </div>
      )}
    </div>
  );
}
