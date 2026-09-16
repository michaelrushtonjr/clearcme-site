"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CertificateTopicConfirmation({ certificateId, suggestions, confirmedTopics, hours, allocations }: {
  certificateId: string; suggestions: string[]; confirmedTopics: string[]; hours: number | null; allocations?: unknown;
}) {
  const router = useRouter();
  const topics = [...new Set([...confirmedTopics, ...suggestions])];
  const initial = allocations && typeof allocations === "object" && !Array.isArray(allocations) ? allocations as Record<string, number> : {};
  const [split, setSplit] = useState<Record<string, string>>(() => Object.fromEntries(topics.map((topic) => [topic, String(initial[topic] ?? (confirmedTopics[0] === topic ? hours ?? 0 : 0))])));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!suggestions.length && confirmedTopics.length < 2) return null;
  const label = (topic: string) => topic.toLowerCase().replaceAll("_", " ");
  async function confirm() {
    setSaving(true); setError("");
    try {
      const topicHourAllocations = Object.fromEntries(Object.entries(split).map(([key, value]) => [key, Number(value)]).filter(([, value]) => Number(value) > 0));
      const response = await fetch(`/api/certificates/${certificateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicHourAllocations }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not confirm topics");
      router.refresh();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <fieldset className="mt-3 space-y-2 text-sm">
    <legend>Looks like it may count toward {suggestions.map(label).join(", ") || "your confirmed topics"} — confirm?</legend>
    <p>Assign up to {hours ?? 0} earned hours across the topics you confirm.</p>
    {topics.map((topic) => <label key={topic} className="flex items-center gap-2">
      {label(topic)} <input aria-label={`${label(topic)} hours`} type="number" min="0" max={hours ?? 0} step="0.25" value={split[topic] ?? "0"} onChange={(e) => setSplit({ ...split, [topic]: e.target.value })} className="w-20 border rounded px-2" /> hours
    </label>)}
    <button type="button" onClick={confirm} disabled={saving || !hours} className="product-btn product-btn-brand">{saving ? "Saving…" : "Confirm topic hours"}</button>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
