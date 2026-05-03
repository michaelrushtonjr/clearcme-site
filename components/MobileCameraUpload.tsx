"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadState = "idle" | "uploading" | "done" | "error";

interface MobileUploadResult {
  id: string;
  fileName: string;
  creditHours: number;
  topics: string[];
  needsReview: boolean;
  extractionFailed: boolean;
}

interface ComplianceRequirementGap {
  topic: string;
  gap: number;
}

interface ComplianceLicenseStatus {
  state: string;
  licenseType: string;
  totalHoursEarned?: number;
  gapHours?: number;
  isCompliant?: boolean;
  mandatoryGaps?: ComplianceRequirementGap[];
}

interface ComplianceSnapshot {
  totalGapHours: number;
  totalHoursEarned: number;
  unmetRequirementCount: number;
  mandatoryGapByTopic: Record<string, number>;
}

interface ComplianceImpact {
  snapshotAvailable: boolean;
  creditsApplied: number;
  gapReducedHours: number | null;
  stillNeededHours: number | null;
  changedRequirementCount: number | null;
  appliedTopics: string[];
}

interface MobileCameraUploadProps {
  onUploadComplete?: () => void;
}

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

function summarizeComplianceSnapshot(compliance: ComplianceLicenseStatus[] | undefined): ComplianceSnapshot | null {
  if (!compliance || compliance.length === 0) return null;

  const mandatoryGapByTopic: Record<string, number> = {};
  let unmetRequirementCount = 0;

  for (const license of compliance) {
    for (const gap of license.mandatoryGaps ?? []) {
      const remaining = Math.max(0, gap.gap ?? 0);
      if (remaining > 0) unmetRequirementCount += 1;
      mandatoryGapByTopic[gap.topic] = (mandatoryGapByTopic[gap.topic] ?? 0) + remaining;
    }
  }

  return {
    totalGapHours: compliance.reduce((sum, license) => sum + Math.max(0, license.gapHours ?? 0), 0),
    totalHoursEarned: compliance.reduce((sum, license) => sum + Math.max(0, license.totalHoursEarned ?? 0), 0),
    unmetRequirementCount,
    mandatoryGapByTopic,
  };
}

async function fetchComplianceSnapshot(): Promise<ComplianceSnapshot | null> {
  try {
    const res = await fetch("/api/compliance", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return summarizeComplianceSnapshot(data.compliance);
  } catch {
    return null;
  }
}

function summarizeComplianceImpact(
  before: ComplianceSnapshot | null,
  after: ComplianceSnapshot | null,
  uploadResults: MobileUploadResult[],
): ComplianceImpact {
  const creditsApplied = uploadResults
    .filter((cert) => !cert.needsReview && !cert.extractionFailed)
    .reduce((sum, cert) => sum + cert.creditHours, 0);

  if (!after) {
    return {
      snapshotAvailable: false,
      creditsApplied,
      gapReducedHours: null,
      stillNeededHours: null,
      changedRequirementCount: null,
      appliedTopics: [],
    };
  }

  const appliedTopics = before
    ? Object.entries(after.mandatoryGapByTopic)
        .filter(([topic, afterGap]) => (before.mandatoryGapByTopic[topic] ?? 0) > afterGap)
        .map(([topic]) => topic)
    : Array.from(new Set(uploadResults.flatMap((cert) => cert.topics)));

  return {
    snapshotAvailable: true,
    creditsApplied,
    gapReducedHours: before ? Math.max(0, before.totalGapHours - after.totalGapHours) : null,
    stillNeededHours: after.totalGapHours,
    changedRequirementCount: before
      ? Math.max(0, before.unmetRequirementCount - after.unmetRequirementCount)
      : after.unmetRequirementCount,
    appliedTopics,
  };
}

export default function MobileCameraUpload({ onUploadComplete }: MobileCameraUploadProps) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<MobileUploadResult[]>([]);
  const [complianceImpact, setComplianceImpact] = useState<ComplianceImpact | null>(null);

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewSrc(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFiles([file]);
  };

  const confirmAndUpload = () => {
    if (capturedFile) uploadFiles([capturedFile]);
  };

  const discardCapture = () => {
    setPreviewSrc(null);
    setCapturedFile(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const resetUpload = () => {
    setUploadState("idle");
    setPreviewSrc(null);
    setCapturedFile(null);
    setUploadResults([]);
    setComplianceImpact(null);
    setErrorMsg(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFiles = async (files: File[]) => {
    setUploadState("uploading");
    setErrorMsg(null);
    setUploadResults([]);
    setComplianceImpact(null);

    try {
      const beforeCompliance = await fetchComplianceSnapshot();
      const results: MobileUploadResult[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/certificates", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed");
        }

        const data = await res.json();
        const cert = data.certificate;
        const isNeedsReview = cert?.extractionStatus === "NEEDS_REVIEW";
        const hasExtracted = cert?.extractionStatus === "COMPLETED" || isNeedsReview;

        results.push({
          id: cert?.id ?? crypto.randomUUID(),
          fileName: cert?.fileName ?? file.name,
          creditHours: hasExtracted ? cert?.creditHours ?? 0 : 0,
          topics: hasExtracted ? cert?.topics ?? [] : [],
          needsReview: isNeedsReview,
          extractionFailed: cert?.extractionStatus === "FAILED",
        });
      }

      const afterCompliance = await fetchComplianceSnapshot();
      setUploadResults(results);
      setComplianceImpact(summarizeComplianceImpact(beforeCompliance, afterCompliance, results));
      setUploadState("done");
      setPreviewSrc(null);
      setCapturedFile(null);
      onUploadComplete?.();
    } catch (err: unknown) {
      setUploadState("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  };

  // Pre-confirm preview screen
  if (previewSrc && uploadState === "idle") {
    return (
      <div className="space-y-4">
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="Certificate preview" className="w-full max-h-72 object-contain" />
          <div className="absolute top-3 right-3">
            <button
              onClick={discardCapture}
              className="bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
              aria-label="Discard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 text-center">Looks good? We&apos;ll extract your credits automatically.</p>
        <button
          onClick={confirmAndUpload}
          className="w-full py-4 bg-[#0F766E] text-white font-semibold rounded-xl hover:bg-[#0D9488] transition-colors text-base shadow-sm"
        >
          Upload &amp; Extract Credits →
        </button>
        <button
          onClick={discardCapture}
          className="w-full py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
        >
          Retake photo
        </button>
      </div>
    );
  }

  // Loading skeleton
  if (uploadState === "uploading") {
    return (
      <div className="space-y-4 py-6 text-center">
        <div className="space-y-3 max-w-xs mx-auto">
          <div className="h-4 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-4 bg-slate-200 rounded-full animate-pulse w-3/4 mx-auto" />
          <div className="h-4 bg-slate-200 rounded-full animate-pulse w-1/2 mx-auto" />
        </div>
        <p className="text-sm font-medium text-slate-600 mt-4">Reading your certificate…</p>
        <p className="text-xs text-slate-400">This usually takes about 10 seconds</p>
      </div>
    );
  }

  // Done
  if (uploadState === "done") {
    const processedCount = uploadResults.length;
    const totalCreditsAdded = uploadResults.reduce((sum, cert) => sum + cert.creditHours, 0);
    const needsReviewCount = uploadResults.filter((cert) => cert.needsReview || cert.extractionFailed).length;
    const detectedTopics = Array.from(new Set(uploadResults.flatMap((cert) => cert.topics)));
    const hasReviewNeeded = needsReviewCount > 0;
    const cardTone = hasReviewNeeded
      ? "border-amber-200 bg-amber-50/85"
      : "border-teal-100 bg-teal-50/80";
    const accentText = hasReviewNeeded ? "text-amber-700" : "text-[#0F766E]";
    const accentButton = hasReviewNeeded
      ? "bg-amber-600 hover:bg-amber-700"
      : "bg-[#0F766E] hover:bg-[#0D9488]";

    return (
      <div className={`space-y-4 rounded-2xl border p-4 text-left shadow-sm ${cardTone}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${accentText}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {hasReviewNeeded ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              )}
            </svg>
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accentText}`}>
              {hasReviewNeeded ? "Review needed" : "Compliance updated"}
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {hasReviewNeeded ? "Confirm the extracted details" : "Your CME record was refreshed"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {hasReviewNeeded
                ? "We saved the upload, but one or more fields need review before ClearCME relies on it for compliance."
                : totalCreditsAdded > 0
                ? `${totalCreditsAdded.toFixed(1)} credit${totalCreditsAdded === 1 ? "" : "s"} added from ${processedCount} upload${processedCount === 1 ? "" : "s"}.`
                : "No credits were added yet — review the upload on your compliance page to finish classification."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/85 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Processed</p>
            <p className="mt-1 text-xl font-black text-slate-900">{processedCount}</p>
          </div>
          <div className="rounded-xl bg-white/85 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Applied</p>
            <p className={`mt-1 text-xl font-black ${accentText}`}>
              {(complianceImpact?.creditsApplied ?? totalCreditsAdded).toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl bg-white/85 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Still needed</p>
            <p className={`mt-1 text-xl font-black ${needsReviewCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {complianceImpact?.stillNeededHours !== null && complianceImpact?.stillNeededHours !== undefined
                ? complianceImpact.stillNeededHours.toFixed(1)
                : "—"}
            </p>
          </div>
        </div>

        {complianceImpact?.snapshotAvailable && (
          <div className="rounded-xl bg-white/75 px-3 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              {complianceImpact.gapReducedHours !== null
                ? `${complianceImpact.gapReducedHours.toFixed(1)} hour${complianceImpact.gapReducedHours === 1 ? "" : "s"} of your remaining gap changed.`
                : "Your current compliance gaps are updated below."}
            </p>
            <p className="mt-1">
              Applied to: {complianceImpact.appliedTopics.length > 0
                ? complianceImpact.appliedTopics.map(formatTopicLabel).join(", ")
                : "General CME hours"}
              {complianceImpact.changedRequirementCount !== null
                ? ` · ${complianceImpact.changedRequirementCount} requirement${complianceImpact.changedRequirementCount === 1 ? "" : "s"} changed or still need attention.`
                : ""}
            </p>
          </div>
        )}

        {detectedTopics.length > 0 && (
          <p className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
            Mandatory-topic matches detected: {detectedTopics.map(formatTopicLabel).join(", ")}.
          </p>
        )}

        <div className="space-y-2">
          <button
            onClick={() => router.push("/dashboard/compliance")}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors ${accentButton}`}
          >
            {hasReviewNeeded ? "Review details →" : "View updated gaps →"}
          </button>
          <button
            onClick={resetUpload}
            className="w-full rounded-xl border border-teal-200 bg-white/80 px-4 py-3 text-sm font-semibold text-[#0F766E] transition-colors hover:bg-white"
          >
            Upload another certificate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Primary CTA: Camera */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-3 py-4 bg-[#0F766E] text-white font-semibold rounded-xl hover:bg-[#0D9488] active:bg-[#0D9488] transition-colors text-base shadow-sm"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Snap your certificate
      </button>
      {/* Hidden camera input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />

      <div className="flex items-center gap-3 text-slate-300">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Secondary: Upload PDF */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-sm"
      >
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Upload a PDF
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Tertiary: Forward from email */}
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 py-3 border border-slate-100 text-slate-400 font-medium rounded-xl text-sm cursor-not-allowed bg-slate-50/50"
        title="Coming soon"
      >
        <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Forward from email
        <span className="text-[10px] bg-slate-200 text-slate-400 rounded-full px-1.5 py-0.5 ml-1">Soon</span>
      </button>

      <p className="text-[10px] text-slate-400 text-center pt-1">
        AI extracts credits automatically · ~10 seconds · Encrypted in transit
      </p>
    </div>
  );
}
