"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";

interface ExtractedCredit {
  title: string;
  provider: string;
  date: string;
  creditHours: number;
  creditType: string;
  topics: string[];
  accreditation: string;
}

interface UploadedCert {
  id: string;
  fileName: string;
  extracted: ExtractedCredit | null;
  extractionFailed?: boolean;
  needsReview?: boolean;
  warning?: string;
  error?: string;
}

type UploadState = "idle" | "uploading" | "done" | "error";

const TOPIC_FORMAT: Record<string, string> = {
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
};

function formatTopicLabel(topic: string) {
  return TOPIC_FORMAT[topic] ?? topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CertificateUpload() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [uploadedCerts, setUploadedCerts] = useState<UploadedCert[]>([]);
  const [currentFileName, setCurrentFileName] = useState("");

  const uploadFile = async (file: File): Promise<UploadedCert | null> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/certificates", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      return {
        id: crypto.randomUUID(),
        fileName: file.name,
        extracted: null,
        error: err.error ?? "Upload failed",
      };
    }

    const data = await res.json();
    const cert = data.certificate;

    const isNeedsReview = cert.extractionStatus === "NEEDS_REVIEW";
    const hasExtracted = cert.extractionStatus === "COMPLETED" || isNeedsReview;

    return {
      id: cert.id,
      fileName: cert.fileName,
      extracted: hasExtracted
        ? {
            title: cert.title ?? "",
            provider: cert.provider ?? "",
            date: cert.activityDate
              ? new Date(cert.activityDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Unknown date",
            creditHours: cert.creditHours ?? 0,
            creditType: cert.creditType ?? "OTHER",
            topics: cert.topics ?? [],
            accreditation: cert.accreditation ?? "",
          }
        : null,
      extractionFailed: cert.extractionStatus === "FAILED",
      needsReview: isNeedsReview,
      warning: data.warning,
    };
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploadState("uploading");
      setProgress(0);
      setUploadedCerts([]);

      const results: UploadedCert[] = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setCurrentFileName(file.name);
        setProgress(Math.round(((i) / acceptedFiles.length) * 80));

        const result = await uploadFile(file);
        if (result) results.push(result);

        setProgress(Math.round(((i + 1) / acceptedFiles.length) * 100));
      }

      setUploadedCerts(results);
      setUploadState("done");
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: uploadState === "uploading",
  });

  const processedCerts = uploadedCerts.filter((cert) => !cert.error);
  const extractedCerts = uploadedCerts.filter((cert) => cert.extracted && !cert.error);
  const failedCerts = uploadedCerts.filter((cert) => cert.error || cert.extractionFailed);
  const totalCreditsAdded = extractedCerts.reduce(
    (sum, cert) => sum + (cert.extracted?.creditHours ?? 0),
    0,
  );
  const detectedTopics = Array.from(
    new Set(extractedCerts.flatMap((cert) => cert.extracted?.topics ?? [])),
  );

  const reset = () => {
    setUploadState("idle");
    setProgress(0);
    setUploadedCerts([]);
    setCurrentFileName("");
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      {uploadState !== "done" && (
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-[var(--radius-lg)] p-10 text-center transition-all cursor-pointer ${
            isDragActive
              ? "border-[var(--primary)] bg-[rgba(63,95,51,0.10)]"
              : uploadState === "uploading"
              ? "border-[var(--line)] bg-[var(--bg-2)] cursor-not-allowed"
              : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--primary)] hover:bg-[rgba(63,95,51,0.08)]"
          }`}
        >
          <input {...getInputProps()} />

          {uploadState === "uploading" ? (
              <div className="space-y-4">
              <div className="w-12 h-12 border-4 border-[rgba(63,95,51,0.18)] border-t-[var(--primary)] rounded-full animate-spin mx-auto" />
              <div>
                <p className="font-medium text-[var(--ink-2)] text-sm">
                  Uploading &amp; extracting…
                </p>
                <p className="text-xs text-[var(--ink-3)] mt-1 truncate max-w-xs mx-auto">
                  {currentFileName}
                </p>
              </div>
              {/* Progress bar */}
              <div className="max-w-xs mx-auto">
                <div className="product-progress">
                  <div
                    className="product-progress-fill transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--ink-3)] mt-1">{progress}%</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-[var(--bg-2)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[var(--ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="font-display text-xl font-semibold text-[var(--ink)] mb-1">
                {isDragActive ? "Drop it here" : "Drag & drop certificates"}
              </p>
              <p className="text-sm text-[var(--ink-2)] mb-4">
                or click to browse files
              </p>
              <p className="text-xs text-[var(--ink-3)]">
                PDF, JPG, PNG — up to 10MB each
              </p>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {uploadState === "done" && uploadedCerts.length > 0 && (
        <div className="space-y-4">
          <div className="product-callout-brand p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="product-callout-eye">
                  Compliance Updated
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold text-[var(--ink)]">
                  Your CME record was refreshed after upload
                </h3>
                <p className="mt-1 text-sm text-[var(--ink-2)]">
                  {extractedCerts.length > 0
                    ? `${totalCreditsAdded.toFixed(1)} credit${totalCreditsAdded === 1 ? "" : "s"} added across ${extractedCerts.length} certificate${extractedCerts.length === 1 ? "" : "s"}.`
                    : "No credits were added yet — review the certificate details below to finish saving them."}
                </p>
              </div>

              <Link
                href="/dashboard/compliance"
                className="product-btn product-btn-brand"
              >
                See updated gaps →
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius)] bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Processed</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[var(--ink)]">{processedCerts.length}</p>
              </div>
              <div className="rounded-[var(--radius)] bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Credits added</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[var(--primary)]">{totalCreditsAdded.toFixed(1)}</p>
              </div>
              <div className="rounded-[var(--radius)] bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Needs review</p>
                <p className={`mt-1 font-mono text-2xl font-semibold ${failedCerts.length > 0 ? "text-[var(--status-pending)]" : "text-[var(--status-met)]"}`}>
                  {failedCerts.length}
                </p>
              </div>
            </div>

            {detectedTopics.length > 0 && (
              <p className="mt-3 text-xs text-[var(--ink-3)]">
                Mandatory-topic matches detected: {detectedTopics.map(formatTopicLabel).join(", ")}.
              </p>
            )}
          </div>

          {uploadedCerts.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--ink)]">
                {`${uploadedCerts.length} certificates processed`}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="product-btn product-btn-secondary min-h-0 px-3 py-1.5 text-sm"
                >
                  Upload Another Certificate
                </button>
                <Link
                  href="/dashboard/compliance"
                  className="product-btn product-btn-brand min-h-0 px-3 py-1.5 text-sm"
                >
                  View My Compliance →
                </Link>
              </div>
            </div>
          )}

          {uploadedCerts.map((cert) => (
            <div key={cert.id}>
              {cert.error ? (
                <div className="bg-[var(--status-miss-bg)] border border-[rgba(221,107,64,0.28)] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-[var(--status-miss)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-[var(--ink)] text-sm">{cert.fileName}</p>
                  </div>
                  <p className="text-sm text-[var(--status-miss)]">{cert.error}</p>
                </div>
              ) : cert.needsReview && cert.extracted ? (
                <NeedsReviewCard cert={cert} onReset={reset} />
              ) : cert.extractionFailed ? (
                <ExtractionFailedCard cert={cert} />
              ) : cert.extracted ? (
                <ExtractedCreditCard cert={cert} onReset={reset} />
              ) : (
                <div className="product-callout-warm p-5">
                  <p className="text-sm text-[var(--ink-2)]">
                    <strong>{cert.fileName}</strong> — uploaded but extraction is pending.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NeedsReviewCard({ cert, onReset }: { cert: UploadedCert; onReset: () => void }) {
  const ex = cert.extracted!;
  const [fields, setFields] = useState({
    title: ex.title ?? "",
    provider: ex.provider ?? "",
    date: "",
    creditHours: ex.creditHours ? String(ex.creditHours) : "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleConfirm = async () => {
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
          extractionStatus: "COMPLETED",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error ?? "Save failed");
      } else {
        setSaved(true);
      }
    } catch {
      setSaveError("Network error — please try again");
    }
    setSaving(false);
  };

  return (
    <div className="product-callout-warm overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-[rgba(201,147,60,0.34)] bg-[rgba(201,147,60,0.12)]">
        <svg className="w-4 h-4 text-[var(--status-pending)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm font-semibold text-[var(--ink)]">Review &amp; Confirm</span>
        <span className="ml-auto text-xs text-[var(--ink-3)] truncate max-w-[150px]">{cert.fileName}</span>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-[var(--ink-2)]">
          {cert.warning ?? "Some fields could not be extracted with confidence. Please review and confirm."}
        </p>

        {saved ? (
          <div className="flex items-center gap-2 text-[var(--status-met)] text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Confirmed and saved.
          </div>
        ) : (
          <div className="space-y-3">
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
                <label className="product-label">Credit Hours</label>
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

            {saveError && <p className="text-xs text-[var(--status-miss)]">{saveError}</p>}

            <div className="flex gap-2">
              <button
                onClick={onReset}
                className="product-btn product-btn-secondary flex-1 min-h-0 py-2 text-sm"
              >
                Upload another
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="product-btn product-btn-urgent flex-1 min-h-0 py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm & Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractionFailedCard({ cert }: { cert: UploadedCert }) {
  const [fields, setFields] = useState({
    title: "",
    provider: "",
    date: "",
    creditHours: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error ?? "Save failed");
      } else {
        setSaved(true);
      }
    } catch {
      setSaveError("Network error — please try again");
    }
    setSaving(false);
  };

  return (
    <div className="product-callout-warm overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-[rgba(201,147,60,0.34)] bg-[rgba(201,147,60,0.12)]">
        <svg className="w-4 h-4 text-[var(--status-pending)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm font-medium text-[var(--ink)]">Couldn&apos;t read this certificate automatically</span>
        <span className="ml-auto text-xs text-[var(--ink-3)] truncate max-w-[150px]">{cert.fileName}</span>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-[var(--ink-2)]">
          We couldn&apos;t automatically read this certificate. You can edit the details manually below.
        </p>

        {saved ? (
          <div className="flex items-center gap-2 text-[var(--status-met)] text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Details saved successfully.
          </div>
        ) : (
          <div className="space-y-3">
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
                <label className="product-label">Credit Hours</label>
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

            {saveError && (
              <p className="text-xs text-[var(--status-miss)]">{saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || (!fields.title && !fields.provider && !fields.date && !fields.creditHours)}
              className="product-btn product-btn-primary w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Details"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractedCreditCard({ cert, onReset }: { cert: UploadedCert; onReset: () => void }) {
  const ex = cert.extracted!;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fields, setFields] = useState({
    title: ex.title ?? "",
    provider: ex.provider ?? "",
    date: "",
    creditHours: ex.creditHours ? String(ex.creditHours) : "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const CREDIT_LABELS: Record<string, string> = {
    AMA_PRA_1: "AMA PRA Category 1",
    AMA_PRA_2: "AMA PRA Category 2",
    AAFP_PRESCRIBED: "AAFP Prescribed",
    AAFP_ELECTIVE: "AAFP Elective",
    AOA_1_A: "AOA Category 1-A",
    OTHER: "Other",
  };

  const creditLabel = CREDIT_LABELS[ex.creditType] ?? ex.creditType;

  const TOPIC_FORMAT: Record<string, string> = {
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
  };

  const handleFixSave = async () => {
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
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error ?? "Save failed");
      } else {
        setShowAdvanced(false);
        setConfirmed(true);
      }
    } catch {
      setSaveError("Network error — please try again");
    }
    setSaving(false);
  };

  return (
    <div className="product-card overflow-hidden">
      {/* Hero header */}
      <div className="bg-[linear-gradient(135deg,var(--primary),var(--primary-2))] px-6 py-8 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-white mb-1">✓ Certificate Processed</h2>
        <p className="text-[rgba(244,239,227,0.82)] text-sm">AI successfully extracted your CME credit</p>
      </div>

      {/* Receipt body */}
      <div className="px-6 py-6 space-y-5">
        {/* Layer 1: Summary view (default) */}
        {!showAdvanced && (
          <>
            {/* Course title — large and prominent */}
            <div className="text-center border-b border-[var(--line-soft)] pb-5">
              <p className="product-page-eye mb-2">Course</p>
              <p className="font-display text-xl font-semibold text-[var(--ink)] leading-snug">{ex.title}</p>
              <p className="text-base text-[var(--ink-2)] mt-1">{ex.provider}</p>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-2)] rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1">Completed</p>
                <p className="text-base font-semibold text-[var(--ink)]">{ex.date}</p>
              </div>
              <div className="bg-[rgba(63,95,51,0.10)] rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide mb-1">Credits Earned</p>
                <p className="font-mono text-3xl font-semibold text-[var(--primary)] leading-none">{ex.creditHours.toFixed(1)}</p>
                <p className="text-xs text-[var(--primary)] mt-1 font-medium">{creditLabel} Credits</p>
              </div>
            </div>

            {/* Mandatory topics */}
            {ex.topics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Mandatory Topics Detected</p>
                <div className="flex flex-wrap gap-2">
                  {ex.topics.map((t) => (
                    <span
                      key={t}
                      className="product-pill product-pill-met"
                    >
                      <span className="w-1.5 h-1.5 bg-[var(--status-met)] rounded-full" />
                      {TOPIC_FORMAT[t] ?? t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {confirmed ? (
              <>
                {/* Confirmation message */}
                <div className="flex items-center gap-3 bg-[var(--status-met-bg)] border border-[rgba(107,142,102,0.34)] rounded-[var(--radius)] px-4 py-3">
                  <svg className="w-4 h-4 text-[var(--status-met)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-sm text-[var(--ink)] font-medium">
                    This certificate has been added to your compliance record.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={onReset}
                    className="product-btn product-btn-secondary flex-1"
                  >
                    Upload Another
                  </button>
                  <Link
                    href="/dashboard/compliance"
                    className="product-btn product-btn-brand flex-1"
                  >
                    View My Compliance →
                  </Link>
                </div>
              </>
            ) : (
              <>
                {/* Layer 1 action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={() => setConfirmed(true)}
                    className="product-btn product-btn-brand flex-1"
                  >
                    Looks good ✓
                  </button>
                  <button
                    onClick={() => setShowAdvanced(true)}
                    className="product-btn product-btn-secondary flex-1"
                  >
                    Fix something
                  </button>
                </div>

                {/* Trust note */}
                <p className="text-xs text-[var(--ink-3)] text-center">
                  Your certificate is encrypted in transit and at rest · AI extraction takes ~10 seconds
                </p>
              </>
            )}
          </>
        )}

        {/* Layer 2: Edit fields (revealed when "Fix something" is clicked) */}
        {showAdvanced && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[var(--ink)]">Edit extracted details</h3>
              <button
                onClick={() => setShowAdvanced(false)}
                className="text-sm text-[var(--primary)] hover:text-[var(--primary-2)] font-medium"
              >
                ← Back
              </button>
            </div>

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
                <label className="product-label">Credit Hours</label>
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

            {saveError && <p className="text-xs text-[var(--status-miss)]">{saveError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdvanced(false)}
                className="product-btn product-btn-secondary flex-1 min-h-0 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFixSave}
                disabled={saving}
                className="product-btn product-btn-primary flex-1 min-h-0 py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
