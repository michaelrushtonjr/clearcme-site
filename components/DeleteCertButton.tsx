"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteCertButtonProps {
  certId: string;
  certTitle?: string | null;
}

export default function DeleteCertButton({ certId, certTitle }: DeleteCertButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/certificates/${certId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      // silently fail — router.refresh will show stale state
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-red-600 whitespace-nowrap">Delete? Cannot be undone.</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Delete ${certTitle ?? "certificate"}`}
      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
      aria-label="Delete certificate"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
