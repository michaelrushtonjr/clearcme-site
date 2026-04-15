"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadState = "idle" | "uploading" | "done" | "error";

interface MobileCameraUploadProps {
  onUploadComplete?: () => void;
}

export default function MobileCameraUpload({ onUploadComplete }: MobileCameraUploadProps) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const uploadFiles = async (files: File[]) => {
    setUploadState("uploading");
    setErrorMsg(null);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/certificates", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed");
        }
      }
      setUploadState("done");
      setPreviewSrc(null);
      setCapturedFile(null);
      onUploadComplete?.();
      setTimeout(() => router.push("/dashboard/compliance"), 1200);
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
    return (
      <div className="py-8 text-center space-y-2">
        <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-slate-800">Certificate uploaded!</p>
        <p className="text-sm text-slate-500">Redirecting to your compliance dashboard…</p>
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
