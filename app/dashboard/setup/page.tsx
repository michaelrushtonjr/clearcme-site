"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRenewalRuleConfig,
  getSuggestedRenewalDate,
  type LicenseType,
  type StateCode,
} from "@/lib/state-requirements";

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

const BIRTH_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

interface AdditionalLicense {
  id: string;
  state: string;
  licenseType: string;
  renewalDate: string;
  unsureDate: boolean;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Primary license state
  const [state, setState] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [renewalDate, setRenewalDate] = useState("");
  const [unsureDate, setUnsureDate] = useState(false);
  const [isEditingSuggestedRenewal, setIsEditingSuggestedRenewal] = useState(false);

  // Step 4: multi-state
  const [isMultiState, setIsMultiState] = useState<boolean | null>(null);
  const [additionalLicenses, setAdditionalLicenses] = useState<AdditionalLicense[]>([]);

  const canAdvanceStep1 = !!state;
  const canAdvanceStep2 = !!licenseType;
  const canSubmitStep3 = !!renewalDate;

  const selectedStateName = US_STATES.find((s) => s.code === state)?.name ?? state;
  const primaryRenewalRule =
    state && licenseType
      ? getRenewalRuleConfig(state as StateCode, licenseType as LicenseType)
      : null;
  const primarySuggestedRenewal =
    state && licenseType
      ? getSuggestedRenewalDate(state as StateCode, licenseType as LicenseType, {
          ...(birthMonth ? { birthMonth } : {}),
        })
      : { date: null as string | null, note: undefined as string | undefined };
  const canUsePrimarySmartEstimate = !!primarySuggestedRenewal.date;
  const isPrimaryVariableRenewal = primaryRenewalRule?.renewalType === "variable";
  const shouldLockPrimaryRenewalInput =
    !isPrimaryVariableRenewal && canUsePrimarySmartEstimate && unsureDate && !isEditingSuggestedRenewal;

  function getSmartRenewalSuggestion(selectedState: string, selectedLicenseType: string) {
    if (!selectedState || !selectedLicenseType) {
      return { date: null as string | null, note: undefined as string | undefined };
    }

    return getSuggestedRenewalDate(
      selectedState as StateCode,
      selectedLicenseType as LicenseType,
      {
        ...(birthMonth ? { birthMonth } : {}),
      },
    );
  }

  function getFinalRenewalDate(
    selectedState: string,
    selectedLicenseType: string,
    currentRenewalDate: string,
    shouldUseEstimate: boolean,
  ): string {
    if (!shouldUseEstimate) {
      return currentRenewalDate;
    }

    return getSmartRenewalSuggestion(selectedState, selectedLicenseType).date ?? currentRenewalDate;
  }

  function applyPrimarySuggestedRenewal() {
    if (!primarySuggestedRenewal.date) return;
    setRenewalDate(primarySuggestedRenewal.date);
    setUnsureDate(true);
    setIsEditingSuggestedRenewal(false);
  }

  useEffect(() => {
    setRenewalDate("");
    setUnsureDate(false);
    setIsEditingSuggestedRenewal(false);
  }, [state, licenseType]);

  useEffect(() => {
    if (!state || !licenseType || isPrimaryVariableRenewal) return;
    if (!primarySuggestedRenewal.date) return;

    if ((!renewalDate && !isEditingSuggestedRenewal) || unsureDate) {
      setRenewalDate(primarySuggestedRenewal.date);
      setUnsureDate(true);
      setIsEditingSuggestedRenewal(false);
    }
  }, [
    state,
    licenseType,
    isPrimaryVariableRenewal,
    primarySuggestedRenewal.date,
    renewalDate,
    unsureDate,
    isEditingSuggestedRenewal,
  ]);

  function addAdditionalLicense() {
    if (additionalLicenses.length >= 4) return; // max 5 total (1 primary + 4 additional)
    setAdditionalLicenses((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        state: "",
        licenseType: "",
        renewalDate: "",
        unsureDate: false,
      },
    ]);
  }

  function removeAdditionalLicense(id: string) {
    setAdditionalLicenses((prev) => prev.filter((l) => l.id !== id));
  }

  function updateAdditionalLicense(id: string, update: Partial<AdditionalLicense>) {
    setAdditionalLicenses((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...update } : l))
    );
  }

  async function handleSubmit() {
    const finalRenewalDate = getFinalRenewalDate(state, licenseType, renewalDate, unsureDate);
    setLoading(true);
    setError("");
    try {
      // POST primary license
      const primaryRes = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          licenseType,
          specialty: specialty || undefined,
          renewalDate: finalRenewalDate,
        }),
      });
      if (!primaryRes.ok) {
        const data = await primaryRes.json();
        throw new Error(data.error ?? "Failed to create license");
      }

      // POST additional licenses in sequence
      for (const lic of additionalLicenses) {
        if (!lic.state || !lic.licenseType) continue;
        const licRenewalDate = getFinalRenewalDate(
          lic.state,
          lic.licenseType,
          lic.renewalDate,
          lic.unsureDate,
        );
        const res = await fetch("/api/licenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: lic.state,
            licenseType: lic.licenseType,
            specialty: specialty || undefined,
            renewalDate: licRenewalDate,
          }),
        });
        if (!res.ok) {
          // Non-fatal: continue even if additional license fails (e.g. duplicate)
          console.warn(`Failed to create license for ${lic.state}`);
        }
      }

      router.push("/dashboard?onboarded=1");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const totalSteps = 4;

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((n) => (
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
                Step 1 of {totalSteps}
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
                Primary state only — you&apos;ll add more licenses in a moment.
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
                Step 2 of {totalSteps}
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
                Step 3 of {totalSteps}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                When is your next license renewal?
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                This lets us show your countdown and pace your CME plan.
              </p>

              {primaryRenewalRule && (
                <div className="mb-4 bg-teal-50 border border-teal-100 text-[#0F766E] rounded-xl px-4 py-3 text-sm">
                  Your {selectedStateName} {licenseType} license renews:{" "}
                  <span className="font-semibold">{primaryRenewalRule.renewalDeadline}</span>
                </div>
              )}

              {primaryRenewalRule?.renewalType === "birth-based" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Birth month
                  </label>
                  <select
                    value={birthMonth ?? ""}
                    onChange={(e) => {
                      setBirthMonth(e.target.value ? Number(e.target.value) : null);
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select your birth month…</option>
                    {BIRTH_MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {canUsePrimarySmartEstimate && !isPrimaryVariableRenewal && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">Is this your next renewal?</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={applyPrimarySuggestedRenewal}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        unsureDate && !isEditingSuggestedRenewal
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUnsureDate(false);
                        setIsEditingSuggestedRenewal(true);
                      }}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        !unsureDate || isEditingSuggestedRenewal
                          ? "bg-white border-slate-300 text-slate-900"
                          : "border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => {
                    setRenewalDate(e.target.value);
                    setUnsureDate(false);
                    setIsEditingSuggestedRenewal(true);
                  }}
                  disabled={shouldLockPrimaryRenewalInput}
                  className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    shouldLockPrimaryRenewalInput ? "bg-slate-50 text-slate-500" : ""
                  }`}
                />
              </div>

              {primarySuggestedRenewal.note && (
                <p className="text-xs text-slate-500 mb-4 px-1">{primarySuggestedRenewal.note}</p>
              )}

              {isPrimaryVariableRenewal && primaryRenewalRule && (
                <p className="text-xs text-slate-500 mb-4 px-1">
                  Renewal timing is individualized for this license. Use the date listed on your
                  board record: {primaryRenewalRule.renewalDeadline}.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  if (unsureDate) {
                    setUnsureDate(false);
                    setIsEditingSuggestedRenewal(true);
                    return;
                  }

                  applyPrimarySuggestedRenewal();
                }}
                disabled={!canUsePrimarySmartEstimate}
                className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border w-full transition-colors ${
                  !canUsePrimarySmartEstimate
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : unsureDate && !isEditingSuggestedRenewal
                    ? "border-blue-300 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    unsureDate && !isEditingSuggestedRenewal
                      ? "bg-blue-600 border-blue-600"
                      : "border-slate-300"
                  }`}
                >
                  {unsureDate && !isEditingSuggestedRenewal && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                I&apos;m not sure — estimate based on {selectedStateName || "my state"}
              </button>

              {!canUsePrimarySmartEstimate && primaryRenewalRule?.renewalType === "birth-based" && (
                <p className="text-xs text-slate-400 mt-2 px-1">
                  Choose your birth month to generate a smart renewal estimate.
                </p>
              )}

              {!canUsePrimarySmartEstimate && isPrimaryVariableRenewal && (
                <p className="text-xs text-slate-400 mt-2 px-1">
                  Smart estimates are not available when renewal timing varies by board record.
                </p>
              )}

              {unsureDate && !isEditingSuggestedRenewal && canUsePrimarySmartEstimate && (
                <p className="text-xs text-slate-400 mt-2 px-1">
                  We&apos;ll use this smart estimate as your renewal date. You can update it anytime.
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!canSubmitStep3}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Multi-state */}
          {step === 4 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                Step 4 of {totalSteps}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Are you licensed in more than one state?
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                Many physicians hold licenses in multiple states. We&apos;ll track compliance for each one.
              </p>

              {/* Yes / No choice */}
              {isMultiState === null && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsMultiState(true); addAdditionalLicense(); }}
                    className="flex-1 py-4 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMultiState(false)}
                    className="flex-1 py-4 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}

              {/* Multi-state license cards */}
              {isMultiState === true && (
                <div className="space-y-4">
                  {/* Primary license chip */}
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedStateName} — {licenseType}
                    </span>
                    <span className="text-xs text-blue-500">(primary)</span>
                  </div>

                  {/* Additional license cards */}
                  {additionalLicenses.map((lic, idx) => {
                    const additionalSuggestedRenewal = getSmartRenewalSuggestion(
                      lic.state,
                      lic.licenseType,
                    );
                    const canUseAdditionalSmartEstimate = !!additionalSuggestedRenewal.date;

                    return (
                      <div key={lic.id} className="border border-slate-200 rounded-xl p-4 space-y-3 relative">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            License {idx + 2}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeAdditionalLicense(lic.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            aria-label="Remove license"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* State */}
                        <select
                          value={lic.state}
                          onChange={(e) =>
                            updateAdditionalLicense(lic.id, {
                              state: e.target.value,
                              renewalDate: "",
                              unsureDate: false,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="" disabled>Select state…</option>
                          {US_STATES.filter((s) => s.code !== state).map((s) => (
                            <option key={s.code} value={s.code}>{s.name}</option>
                          ))}
                        </select>

                        {/* License Type */}
                        <div className="flex gap-2">
                          {["MD", "DO"].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() =>
                                updateAdditionalLicense(lic.id, {
                                  licenseType: type,
                                  renewalDate: "",
                                  unsureDate: false,
                                })
                              }
                              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                                lic.licenseType === type
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 text-slate-700 hover:border-blue-300"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>

                        {/* Renewal date */}
                        {!lic.unsureDate && (
                          <input
                            type="date"
                            value={lic.renewalDate}
                            onChange={(e) => updateAdditionalLicense(lic.id, { renewalDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (lic.unsureDate) {
                              updateAdditionalLicense(lic.id, { unsureDate: false });
                              return;
                            }

                            if (!canUseAdditionalSmartEstimate || !additionalSuggestedRenewal.date) return;

                            updateAdditionalLicense(lic.id, {
                              unsureDate: true,
                              renewalDate: additionalSuggestedRenewal.date,
                            });
                          }}
                          disabled={!!lic.state && !!lic.licenseType && !canUseAdditionalSmartEstimate}
                          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border w-full transition-colors ${
                            !!lic.state && !!lic.licenseType && !canUseAdditionalSmartEstimate
                              ? "border-slate-200 text-slate-300 cursor-not-allowed"
                              : lic.unsureDate
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-slate-200 text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${lic.unsureDate ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                            {lic.unsureDate && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          Estimate renewal date
                        </button>
                      </div>
                    );
                  })}

                  {/* Add another state button */}
                  {additionalLicenses.length < 4 && (
                    <button
                      type="button"
                      onClick={addAdditionalLicense}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      + Add another state
                    </button>
                  )}

                  {additionalLicenses.length >= 4 && (
                    <p className="text-xs text-slate-400 text-center">
                      Maximum of 5 licenses during setup — add more later in Profile.
                    </p>
                  )}
                </div>
              )}

              {/* No = skip, just proceed */}
              {isMultiState === false && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
                  Got it — we&apos;ll track compliance for{" "}
                  <strong>{selectedStateName}</strong> only. You can add more licenses anytime from your Profile.
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setStep(3); setIsMultiState(null); setAdditionalLicenses([]); }}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || isMultiState === null}
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
