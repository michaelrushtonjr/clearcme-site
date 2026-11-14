"use client";

import { useId, useCallback, useState } from "react";
import { uploadCertificate } from "@/lib/certificate-upload-client";
import { useDropzone, type FileRejection } from "react-dropzone";
import Link from "next/link";
import UpgradeNotice from "@/components/UpgradeNotice";
import { TopicHoursFields, useTopicSplit } from "@/components/CertificateTopicHours";
import { detectedTopics, formatSpecialTopic, reviewPrefill, topicAllocationsFromSplit } from "@/lib/certificate-review";
import { formatDateUTC } from "@/lib/dates";

interface ExtractedCredit {
  title: string;
  provider: string;
  date: string;
  creditHours: number;
  creditType: string;
  topics: string[];
  accreditation: string;
  /** ISO completion date as the server returned it — pre-fills the review form. */
  activityDate?: string | null;
  /** Hours this physician earned, when the certificate states them. */
  hoursEarned?: number | null;
  /** The activity's maximum hours — offered as a suggestion when earned hours are missing. */
  activityMaxHours?: number | null;
  /** Mandated topics the server detected (SpecialTopic values), not free-text subjects. */
  mandatedTopics?: string[];
}

export interface UploadedCert {
  id: string;
  fileName: string;
  extracted: ExtractedCredit | null;
  extractionFailed?: boolean;
  needsReview?: boolean;
  warning?: string;
  error?: string;
  upgradeRequired?: boolean;
  upgradeReason?: "slots" | "attempts";
}

type UploadState = "idle" | "uploading" | "done" | "error";

export function certificateRejectionMessage(errors: FileRejection["errors"]): string {
  if (errors.some((error) => error.code === "file-too-large")) return "File too large. Choose a file under 10 MB.";
  if (errors.some((error) => error.code === "file-invalid-type")) return "Unsupported file type. Choose a PDF, JPG, or PNG.";
  return "This file couldn't be added. Choose another file and try again.";
}

/** How a certificate uploaded in this session ended up once the user acted on it. */
export interface UploadResolution {
  id: string;
  fileName: string;
  outcome: "confirmed" | "pending";
  hours: number;
  /** Mandated topics the physician confirmed hours for. */
  topics: string[];
  /** Detected mandated topics saved without confirmed hours. */
  topicsToConfirm?: string[];
}

/**
 * The session summary shown above the uploader. Only resolved certificates
 * count: "confirmed" once the user saved it and the server marked it
 * COMPLETED, "pending" when they moved on ("Upload another") while it still
 * needed review. A certificate whose review form is still open counts as
 * neither — nothing is claimed until it is confirmed and saved.
 */
export function summarizeUploadSession(resolutions: UploadResolution[]) {
  const confirmed = resolutions.filter((r) => r.outcome === "confirmed");
  const pending = resolutions.filter((r) => r.outcome === "pending");
  const topics = Array.from(new Set(confirmed.flatMap((r) => r.topics)));
  return {
    confirmedCount: confirmed.length,
    pendingCount: pending.length,
    hoursAdded: confirmed.reduce((sum, r) => sum + r.hours, 0),
    topics,
    // A topic confirmed on one certificate is not "still to confirm" because another certificate skipped it.
    topicsToConfirm: Array.from(new Set(confirmed.flatMap((r) => r.topicsToConfirm ?? []))).filter((t) => !topics.includes(t)),
  };
}

/** Certificates the user left unresolved when moving on still need review. */
export function deferUnresolved(
  certs: UploadedCert[],
  resolved: Record<string, UploadResolution>,
): Record<string, UploadResolution> {
  const next = { ...resolved };
  for (const cert of certs) {
    if (next[cert.id] || cert.error || cert.upgradeRequired) continue;
    if (cert.needsReview || cert.extractionFailed) {
      next[cert.id] = { id: cert.id, fileName: cert.fileName, outcome: "pending", hours: 0, topics: [] };
    }
  }
  return next;
}

/** Reads a PATCH /api/certificates/:id response into a resolution, or null if still under review. */
export function resolutionFromSave(cert: UploadedCert, data: unknown, fallbackHours: number): UploadResolution | null {
  const saved = (data as { certificate?: { extractionStatus?: string; creditHours?: number | null; specialTopics?: string[]; suggestedSpecialTopics?: string[] } } | null)?.certificate;
  if (saved?.extractionStatus !== "COMPLETED") return null;
  const hours = typeof saved.creditHours === "number" ? saved.creditHours : fallbackHours;
  // The server's answer is the record: specialTopics are the topics the physician
  // confirmed hours for; suggestedSpecialTopics are matches still unconfirmed.
  return {
    id: cert.id, fileName: cert.fileName, outcome: "confirmed", hours,
    topics: saved.specialTopics ?? [],
    topicsToConfirm: saved.suggestedSpecialTopics ?? [],
  };
}

/** The certificate fields POST /api/certificates returns that the review cards read. */
export interface UploadResponseCertificate {
  id: string;
  fileName: string;
  extractionStatus: string;
  title?: string | null;
  provider?: string | null;
  activityDate?: string | null;
  creditHours?: number | null;
  hoursEarned?: number | null;
  activityMaxHours?: number | null;
  creditType?: string | null;
  topics?: string[] | null;
  accreditation?: string | null;
  specialTopics?: string[] | null;
  extractedSpecialTopics?: string[] | null;
  suggestedSpecialTopics?: string[] | null;
}

/** Keeps everything the server read, so the review form can start from it instead of from blanks. */
export function uploadedCertFromResponse(cert: UploadResponseCertificate, warning?: string): UploadedCert {
  const isNeedsReview = cert.extractionStatus === "NEEDS_REVIEW";
  const hasExtracted = cert.extractionStatus === "COMPLETED" || isNeedsReview;
  return {
    id: cert.id,
    fileName: cert.fileName,
    extracted: hasExtracted
      ? {
          title: cert.title ?? "",
          provider: cert.provider ?? "",
          date: cert.activityDate ? formatDateUTC(cert.activityDate) : "Unknown date",
          creditHours: cert.creditHours ?? 0,
          creditType: cert.creditType ?? "OTHER",
          topics: cert.topics ?? [],
          accreditation: cert.accreditation ?? "",
          activityDate: cert.activityDate ?? null,
          hoursEarned: cert.hoursEarned ?? null,
          activityMaxHours: cert.activityMaxHours ?? null,
          mandatedTopics: detectedTopics(cert),
        }
      : null,
    extractionFailed: cert.extractionStatus === "FAILED",
    needsReview: isNeedsReview,
    warning,
  };
}

const STILL_NEEDS_REVIEW = "Saved, but this certificate still needs review — check the completion date and hours, then confirm again.";

export default function CertificateUpload({ userId }: { userId: string }) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [uploadedCerts, setUploadedCerts] = useState<UploadedCert[]>([]);
  const [currentFileName, setCurrentFileName] = useState("");
  // Session ledger: what each uploaded certificate became once the user acted on it.
  const [resolved, setResolved] = useState<Record<string, UploadResolution>>({});
  const recordResolution = useCallback(
    (resolution: UploadResolution) => setResolved((prev) => ({ ...prev, [resolution.id]: resolution })),
    [],
  );

  const uploadFile = useCallback(async (file: File): Promise<UploadedCert | null> => {
    const res = await uploadCertificate(file, userId);

    if (res.status === 402) {
      // Free extraction limit reached — render as an upgrade prompt, not an error
      const err = await res.json().catch(() => ({}));
      return {
        id: crypto.randomUUID(),
        fileName: file.name,
        extracted: null,
        upgradeRequired: true,
        upgradeReason: err.reason === "attempts" ? "attempts" : "slots",
      };
    }

    if (!res.ok) {
      // Gateway timeouts and proxy errors return non-JSON bodies — never let
      // parsing them throw past the upload loop (that froze the spinner).
      const err = await res.json().catch(() => ({} as { error?: string }));
      return {
        id: crypto.randomUUID(),
        fileName: file.name,
        extracted: null,
        error: err.error ?? "Upload failed",
      };
    }

    const data = await res.json();
    return uploadedCertFromResponse(data.certificate, data.warning);
  }, [userId]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (acceptedFiles.length === 0 && fileRejections.length === 0) return;

      setUploadState("uploading");
      setProgress(0);
      setUploadedCerts([]);

      const results: UploadedCert[] = fileRejections.map(({ file, errors }) => ({
        id: crypto.randomUUID(), fileName: file.name, extracted: null,
        error: certificateRejectionMessage(errors),
      }));

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setCurrentFileName(file.name);
        setProgress(Math.round(((i) / acceptedFiles.length) * 80));

        // A dropped connection or killed serverless function rejects the
        // fetch — surface it as a failed row instead of spinning forever.
        let result: UploadedCert | null = null;
        try {
          result = await uploadFile(file);
        } catch (error) {
          result = {
            id: crypto.randomUUID(),
            fileName: file.name,
            extracted: null,
            error: error instanceof Error ? error.message : "The upload did not complete. Please try again.",
          };
        }
        if (result) results.push(result);

        setProgress(Math.round(((i + 1) / acceptedFiles.length) * 100));

        // Once the extraction limit is hit, every remaining file would be
        // blocked too — stop rather than issuing doomed requests.
        if (result?.upgradeRequired) break;
      }

      setUploadedCerts(results);
      setUploadState("done");
    },
    [uploadFile]
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

  const visibleCerts = uploadedCerts.filter((cert) => !cert.upgradeRequired);
  const blockedCert = uploadedCerts.find((cert) => cert.upgradeRequired);
  const summary = summarizeUploadSession(Object.values(resolved));
  const showSummary = summary.confirmedCount > 0 || summary.pendingCount > 0;

  const reset = () => {
    // Moving on without confirming leaves those certificates pending review.
    setResolved((prev) => deferUnresolved(uploadedCerts, prev));
    setUploadState("idle");
    setProgress(0);
    setUploadedCerts([]);
    setCurrentFileName("");
  };

  return (
    <div className="space-y-6">
      {/* Session summary — only certificates the user has confirmed, or left pending */}
      {showSummary && (
        <div className="product-callout-brand p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="product-callout-eye">
                {summary.confirmedCount > 0 ? "Compliance Updated" : "Pending Your Review"}
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-[var(--ink)]">
                {summary.confirmedCount > 0 ? "Your CME record was refreshed" : "Nothing added to your record yet"}
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                {summary.confirmedCount > 0 &&
                  `${summary.hoursAdded.toFixed(1)} hour${summary.hoursAdded === 1 ? "" : "s"} added across ${summary.confirmedCount} certificate${summary.confirmedCount === 1 ? "" : "s"}.`}
                {summary.confirmedCount > 0 && summary.pendingCount > 0 && " "}
                {summary.pendingCount > 0 &&
                  `${summary.pendingCount} certificate${summary.pendingCount === 1 ? " is" : "s are"} waiting for your review — nothing counts until you confirm it.`}
              </p>
            </div>

            <Link
              href={summary.pendingCount > 0 ? "/dashboard/certificates" : "/dashboard/compliance"}
              className="product-btn product-btn-brand shrink-0 whitespace-nowrap"
            >
              {summary.pendingCount > 0 ? "Finish reviewing →" : "See updated gaps →"}
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius)] bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Confirmed</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--ink)]">{summary.confirmedCount}</p>
            </div>
            <div className="rounded-[var(--radius)] bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Hours added</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--primary)]">{summary.hoursAdded.toFixed(1)}</p>
            </div>
            <div className="rounded-[var(--radius)] bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Needs review</p>
              <p className={`mt-1 font-mono text-2xl font-semibold ${summary.pendingCount > 0 ? "text-[var(--status-pending)]" : "text-[var(--status-met)]"}`}>
                {summary.pendingCount}
              </p>
            </div>
          </div>

          {summary.topics.length > 0 && (
            <p className="mt-3 text-xs text-[var(--ink-3)]">
              Topic hours confirmed for: {summary.topics.map(formatSpecialTopic).join(", ")}.
            </p>
          )}
          {summary.topicsToConfirm.length > 0 && (
            <p className="mt-3 text-xs text-[var(--ink-3)]">
              Possible mandated-topic match saved without topic hours: {summary.topicsToConfirm.map(formatSpecialTopic).join(", ")}.{" "}
              <Link href="/dashboard/certificates" className="font-medium text-[var(--primary)] underline underline-offset-2">
                Confirm the hours on your Certificates page
              </Link>
              .
            </p>
          )}
        </div>
      )}

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
                PDF, JPG, PNG — up to 10MB each. CME certificates only — never upload patient information.
              </p>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {uploadState === "done" && uploadedCerts.length > 0 && (
        <div className="space-y-4">
          {blockedCert && <UpgradeNotice feature="extraction" reason={blockedCert.upgradeReason} />}

          {visibleCerts.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--ink)]">
                {`${visibleCerts.length} certificates processed`}
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

          {visibleCerts.map((cert) => (
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
                  <button onClick={reset} className="product-btn product-btn-secondary mt-3">
                    Choose another file
                  </button>
                </div>
              ) : cert.needsReview && cert.extracted ? (
                <NeedsReviewCard cert={cert} onReset={reset} onResolved={recordResolution} />
              ) : cert.extractionFailed ? (
                <ExtractionFailedCard cert={cert} onReset={reset} onResolved={recordResolution} />
              ) : cert.extracted ? (
                <ExtractedCreditCard cert={cert} onReset={reset} onResolved={recordResolution} />
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

interface ReviewFields {
  title: string;
  provider: string;
  date: string;
  creditHours: string;
}

/**
 * What the review form starts with: the date and hours the server read, and —
 * when the certificate shows only the activity's maximum — that maximum as a
 * labelled suggestion. Nothing is saved until the physician presses the button.
 */
function initialReviewFields(cert: UploadedCert): ReviewFields {
  const ex = cert.extracted;
  const prefill = reviewPrefill({
    activityDate: ex?.activityDate,
    hoursEarned: ex?.hoursEarned,
    creditHours: ex?.creditHours,
    activityMaxHours: ex?.activityMaxHours,
  });
  return { title: ex?.title ?? "", provider: ex?.provider ?? "", date: prefill.date, creditHours: prefill.hours };
}

function hoursOf(fields: ReviewFields): number | null {
  const hours = parseFloat(fields.creditHours);
  return Number.isFinite(hours) ? hours : null;
}

/** True while the hours field still holds the activity maximum the form suggested. */
function showsMaximumSuggestion(cert: UploadedCert, fields: ReviewFields): boolean {
  const ex = cert.extracted;
  const prefill = reviewPrefill({ hoursEarned: ex?.hoursEarned, creditHours: ex?.creditHours, activityMaxHours: ex?.activityMaxHours });
  return prefill.hoursSource === "activity_maximum" && fields.creditHours === prefill.hours;
}

/** The PATCH body for a review form, or the message to show instead of saving. */
function reviewSaveBody(
  fields: ReviewFields,
  topics: string[],
  split: Record<string, string>,
): { body: Record<string, unknown>; error: null } | { body: null; error: string } {
  const hours = hoursOf(fields);
  const topicHours = topics.length > 0 ? topicAllocationsFromSplit(split, hours) : { allocations: {}, error: null };
  if (topicHours.error) return { body: null, error: topicHours.error };
  return {
    error: null,
    body: {
      title: fields.title || undefined,
      provider: fields.provider || undefined,
      activityDate: fields.date || undefined,
      creditHours: fields.creditHours ? parseFloat(fields.creditHours) : undefined,
      ...(Object.keys(topicHours.allocations).length > 0 ? { topicHourAllocations: topicHours.allocations } : {}),
    },
  };
}

/** Title, provider, date, hours and topic hours — the same fields on every review card. */
function ReviewFormFields({
  formId,
  cert,
  fields,
  setFields,
  topics,
  split,
  setTopicHours,
  disabled,
}: {
  formId: string;
  cert: UploadedCert;
  fields: ReviewFields;
  setFields: (update: (fields: ReviewFields) => ReviewFields) => void;
  topics: string[];
  split: Record<string, string>;
  setTopicHours: (topic: string, value: string) => void;
  disabled: boolean;
}) {
  const maximum = cert.extracted?.activityMaxHours ?? null;
  const suggested = showsMaximumSuggestion(cert, fields);

  return (
    <>
      <div>
        <label htmlFor={`${formId}-title`} className="product-label">Course Title</label>
        <input
          id={`${formId}-title`}
          type="text"
          value={fields.title}
          onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Advanced Cardiac Life Support"
          className="product-input"
        />
      </div>
      <div>
        <label htmlFor={`${formId}-provider`} className="product-label">Provider / Accreditor</label>
        <input
          id={`${formId}-provider`}
          type="text"
          value={fields.provider}
          onChange={(e) => setFields((f) => ({ ...f, provider: e.target.value }))}
          placeholder="e.g. American Heart Association"
          className="product-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${formId}-date`} className="product-label">Completion Date</label>
          <input
            id={`${formId}-date`}
            type="date"
            value={fields.date}
            onChange={(e) => setFields((f) => ({ ...f, date: e.target.value }))}
            className="product-input"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-hours`} className="product-label">Hours Earned</label>
          <input
            id={`${formId}-hours`}
            type="number"
            min="0"
            step="0.25"
            value={fields.creditHours}
            onChange={(e) => setFields((f) => ({ ...f, creditHours: e.target.value }))}
            placeholder="e.g. 2.5"
            aria-describedby={maximum != null ? `${formId}-hours-note` : undefined}
            className="product-input"
          />
        </div>
      </div>
      {maximum != null && (
        <p
          id={`${formId}-hours-note`}
          className={
            suggested
              ? "rounded-[var(--radius)] border border-[rgba(201,147,60,0.34)] bg-[rgba(201,147,60,0.12)] px-3 py-2 text-xs text-[var(--ink)]"
              : "text-xs text-[var(--ink-3)]"
          }
        >
          {suggested
            ? `This certificate shows the activity's maximum (${maximum} hours) but not how many hours you earned. We filled in ${maximum} as a starting point — change it if you claimed fewer. It is saved only when you confirm.`
            : `Activity maximum on this certificate: ${maximum} hours.`}
        </p>
      )}
      <TopicHoursFields
        idPrefix={formId}
        topics={topics}
        split={split}
        hours={hoursOf(fields)}
        onChange={setTopicHours}
        disabled={disabled}
      />
    </>
  );
}

export function NeedsReviewCard({ cert, onReset, onResolved }: { cert: UploadedCert; onReset: () => void; onResolved: (r: UploadResolution) => void }) {
  const formId = useId();
  const [fields, setFields] = useState<ReviewFields>(() => initialReviewFields(cert));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const topics = cert.extracted?.mandatedTopics ?? [];
  const { split, setTopicHours } = useTopicSplit(topics, hoursOf(fields));
  const suggested = showsMaximumSuggestion(cert, fields);

  const handleConfirm = async () => {
    const request = reviewSaveBody(fields, topics, split);
    if (request.error !== null) {
      setSaveError(request.error);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request.body, extractionStatus: "COMPLETED" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Save failed");
      } else {
        // The server keeps NEEDS_REVIEW when the fields don't validate — only
        // a COMPLETED response counts as confirmed.
        const resolution = resolutionFromSave(cert, await res.json().catch(() => null), parseFloat(fields.creditHours) || 0);
        if (resolution) {
          setSaved(true);
          onResolved(resolution);
        } else {
          setSaveError(STILL_NEEDS_REVIEW);
        }
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
        ) : null}
        {saved ? (
          <div className="flex gap-2">
            <button onClick={onReset} className="product-btn product-btn-secondary flex-1 min-h-0 py-2 text-sm">
              Upload another
            </button>
            <Link href="/dashboard/compliance" className="product-btn product-btn-brand flex-1 min-h-0 py-2 text-sm">
              View my compliance →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <ReviewFormFields
              formId={formId}
              cert={cert}
              fields={fields}
              setFields={setFields}
              topics={topics}
              split={split}
              setTopicHours={setTopicHours}
              disabled={saving}
            />

            {saveError && <p role="alert" className="text-xs text-[var(--status-miss)]">{saveError}</p>}

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
                {saving ? "Saving…" : suggested ? `Confirm ${fields.creditHours} hours & save` : "Confirm & Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExtractionFailedCard({ cert, onReset, onResolved }: { cert: UploadedCert; onReset: () => void; onResolved: (r: UploadResolution) => void }) {
  const formId = useId();
  const [fields, setFields] = useState<ReviewFields>(() => initialReviewFields(cert));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Nothing was read from a failed extraction, so there are no topics to confirm here.
  const topics: string[] = [];
  const { split, setTopicHours } = useTopicSplit(topics, hoursOf(fields));

  const handleSave = async () => {
    const request = reviewSaveBody(fields, topics, split);
    if (request.error !== null) {
      setSaveError(request.error);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Save failed");
      } else {
        const resolution = resolutionFromSave(cert, await res.json().catch(() => null), parseFloat(fields.creditHours) || 0);
        if (resolution) {
          setSaved(true);
          onResolved(resolution);
        } else {
          setSaveError(STILL_NEEDS_REVIEW);
        }
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
            <ReviewFormFields
              formId={formId}
              cert={cert}
              fields={fields}
              setFields={setFields}
              topics={topics}
              split={split}
              setTopicHours={setTopicHours}
              disabled={saving}
            />

            {saveError && (
              <p role="alert" className="text-xs text-[var(--status-miss)]">{saveError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={onReset}
                className="product-btn product-btn-secondary flex-1 min-h-0 py-2 text-sm"
              >
                Upload another
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (!fields.title && !fields.provider && !fields.date && !fields.creditHours)}
                className="product-btn product-btn-primary flex-1 min-h-0 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Details"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CREDIT_LABELS: Record<string, string> = {
  AMA_PRA_1: "AMA PRA Category 1",
  AMA_PRA_2: "AMA PRA Category 2",
  AAFP_PRESCRIBED: "AAFP Prescribed",
  AAFP_ELECTIVE: "AAFP Elective",
  AOA_1_A: "AOA Category 1-A",
  OTHER: "Other",
};

export function ExtractedCreditCard({ cert, onReset, onResolved }: { cert: UploadedCert; onReset: () => void; onResolved: (r: UploadResolution) => void }) {
  const formId = useId();
  const ex = cert.extracted!;
  // showAdvanced stays the first state: tests/app/dashboard/recovery-labels.test.ts opens "Fix something" by position.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmed, setConfirmed] = useState<UploadResolution | null>(null);
  const [fields, setFields] = useState<ReviewFields>(() => initialReviewFields(cert));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const topics = ex.mandatedTopics ?? [];
  const { split, setTopicHours } = useTopicSplit(topics, hoursOf(fields));

  const creditLabel = CREDIT_LABELS[ex.creditType] ?? ex.creditType;

  // "Looks good" and "Save Changes" both send the topic hours shown on the card,
  // so one click confirms the certificate and what it counts toward.
  const save = async (includeFields: boolean) => {
    const request = reviewSaveBody(fields, topics, split);
    if (request.error !== null) {
      setSaveError(request.error);
      return;
    }
    const body = includeFields
      ? request.body
      : "topicHourAllocations" in request.body
      ? { topicHourAllocations: request.body.topicHourAllocations }
      : {};
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) setSaveError(data?.error ?? "Save failed");
      else {
        const resolution = resolutionFromSave(cert, data, includeFields ? parseFloat(fields.creditHours) || 0 : ex.creditHours);
        if (resolution) {
          setShowAdvanced(false);
          setConfirmed(resolution);
          onResolved(resolution);
        } else setSaveError(STILL_NEEDS_REVIEW);
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
        <h2 className="font-display text-2xl font-semibold text-white mb-1">Certificate processed</h2>
        <p className="text-[rgba(244,239,227,0.82)] text-sm">AI read your CME hours from this certificate</p>
      </div>

      {/* Receipt body */}
      <div className="px-6 py-6 space-y-5">
        {/* Layer 1: Summary view (default) */}
        {!showAdvanced && (
          <>
            {/* Course title — large and prominent */}
            <div className="text-center border-b border-[var(--line-soft)] pb-5">
              <p className="product-page-eye mb-2">Course</p>
              <p className="font-display text-xl font-semibold text-[var(--ink)] leading-snug">{confirmed ? fields.title || ex.title : ex.title}</p>
              <p className="text-base text-[var(--ink-2)] mt-1">{confirmed ? fields.provider || ex.provider : ex.provider}</p>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-2)] rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1">Completed</p>
                <p className="text-base font-semibold text-[var(--ink)]">{confirmed && fields.date ? formatDateUTC(fields.date) : ex.date}</p>
              </div>
              <div className="bg-[rgba(63,95,51,0.10)] rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide mb-1">Hours Earned</p>
                <p className="font-mono text-3xl font-semibold text-[var(--primary)] leading-none">{(confirmed ? confirmed.hours : ex.creditHours).toFixed(1)}</p>
                <p className="text-xs text-[var(--primary)] mt-1 font-medium">{creditLabel}</p>
              </div>
            </div>

            {confirmed ? (
              <>
                {/* What the confirmed certificate counts toward */}
                {confirmed.topics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Counts toward</p>
                    <div className="flex flex-wrap gap-2">
                      {confirmed.topics.map((t) => (
                        <span key={t} className="product-pill product-pill-met">
                          <span className="w-1.5 h-1.5 bg-[var(--status-met)] rounded-full" />
                          {formatSpecialTopic(t)}
                          {split[t] && Number(split[t]) > 0 ? ` · ${Number(split[t])} hrs` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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
                {/* Mandated topics: confirm the hours here, on the same screen */}
                <TopicHoursFields
                  idPrefix={`${formId}-summary`}
                  topics={topics}
                  split={split}
                  hours={hoursOf(fields)}
                  onChange={setTopicHours}
                  disabled={saving}
                />

                {/* Layer 1 action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={() => save(false)}
                    disabled={saving}
                    className="product-btn product-btn-brand flex-1"
                  >
                    {saving ? "Saving…" : "Looks good"}
                  </button>
                  <button
                    onClick={() => setShowAdvanced(true)}
                    disabled={saving}
                    className="product-btn product-btn-secondary flex-1"
                  >
                    Fix something
                  </button>
                </div>

                {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}

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

            <ReviewFormFields
              formId={formId}
              cert={cert}
              fields={fields}
              setFields={setFields}
              topics={topics}
              split={split}
              setTopicHours={setTopicHours}
              disabled={saving}
            />

            {saveError && <p role="alert" className="text-xs text-[var(--status-miss)]">{saveError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdvanced(false)}
                className="product-btn product-btn-secondary flex-1 min-h-0 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => save(true)}
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
