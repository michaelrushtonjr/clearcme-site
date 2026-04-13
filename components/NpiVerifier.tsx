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
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-green-800">
            License verified — {verifiedMatch.name}
            {verifiedMatch.credential ? `, ${verifiedMatch.credential}` : ""}
            {", "}
            {verifiedMatch.state}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-green-600 hover:text-green-800 underline ml-3 shrink-0"
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
          className="flex items-center gap-2 text-sm text-blue-600 font-medium px-4 py-2 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
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
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-800">
              ✓ License verified — {result.matches[0].name}
              {result.matches[0].credential ? `, ${result.matches[0].credential}` : ""}
              {", "}
              {result.matches[0].state}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-green-600 hover:text-green-800 underline ml-3 shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Medium confidence — multiple matches, show dropdown */}
      {result && result.matches.length >= 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-blue-800">
            Multiple records found — select yours:
          </p>
          <select
            value={selectedNpi}
            onChange={(e) => handleSelectMatch(e.target.value)}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              NPI {selectedNpi} selected
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Low confidence — no match */}
      {result && result.matches.length === 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ Could not verify automatically — you can still proceed
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              NPPES may not have your record yet, or the name may differ. Your license will be saved without NPI verification.
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-amber-600 hover:text-amber-800 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
