"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AttestationStatus = "none" | "completed" | "not_completed" | "not_applicable";

type Action = "complete" | "not_completed" | "not_applicable" | "clear";

/**
 * Inline requirement-history attestation.
 *
 * Unanswered → optional year input + the answers that make sense for the row.
 * Answered   → a single status card with a "Clear response" action underneath.
 *
 * Conditional requirements get a third answer. California's geriatric hours
 * only bind a general internist or family physician with a >25% elderly panel,
 * so for most physicians the true answer is neither "completed" nor "I still
 * need this" — it's "this was never mine to do". Without that answer the row
 * sat on the Compliance Map as permanently unresolved.
 *
 * Used on the Compliance Map (inline, so users never get bounced to Settings)
 * and in Settings → Requirement history.
 */
export interface SuggestedCertificate {
  id: string;
  title: string;
  year: number | null;
  hours: number | null;
}

export default function RequirementAttestation({
  requirementId,
  licenseId,
  status,
  completedYear,
  compact = false,
  /** Show the "Doesn't apply to me" answer — set for CONDITIONAL requirements */
  allowNotApplicable = false,
  /** An uploaded certificate whose topics/hours look like they satisfy this row */
  suggestedCert = null,
  /** Title of the certificate a completed attestation was confirmed from */
  satisfiedByCertLabel = null,
}: {
  requirementId: string;
  licenseId: string;
  status: AttestationStatus;
  completedYear: number | null;
  compact?: boolean;
  allowNotApplicable?: boolean;
  suggestedCert?: SuggestedCertificate | null;
  satisfiedByCertLabel?: string | null;
}) {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (action: Action, certificateId?: string) => {
    setSaving(true);
    setError("");
    try {
      const yearRaw = year.trim();
      const parsedYear = yearRaw ? Number(yearRaw) : null;
      if (
        action === "complete" &&
        !certificateId &&
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
          completedYear: action === "complete" && !certificateId ? parsedYear : null,
          certificateId: certificateId ?? null,
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

  // Answered state — single status card + follow-up actions
  if (status !== "none") {
    const tone =
      status === "completed"
        ? {
            border: "border-[var(--status-met)]",
            bg: "bg-[var(--status-met-bg)]",
            text: "text-[var(--status-met)]",
            label: "COMPLETED",
          }
        : status === "not_applicable"
        ? {
            border: "border-[var(--line)]",
            bg: "bg-[var(--bg-2)]",
            text: "text-[var(--ink-2)]",
            label: "DOESN'T APPLY TO ME",
          }
        : {
            border: "border-[var(--status-miss)]",
            bg: "bg-[var(--status-miss-bg)]",
            text: "text-[var(--status-miss)]",
            label: "NEEDS COMPLETION",
          };

    return (
      <div className={compact ? "mt-2" : "mt-3"}>
        <div className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 ${tone.border} ${tone.bg}`}>
          <span className={`text-sm font-bold tracking-wide ${tone.text}`}>
            {tone.label}
            {status === "completed" && completedYear ? (
              <span className="font-semibold"> · {completedYear}</span>
            ) : null}
            {status === "completed" && satisfiedByCertLabel ? (
              <span className="font-semibold"> · satisfied by {satisfiedByCertLabel}</span>
            ) : null}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {status !== "completed" && (
            <button
              type="button"
              onClick={() => submit("complete")}
              disabled={saving}
              className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-2)] disabled:opacity-60"
            >
              {saving ? "Saving…" : "I've completed it"}
            </button>
          )}
          <button
            type="button"
            onClick={() => submit("clear")}
            disabled={saving}
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--paper)] disabled:opacity-60"
          >
            {saving ? "Clearing…" : "Clear response"}
          </button>
        </div>
        {error && (
          <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--status-miss-bg)] px-3 py-2 text-xs text-[var(--status-miss)]">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Unanswered state — year input + the available answers
  return (
    <div className={compact ? "mt-2 space-y-2" : "mt-3 space-y-2"}>
      {suggestedCert && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--status-met)] bg-[var(--status-met-bg)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[var(--status-met)]">
            Looks satisfied by {suggestedCert.title}
            {suggestedCert.hours ? ` (${suggestedCert.hours.toFixed(1)} hrs${suggestedCert.year ? `, ${suggestedCert.year}` : ""})` : suggestedCert.year ? ` (${suggestedCert.year})` : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Your uploaded certificate covers this topic. Confirm and ClearCME marks the requirement met — you can undo with &ldquo;Clear response&rdquo; anytime.
          </p>
          <button
            type="button"
            onClick={() => submit("complete", suggestedCert.id)}
            disabled={saving}
            className="mt-2 rounded-lg bg-[var(--status-met)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Confirm — this covers it"}
          </button>
        </div>
      )}
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
          className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-2)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "I've done this"}
        </button>
        <button
          type="button"
          onClick={() => submit("not_completed")}
          disabled={saving}
          className="flex-1 rounded-lg border border-[var(--status-miss)] bg-[var(--status-miss-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-miss)] hover:bg-white disabled:opacity-60"
        >
          Still need it
        </button>
      </div>
      {allowNotApplicable && (
        <button
          type="button"
          onClick={() => submit("not_applicable")}
          disabled={saving}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink-2)] hover:border-[var(--ink-3)] disabled:opacity-60"
        >
          This doesn&apos;t apply to my practice
        </button>
      )}
      {error && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--status-miss-bg)] px-3 py-2 text-xs text-[var(--status-miss)]">
          {error}
        </p>
      )}
    </div>
  );
}
