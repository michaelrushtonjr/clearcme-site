"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

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
      router.refresh();
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              {uploadedCerts.length === 1
                ? "1 certificate processed"
                : `${uploadedCerts.length} certificates processed`}
            </h3>
            <button
              onClick={reset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Upload more
            </button>
          </div>

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
              ) : cert.extracted ? (
                <ExtractedCreditCard cert={cert} />
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

function ExtractedCreditCard({ cert }: { cert: UploadedCert }) {
  const ex = cert.extracted!;

  const CREDIT_LABELS: Record<string, string> = {
    AMA_PRA_1: "AMA PRA Category 1",
    AMA_PRA_2: "AMA PRA Category 2",
    AAFP_PRESCRIBED: "AAFP Prescribed",
    AAFP_ELECTIVE: "AAFP Elective",
    AOA_1_A: "AOA Category 1-A",
    OTHER: "Other",
  };

  return (
    <div className="bg-white border border-green-200 rounded-2xl overflow-hidden">
      {/* Success header */}
      <div className="bg-green-50 px-5 py-3 flex items-center gap-2 border-b border-green-100">
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium text-green-800">Credits extracted</span>
        <span className="ml-auto text-xs text-green-600 truncate max-w-[150px]">{cert.fileName}</span>
      </div>

      {/* Extracted data */}
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Activity</p>
          <p className="font-semibold text-slate-900">{ex.title}</p>
          <p className="text-sm text-slate-500">{ex.provider}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date</p>
            <p className="text-sm text-slate-900">{ex.date}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Hours</p>
            <p className="text-sm font-bold text-blue-700">{ex.creditHours.toFixed(1)} hrs</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Type</p>
            <p className="text-sm text-slate-900">{CREDIT_LABELS[ex.creditType] ?? ex.creditType}</p>
          </div>
        </div>

        {ex.accreditation && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Accreditation</p>
            <p className="text-sm text-slate-900">{ex.accreditation}</p>
          </div>
        )}

        {ex.topics.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {ex.topics.map((t) => (
                <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">
          ⚠ AI-extracted — verify accuracy before relying on this for compliance.
        </p>
      </div>
    </div>
  );
}
