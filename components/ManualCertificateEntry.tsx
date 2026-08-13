"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function ManualCertificateEntry() {
  const [fields, setFields] = useState({
    title: "",
    provider: "",
    date: "",
    creditHours: "",
    creditType: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const canSave = fields.title.trim() !== "" && fields.creditHours !== "";

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title,
          provider: fields.provider || undefined,
          activityDate: fields.date || undefined,
          creditHours: parseFloat(fields.creditHours),
          creditType: fields.creditType || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        setSaveError(err.error ?? "Save failed");
      } else {
        setSaved(true);
      }
    } catch {
      setSaveError("Network error — please try again");
    }
    setSaving(false);
  };

  const reset = () => {
    setFields({ title: "", provider: "", date: "", creditHours: "", creditType: "" });
    setSaved(false);
    setSaveError("");
  };

  if (saved) {
    return (
      <div className="product-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-[var(--status-met)] text-sm font-medium">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Saved — these hours now count toward your requirements.
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={reset} className="product-btn product-btn-secondary flex-1">
            Add another
          </button>
          <Link href="/dashboard/compliance" className="product-btn product-btn-brand flex-1">
            View My Compliance →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-card p-6 space-y-4">
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
        <label className="product-label">Provider / Accreditor (optional)</label>
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
      <div>
        <label className="product-label">Credit Type (optional)</label>
        <select
          value={fields.creditType}
          onChange={(e) => setFields((f) => ({ ...f, creditType: e.target.value }))}
          className="product-input"
        >
          <option value="">Select credit type…</option>
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
        disabled={saving || !canSave}
        className="product-btn product-btn-primary w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save Hours"}
      </button>
      <p className="text-xs text-[var(--ink-3)] text-center">
        Keep the original certificate — boards can ask for it in an audit.
      </p>
    </div>
  );
}
