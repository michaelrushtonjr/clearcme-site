"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
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
  error?: string;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export default function CertificateUpload() {
  const router = useRouter();
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

    return {
      id: cert.id,
      fileName: cert.fileName,
      extracted: cert.extractionStatus === "COMPLETED"
        ? {
            title: cert.title,
            provider: cert.provider,
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
    [router]
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
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : uploadState === "uploading"
              ? "border-slate-300 bg-slate-50 cursor-not-allowed"
              : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
          }`}
        >
          <input {...getInputProps()} />

          {uploadState === "uploading" ? (
            <div className="space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <div>
                <p className="font-medium text-slate-700 text-sm">
                  Uploading &amp; extracting…
                </p>
                <p className="text-xs text-slate-400 mt-1 truncate max-w-xs mx-auto">
                  {currentFileName}
                </p>
              </div>
              {/* Progress bar */}
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{progress}%</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="font-semibold text-slate-900 mb-1">
                {isDragActive ? "Drop it here" : "Drag & drop certificates"}
              </p>
              <p className="text-sm text-slate-500 mb-4">
                or click to browse files
              </p>
              <p className="text-xs text-slate-400">
                PDF, JPG, PNG — up to 10MB each
              </p>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {uploadState === "done" && uploadedCerts.length > 0 && (
        <div className="space-y-4">
          {uploadedCerts.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">
                {`${uploadedCerts.length} certificates processed`}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="text-sm font-semibold px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Upload Another Certificate
                </button>
                <Link
                  href="/dashboard/compliance"
                  className="text-sm font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View My Compliance →
                </Link>
              </div>
            </div>
          )}

          {uploadedCerts.map((cert) => (
            <div key={cert.id}>
              {cert.error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-red-900 text-sm">{cert.fileName}</p>
                  </div>
                  <p className="text-sm text-red-700">{cert.error}</p>
                </div>
              ) : cert.extractionFailed ? (
                <ExtractionFailedCard cert={cert} />
              ) : cert.extracted ? (
                <ExtractedCreditCard cert={cert} onReset={reset} />
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-sm text-amber-800">
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
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-amber-100 bg-amber-100/60">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm font-medium text-amber-900">Couldn&apos;t read this certificate automatically</span>
        <span className="ml-auto text-xs text-amber-700 truncate max-w-[150px]">{cert.fileName}</span>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-amber-800">
          We couldn&apos;t automatically read this certificate. You can edit the details manually below.
        </p>

        {saved ? (
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Details saved successfully.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Course Title</label>
              <input
                type="text"
                value={fields.title}
                onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Advanced Cardiac Life Support"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Provider / Accreditor</label>
              <input
                type="text"
                value={fields.provider}
                onChange={(e) => setFields((f) => ({ ...f, provider: e.target.value }))}
                placeholder="e.g. American Heart Association"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Completion Date</label>
                <input
                  type="date"
                  value={fields.date}
                  onChange={(e) => setFields((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Credit Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={fields.creditHours}
                  onChange={(e) => setFields((f) => ({ ...f, creditHours: e.target.value }))}
                  placeholder="e.g. 2.5"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-red-600">{saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || (!fields.title && !fields.provider && !fields.date && !fields.creditHours)}
              className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

  return (
    <div className="bg-white border-2 border-green-300 rounded-3xl overflow-hidden shadow-lg">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-8 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">✓ Certificate Processed</h2>
        <p className="text-green-100 text-sm">AI successfully extracted your CME credit</p>
      </div>

      {/* Receipt body */}
      <div className="px-6 py-6 space-y-5">
        {/* Course title — large and prominent */}
        <div className="text-center border-b border-slate-100 pb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Course</p>
          <p className="text-xl font-bold text-slate-900 leading-snug">{ex.title}</p>
          <p className="text-base text-slate-500 mt-1">{ex.provider}</p>
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Completed</p>
            <p className="text-base font-semibold text-slate-800">{ex.date}</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Credits Earned</p>
            <p className="text-3xl font-black text-blue-700 leading-none">{ex.creditHours.toFixed(1)}</p>
            <p className="text-xs text-blue-500 mt-1 font-medium">{creditLabel} Credits</p>
          </div>
        </div>

        {/* Mandatory topics */}
        {ex.topics.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mandatory Topics Detected</p>
            <div className="flex flex-wrap gap-2">
              {ex.topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full"
                >
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  {TOPIC_FORMAT[t] ?? t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation message */}
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm text-green-800 font-medium">
            This certificate has been added to your compliance record.
          </p>
        </div>

        {/* AI disclaimer */}
        <p className="text-xs text-slate-400 text-center">
          ⚠ AI-extracted — verify accuracy before relying on this for compliance.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={onReset}
            className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Upload Another
          </button>
          <Link
            href="/dashboard/compliance"
            className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm text-center"
          >
            View My Compliance →
          </Link>
        </div>
      </div>
    </div>
  );
}
