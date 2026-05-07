"use client";

import { useState } from "react";
import {
  STATE_OPTIONS,
  STATE_REQUIREMENTS,
  type LicenseType,
  type StateCode,
} from "@/lib/state-requirements";

const LICENSE_OPTIONS: LicenseType[] = ["MD", "DO"];

export default function CheckYourStateWidget() {
  const [selectedState, setSelectedState] = useState<StateCode | "">("");
  const [selectedLicenseType, setSelectedLicenseType] = useState<LicenseType | "">("");

  const requirement =
    selectedState && selectedLicenseType
      ? STATE_REQUIREMENTS[selectedState][selectedLicenseType]
      : null;

  const visibleTopics = requirement ? requirement.mandatoryTopics.slice(0, 5) : [];
  const hiddenTopicCount = requirement
    ? Math.max(requirement.mandatoryTopics.length - visibleTopics.length, 0)
    : 0;

  return (
    <section className="border-y border-teal-100/70 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),transparent_45%),linear-gradient(180deg,#F7FBFA_0%,#FFFFFF_100%)] py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-white text-[#0F766E] text-xs font-semibold px-4 py-1.5 rounded-full border border-teal-100 shadow-sm uppercase tracking-[0.18em]">
            Instant Preview
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-[#1E293B] mt-5 mb-3">
            What does your state require?
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Pick your state and license type to preview the renewal rules physicians see
            inside ClearCME before they sign up.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] items-start">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-[0_24px_60px_-34px_rgba(15,118,110,0.4)] p-6 sm:p-7">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="state-select"
                  className="block text-sm font-semibold text-[#1E293B] mb-2"
                >
                  State
                </label>
                <select
                  id="state-select"
                  value={selectedState}
                  onChange={(event) => setSelectedState(event.target.value as StateCode | "")}
                  className="w-full rounded-2xl border border-slate-200 bg-[#FAFAF7] px-4 py-3.5 text-base text-slate-700 outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Select your state</option>
                  {STATE_OPTIONS.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="license-select"
                  className="block text-sm font-semibold text-[#1E293B] mb-2"
                >
                  License Type
                </label>
                <select
                  id="license-select"
                  value={selectedLicenseType}
                  onChange={(event) =>
                    setSelectedLicenseType(event.target.value as LicenseType | "")
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-[#FAFAF7] px-4 py-3.5 text-base text-slate-700 outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Select license type</option>
                  {LICENSE_OPTIONS.map((licenseType) => (
                    <option key={licenseType} value={licenseType}>
                      {licenseType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-teal-50/80 border border-teal-100 px-4 py-4">
              <p className="text-sm font-semibold text-[#0F766E]">
                Built from our 50-state compliance map
              </p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                This preview is intentionally concise. Full accounts add specialty rules,
                first-renewal exceptions, and state-by-state edge cases.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-slate-200 shadow-[0_24px_60px_-34px_rgba(30,41,59,0.28)] p-6 sm:p-8 min-h-[25rem]">
            {!requirement ? (
              <div className="h-full flex flex-col justify-center text-center sm:text-left">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-5 mx-auto sm:mx-0">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10m-12 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-playfair text-2xl font-bold text-[#1E293B] mb-3">
                  Choose your state to preview the map
                </h3>
                <p className="text-slate-500 max-w-xl leading-relaxed">
                  We&apos;ll show the cycle length, total CME hours, and the key topic
                  mandates physicians typically miss when renewal season gets close.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0F766E]">
                      {requirement.stateName} • {selectedLicenseType}
                    </span>
                    <h3 className="font-playfair text-3xl font-bold text-[#1E293B] mt-4">
                      Your quick compliance snapshot
                    </h3>
                    <p className="text-slate-500 mt-2 max-w-2xl">
                      A fast look at the baseline rule set before specialty and first-renewal
                      logic get layered in.
                    </p>
                  </div>

                  <a
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0F766E] text-white font-semibold rounded-2xl hover:bg-[#0D9488] transition-colors shadow-sm whitespace-nowrap"
                  >
                    See your full compliance map — Free →
                  </a>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-8">
                  <div className="rounded-3xl border border-slate-200 bg-[#FAFAF7] px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">
                      Total CME Hours
                    </p>
                    <p className="text-3xl font-bold text-[#1E293B] leading-none">
                      {requirement.totalHoursLabel}
                    </p>
                    <p className="text-sm text-slate-500 mt-3">
                      Required per tracked cycle for this license.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-[#FAFAF7] px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">
                      Renewal Cycle
                    </p>
                    <p className="text-3xl font-bold text-[#1E293B] leading-none">
                      {requirement.cycleYears ? `${requirement.cycleYears} year${requirement.cycleYears === 1 ? "" : "s"}` : "Variable"}
                    </p>
                    <p className="text-sm text-slate-500 mt-3">{requirement.cycleLabel}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Key Mandatory Topics
                    </h4>
                    <span className="text-xs text-slate-400">
                      {requirement.mandatoryTopics.length} tracked item
                      {requirement.mandatoryTopics.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {visibleTopics.map((mandatoryTopic) => (
                      <div
                        key={`${mandatoryTopic.topic}-${mandatoryTopic.hours}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="pr-0 sm:pr-6">
                            <p className="font-semibold text-[#1E293B]">{mandatoryTopic.topic}</p>
                            {mandatoryTopic.note && (
                              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                {mandatoryTopic.note}
                              </p>
                            )}
                          </div>
                          <span className="inline-flex self-start rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-[#0F766E]">
                            {mandatoryTopic.hours}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {hiddenTopicCount > 0 && (
                    <p className="text-sm text-slate-500 mt-4">
                      + {hiddenTopicCount} more state-specific item
                      {hiddenTopicCount === 1 ? "" : "s"} inside the full compliance map.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
