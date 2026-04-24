"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import ComplianceDiffCard from "@/components/dashboard/ComplianceDiffCard";
import type { UserComplianceDiffPayload } from "@/lib/compliance-diffs";

export default function ComplianceDiffNotifications() {
  const [diffs, setDiffs] = useState<UserComplianceDiffPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [dismissingIds, setDismissingIds] = useState<Record<string, boolean>>({});

  const loadDiffs = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/compliance-diffs", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load compliance diffs");
      }

      const data = (await response.json()) as UserComplianceDiffPayload[];
      startTransition(() => {
        setDiffs(Array.isArray(data) ? data : []);
      });
      setHasError(false);
    } catch (error) {
      console.error("Compliance diffs load failed:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  });

  const dismissDiff = useEffectEvent(async (diffId: string) => {
    setDismissingIds((current) => ({ ...current, [diffId]: true }));

    try {
      const response = await fetch(`/api/compliance-diffs/${diffId}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss compliance diff");
      }

      startTransition(() => {
        setDiffs((current) => current.filter((diff) => diff.id !== diffId));
      });
    } catch (error) {
      console.error("Compliance diff dismissal failed:", error);
    } finally {
      setDismissingIds((current) => {
        const next = { ...current };
        delete next[diffId];
        return next;
      });
    }
  });

  useEffect(() => {
    void loadDiffs();
  }, []);

  if (isLoading || hasError || diffs.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-[#D9ECE9] bg-[#FAFAF7] p-5">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F766E]">
          Requirement Changes
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          State CME updates that affect your compliance
        </h2>
      </div>

      <div className="space-y-3">
        {diffs.map((diff) => (
          <ComplianceDiffCard
            key={diff.id}
            diff={diff}
            isDismissing={Boolean(dismissingIds[diff.id])}
            onDismiss={() => void dismissDiff(diff.id)}
          />
        ))}
      </div>
    </section>
  );
}
