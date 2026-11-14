"use client";

import { useId, useState } from "react";
import { defaultTopicSplit, formatSpecialTopic, topicAllocationsFromSplit } from "@/lib/certificate-review";

/**
 * Topic-hour inputs for a review form. The starting values follow the hours
 * field (first topic takes all of them) until the physician edits one.
 */
export function useTopicSplit(topics: string[], hours: number | null | undefined, allocations?: unknown) {
  const [edited, setEdited] = useState<Record<string, string> | null>(null);
  const split = edited ?? defaultTopicSplit(topics, hours, allocations);
  const setTopicHours = (topic: string, value: string) => setEdited({ ...split, [topic]: value });
  return { split, setTopicHours };
}

export function TopicHoursFields({
  idPrefix,
  topics,
  split,
  hours,
  onChange,
  disabled = false,
}: {
  idPrefix: string;
  topics: string[];
  split: Record<string, string>;
  /** Hours earned on the certificate — the most the topics can add up to. */
  hours: number | null | undefined;
  onChange: (topic: string, value: string) => void;
  disabled?: boolean;
}) {
  if (topics.length === 0) return null;
  const total = typeof hours === "number" && Number.isFinite(hours) && hours > 0 ? hours : 0;
  const names = topics.map(formatSpecialTopic).join(", ");

  return (
    <fieldset className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-2)] p-4 text-left">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        Mandated topic hours
      </legend>
      <p className="text-sm text-[var(--ink-2)]">
        This certificate looks like it covers {names}. Confirm how many of its hours count toward{" "}
        {topics.length === 1 ? "that topic" : "each topic"}.
      </p>
      <div className="mt-3 space-y-2">
        {topics.map((topic) => {
          const label = formatSpecialTopic(topic);
          return (
            <div key={topic} className="flex items-center justify-between gap-3">
              <label htmlFor={`${idPrefix}-topic-${topic}`} className="text-sm font-medium text-[var(--ink)]">
                {label}
              </label>
              <span className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                <input
                  id={`${idPrefix}-topic-${topic}`}
                  aria-label={`${label} hours`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={total || undefined}
                  step="0.25"
                  value={split[topic] ?? "0"}
                  onChange={(event) => onChange(topic, event.target.value)}
                  disabled={disabled}
                  className="product-input"
                  // .product-input is unlayered CSS (width: 100%), so utilities can't size it.
                  style={{ width: 96, padding: "8px 10px", textAlign: "right" }}
                />
                hours
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--ink-3)]">
        {total > 0
          ? `Topic hours can add up to ${total} at most. Lower a number if only part of the activity covered the topic, or set it to 0 if it didn't.`
          : "Enter the hours you earned first; topic hours can't be more than that."}
      </p>
    </fieldset>
  );
}

/**
 * Confirms topic hours for a certificate that was read cleanly, right where it
 * was uploaded. Saves through the same PATCH the Certificates page uses.
 */
export function TopicHoursCard({
  certificateId,
  title,
  topics,
  hours,
  onConfirmed,
}: {
  certificateId: string;
  title: string;
  topics: string[];
  hours: number;
  onConfirmed?: (allocations: Record<string, number>) => void;
}) {
  const formId = useId();
  const { split, setTopicHours } = useTopicSplit(topics, hours);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Record<string, number> | null>(null);
  if (topics.length === 0) return null;

  const confirm = async () => {
    const { allocations, error: splitError } = topicAllocationsFromSplit(split, hours);
    if (splitError) {
      setError(splitError);
      return;
    }
    if (Object.keys(allocations).length === 0) {
      setError("Enter the hours that count toward a topic, or leave this for later.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/certificates/${certificateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicHourAllocations: allocations }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Could not confirm topic hours. Please try again.");
      } else {
        setConfirmed(allocations);
        onConfirmed?.(allocations);
      }
    } catch {
      setError("Network error — please try again");
    }
    setSaving(false);
  };

  return (
    <div className="product-card space-y-3 p-4 text-left">
      <p className="truncate text-sm font-semibold text-[var(--ink)]">{title}</p>
      {confirmed ? (
        <p role="status" className="text-sm font-medium text-[var(--status-met)]">
          Topic hours confirmed:{" "}
          {Object.entries(confirmed)
            .map(([topic, value]) => `${formatSpecialTopic(topic)} · ${value} hrs`)
            .join(", ")}
          .
        </p>
      ) : (
        <>
          <TopicHoursFields
            idPrefix={formId}
            topics={topics}
            split={split}
            hours={hours}
            onChange={setTopicHours}
            disabled={saving}
          />
          {error && <p role="alert" className="text-xs text-[var(--status-miss)]">{error}</p>}
          <button type="button" onClick={confirm} disabled={saving} className="product-btn product-btn-brand w-full disabled:opacity-50">
            {saving ? "Saving…" : "Confirm topic hours"}
          </button>
        </>
      )}
    </div>
  );
}
