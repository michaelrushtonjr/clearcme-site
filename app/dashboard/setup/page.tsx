"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

const SPECIALTIES = [
  "Emergency Medicine",
  "Family Medicine",
  "Internal Medicine",
  "Pediatrics",
  "Surgery",
  "Obstetrics & Gynecology",
  "Psychiatry",
  "Anesthesiology",
  "Radiology",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Dermatology",
  "Other",
];

function estimateRenewalDate(stateCode: string): string {
  // Estimate 2 years from today as a default renewal date
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  // Special-case common states
  if (stateCode === "NV") {
    // Nevada: July 1, odd/even year
    const renewYear = d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
    return `${renewYear}-07-01`;
  }
  if (stateCode === "CA") {
    return `${d.getFullYear()}-01-31`;
  }
  return d.toISOString().split("T")[0];
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [state, setState] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [unsureDate, setUnsureDate] = useState(false);

  const canAdvanceStep1 = !!state;
  const canAdvanceStep2 = !!licenseType;
  const canSubmitStep3 = unsureDate || !!renewalDate;

  async function handleSubmit() {
    const finalRenewalDate = unsureDate ? estimateRenewalDate(state) : renewalDate;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          licenseType,
          specialty: specialty || undefined,
          renewalDate: finalRenewalDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create license");
      }
      router.push("/dashboard?onboarded=1");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const selectedStateName = US_STATES.find((s) => s.code === state)?.name ?? state;

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`rounded-full transition-all ${
                n === step
                  ? "w-6 h-2.5 bg-blue-600"
                  : n < step
                  ? "w-2.5 h-2.5 bg-blue-300"
                  : "w-2.5 h-2.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Step 1: State */}
          {step === 1 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                Step 1 of 3
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                What state do you practice in?
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                We&apos;ll load the exact CME requirements for your state — no guessing.
              </p>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="" disabled>
                  Select your primary state…
                </option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-3">
                Primary state only — you can add more licenses later.
              </p>
              <button
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1}
                className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: License type + specialty */}
          {step === 2 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                Step 2 of 3
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                What&apos;s your license type and specialty?
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                Some mandatory CME topics vary by degree type and specialty.
              </p>

              {/* MD / DO toggle */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Degree
                </label>
                <div className="flex gap-3">
                  {["MD", "DO"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLicenseType(type)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                        licenseType === type
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialty */}
              <div className="mb-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Specialty{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select specialty…</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canAdvanceStep2}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Renewal date */}
          {step === 3 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                Step 3 of 3
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                When is your next license renewal?
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                This lets us show your countdown and pace your CME plan.
              </p>

              {!unsureDate && (
                <div className="mb-4">
                  <input
                    type="date"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setUnsureDate(!unsureDate);
                  if (!unsureDate) setRenewalDate("");
                }}
                className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border w-full transition-colors ${
                  unsureDate
                    ? "border-blue-300 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    unsureDate ? "bg-blue-600 border-blue-600" : "border-slate-300"
                  }`}
                >
                  {unsureDate && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                I&apos;m not sure — estimate based on {selectedStateName || "my state"}
              </button>

              {unsureDate && (
                <p className="text-xs text-slate-400 mt-2 px-1">
                  We&apos;ll estimate your renewal based on {selectedStateName}&apos;s typical schedule. You can update this anytime.
                </p>
              )}

              {error && (
                <div className="mt-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmitStep3 || loading}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? "Setting up…" : "See my compliance map →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reassurance footer */}
        <p className="text-center text-xs text-slate-400 mt-4">
          No certificate upload required · Your compliance map is ready instantly
        </p>
      </div>
    </div>
  );
}
