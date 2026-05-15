"use client";

import { useState } from "react";

interface PhysicianMatch {
  npi: string;
  name: string;
  credential: string;
  state: string;
  specialty: string;
  city: string;
}

interface VerifyResult {
  verified: boolean;
  matches: PhysicianMatch[];
  confidence: "high" | "medium" | "low";
  error?: string;
}

interface NpiVerifierProps {
  firstName: string;
  lastName: string;
  state: string;
  licenseType: string;
  /** Called when an NPI is confirmed (single match auto-selected, or user picks from dropdown) */
  onVerified: (npi: string, match: PhysicianMatch) => void;
  /** Called when user clears a previously verified NPI */
  onCleared?: () => void;
  /** Pre-selected NPI (if already verified) */
  verifiedNpi?: string | null;
  verifiedMatch?: PhysicianMatch | null;
}

export default function NpiVerifier({
  firstName,
  lastName,
  state,
  licenseType,
  onVerified,
  onCleared,
  verifiedNpi,
  verifiedMatch,
}: NpiVerifierProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [selectedNpi, setSelectedNpi] = useState<string>("");

  const canVerify = !!firstName && !!lastName && !!state && !!licenseType;

  async function handleVerify() {
    if (!canVerify) return;
    setLoading(true);
    setResult(null);
    setSelectedNpi("");

    try {
      const res = await fetch("/api/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, state, licenseType }),
      });
      const data: VerifyResult = await res.json();
      setResult(data);

      // Auto-select if exactly 1 match
      if (data.verified && data.matches.length === 1) {
        onVerified(data.matches[0].npi, data.matches[0]);
      }
    } catch {
      setResult({ verified: false, matches: [], confidence: "low", error: "Lookup failed" });
    } finally {
      setLoading(false);
    }
  }

  function handleSelectMatch(npi: string) {
    setSelectedNpi(npi);
    const match = result?.matches.find((m) => m.npi === npi);
    if (match) onVerified(npi, match);
  }

  function handleClear() {
    setResult(null);
    setSelectedNpi("");
    onCleared?.();
  }

  // Already verified — show badge
  if (verifiedNpi && verifiedMatch) {
    return (
      <div className="flex items-center justify-between bg-[var(--status-met-bg)] border border-[rgba(107,142,102,0.34)] rounded-[var(--radius)] px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-[var(--status-met)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-[var(--ink)]">
            License verified — {verifiedMatch.name}
            {verifiedMatch.credential ? `, ${verifiedMatch.credential}` : ""}
            {", "}
            {verifiedMatch.state}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-[var(--status-met)] hover:text-[var(--ink)] underline ml-3 shrink-0"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Verify button */}
      {!result && (
        <button
          type="button"
          onClick={handleVerify}
          disabled={!canVerify || loading}
          className="flex items-center gap-2 text-sm text-[var(--primary)] font-medium px-4 py-2 border border-[rgba(63,95,51,0.28)] rounded-[var(--radius)] hover:bg-[rgba(63,95,51,0.10)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Looking up…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify my license →
            </>
          )}
        </button>
      )}

      {/* High confidence — single match auto-confirmed */}
      {result?.confidence === "high" && result.matches.length === 1 && (
        <div className="flex items-center justify-between bg-[var(--status-met-bg)] border border-[rgba(107,142,102,0.34)] rounded-[var(--radius)] px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-[var(--status-met)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-[var(--ink)]">
              ✓ License verified — {result.matches[0].name}
              {result.matches[0].credential ? `, ${result.matches[0].credential}` : ""}
              {", "}
              {result.matches[0].state}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[var(--status-met)] hover:text-[var(--ink)] underline ml-3 shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Medium confidence — multiple matches, show dropdown */}
      {result && result.matches.length >= 2 && (
        <div className="bg-[var(--status-track-bg)] border border-[rgba(139,122,184,0.28)] rounded-[var(--radius)] px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-[var(--ink)]">
            Multiple records found — select yours:
          </p>
          <select
            value={selectedNpi}
            onChange={(e) => handleSelectMatch(e.target.value)}
            className="product-select"
          >
            <option value="" disabled>Select your record…</option>
            {result.matches.map((m) => (
              <option key={m.npi} value={m.npi}>
                {m.name}{m.credential ? `, ${m.credential}` : ""} — {m.city}, {m.state}
                {m.specialty ? ` (${m.specialty})` : ""}
              </option>
            ))}
          </select>
          {selectedNpi && (
            <div className="flex items-center gap-2 text-sm text-[var(--status-met)] font-medium">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              NPI {selectedNpi} selected
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[var(--primary)] hover:text-[var(--primary-2)] underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Low confidence — no match */}
      {result && result.matches.length === 0 && (
        <div className="flex items-start gap-2 bg-[var(--status-pending-bg)] border border-[rgba(201,147,60,0.34)] rounded-[var(--radius)] px-4 py-3">
          <svg className="h-4 w-4 text-[var(--status-pending)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--ink)]">
              ⚠️ Could not verify automatically — you can still proceed
            </p>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              NPPES may not have your record yet, or the name may differ. Your license will be saved without NPI verification.
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[var(--status-pending)] hover:text-[var(--ink)] underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
