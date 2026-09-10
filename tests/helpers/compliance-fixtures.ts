import type { EngineRequirement, LicenseInput, EngineCertificate } from "@/lib/compliance-engine";
export const today = new Date("2026-09-10T12:00:00Z");
export function requirement(data: Partial<EngineRequirement> = {}): EngineRequirement {
  return { id: "requirement", topic: "ETHICS", hoursRequired: 1, cadence: "EVERY_RENEWAL", firstRenewalOnly: false, intervalYears: null, lookbackYears: null, attestationAllowed: true, description: "Synthetic requirement", notes: null, retiredAt: null, ...data };
}
export function certificate(data: Partial<EngineCertificate> = {}): EngineCertificate {
  return { id: "certificate", title: "Clinical ethics", topics: ["ethics"], creditHours: 1, activityDate: new Date("2026-01-15"), extractionStatus: "COMPLETED", creditType: "AMA_PRA_1", accreditation: null, specialTopics: ["ETHICS"], manuallyVerified: false, extractedSpecialTopics: ["ETHICS"], ...data };
}
export function licenseInput(data: Partial<LicenseInput> = {}): LicenseInput {
  return { license: { id: "license", state: "NV", licenseType: "MD", renewalDate: new Date("2026-12-31"), issueDate: new Date("2010-01-01") }, rule: { totalHours: 0, renewalCycle: 24 }, requirements: [], certificates: [], completions: [], today, ...data };
}
