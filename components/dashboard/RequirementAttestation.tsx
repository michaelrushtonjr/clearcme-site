"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AttestationStatus = "none" | "completed" | "not_completed";

/**
 * Inline requirement-history attestation.
 *
 * Unanswered → optional year input + "I completed this" / "I still need this".
 * Answered   → a single COMPLETED / NEEDS COMPLETION status card with a
 *              "Clear response" action underneath (replaces the old
 *              two-boxes-plus-Clear layout).
 *
 * Used on the Compliance Map (inline, so users never get bounced to Settings)
 * and in Settings → Requirement history.
 */
export default function RequirementAttestation({
  requirementId,
  licenseId,
  status,
  completedYear,
  compact = false,
}: {
  requirementId: string;
  licenseId: string;
  status: AttestationStatus;
  completedYear: number | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (action: "complete" | "not_completed" | "clear") => {
    setSaving(true);
    setError("");
    try {
      const yearRaw = year.trim();
      const parsedYear = yearRaw ? Number(yearRaw) : null;
      if (
        action === "complete" &&
        yearRaw &&
        (parsedYear === null || !Number.isInteger(parsedYear) || parsedYear < 1950)
      ) {
        throw new Error("Enter a valid completion year, or leave it blank if you only know it was completed.");
      }
      const res = await fetch("/api/requirement-completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandatoryRequirementId: requirementId,
          physicianLicenseId: licenseId,
          completedYear: action === "complete" ? parsedYear : null,
          action,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Unable to save your response");
      setYear("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your response");
    } finally {
      setSaving(false);
    }
  };

  // Answered state — single status card + clear response
  if (status !== "none") {
    const isCompleted = status === "completed";
    return (
      <div className={compact ? "mt-2" : "mt-3"}>
        <div
          className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 ${
            isCompleted
              ? "border-[var(--status-met)] bg-[var(--status-met-bg)]"
              : "border-[var(--status-miss)] bg-[var(--status-miss-bg)]"
          }`}
        >
          <span
            className={`text-sm font-bold tracking-wide ${
              isCompleted ? "text-[var(--status-met)]" : "text-[var(--status-miss)]"
            }`}
          >
            {isCompleted ? "✓ COMPLETED" : "○ NEEDS COMPLETION"}
            {isCompleted && completedYear ? (
              <span className="font-semibold"> · {completedYear}</span>
            ) : null}
          </span>
        </div>
        <button
          type="button"
          onClick={() => submit("clear")}
          disabled={saving}
          className="mt-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--paper)] disabled:opacity-60"
        >
          {saving ? "Clearing…" : "Clear response"}
        </button>
        {error && (
          <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--status-miss-bg)] px-3 py-2 text-xs text-[var(--status-miss)]">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Unanswered state — year input + two actions
  return (
    <div className={compact ? "mt-2 space-y-2" : "mt-3 space-y-2"}>
      <input
        type="number"
        inputMode="numeric"
        min={1950}
        max={new Date().getFullYear() + 1}
        placeholder="Year completed (optional)"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        className="product-input"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => submit("complete")}
          disabled={saving}
          className="flex-1 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-2)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "I completed this"}
        </button>
        <button
          type="button"
          onClick={() => submit("not_completed")}
          disabled={saving}
          className="flex-1 rounded-full border border-[var(--status-miss)] bg-[var(--status-miss-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-miss)] hover:bg-white disabled:opacity-60"
        >
          I still need this
        </button>
      </div>
      {error && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--status-miss-bg)] px-3 py-2 text-xs text-[var(--status-miss)]">
          {error}
        </p>
      )}
    </div>
  );
}
