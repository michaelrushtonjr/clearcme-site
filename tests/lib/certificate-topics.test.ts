import { expect, test } from "vitest";
import { inferSpecialTopics, extractedTopicFlags, validateTopicAllocations } from "@/lib/certificate-topics";
import { evaluateLicense } from "@/lib/compliance-engine";
import { certificate, licenseInput, requirement } from "../helpers/compliance-fixtures";

const titles: [string, string | null][] = [
  ["Responsible opioid prescribing", "OPIOID_PRESCRIBING"], ["Controlled-substance prescribing", "OPIOID_PRESCRIBING"],
  ["Pain management", "PAIN_MANAGEMENT"], ["Implicit bias", "IMPLICIT_BIAS"], ["End-of-life care", "END_OF_LIFE_CARE"],
  ["Domestic violence", "DOMESTIC_VIOLENCE"], ["Child abuse recognition", "CHILD_ABUSE"], ["Elder abuse", "ELDER_ABUSE"],
  ["Human trafficking recognition", "HUMAN_TRAFFICKING"], ["Infection control", "INFECTION_CONTROL"],
  ["Patient safety", "PATIENT_SAFETY"], ["Medical ethics", "ETHICS"], ["Cultural humility", "CULTURAL_COMPETENCY"],
  ["Substance use disorders", "SUBSTANCE_USE"], ["Suicide prevention", "SUICIDE_PREVENTION"],
  ["Safe antibiotic prescribing", null], ["Prescribing insulin", null], ["Cultural history of medicine", null],
  ["Child development", null], ["Traffic accident triage", null],
];
test.each(titles)("topic suggestions: %s", (title, topic) => {
  const flags = inferSpecialTopics({ title });
  if (topic) expect(flags).toContain(topic); else expect(flags).toEqual([]);
});
test("extractor assignments require keyword evidence; suggestions alone are insufficient", () => {
  expect(extractedTopicFlags(["OPIOID_PRESCRIBING"], { title: "Safe antibiotic prescribing" })).toEqual([]);
  const result = evaluateLicense(licenseInput({ requirements: [requirement()], certificates: [certificate({ extractedSpecialTopics: [], suggestedSpecialTopics: ["ETHICS"] })] }));
  expect(result.requirements[0].status).toBe("NOT_MET");
});
test("unspecified categories count only AMA Category 1 / AOA 1-A; other hours are uncertain", () => {
  const result = evaluateLicense(licenseInput({ certificates: [certificate(), certificate({ id: "uncertain", creditType: "AAFP_PRESCRIBED" }), certificate({ id: "text", creditType: null, accreditation: "AOA Category 1-A" })] }));
  expect(result.generalHours).toEqual({ required: 0, counted: 2, uncertain: 1 });
});
test("explicit accepted types override the fallback", () => {
  const result = evaluateLicense(licenseInput({ rule: { totalHours: 1, renewalCycle: 24, acceptedCreditTypes: ["AAFP_PRESCRIBED"] }, certificates: [certificate(), certificate({ id: "accepted", creditType: "AAFP_PRESCRIBED" })] }));
  expect(result.generalHours).toEqual({ required: 1, counted: 1, uncertain: 1 });
});
test("unrecorded manual multi-topic hours go to the first confirmed topic only", () => {
  const result = evaluateLicense(licenseInput({ requirements: [requirement(), requirement({ id: "pain", topic: "PAIN_MANAGEMENT" })], certificates: [certificate({ manuallyVerified: true, specialTopics: ["ETHICS", "PAIN_MANAGEMENT"], creditHours: 2 })] }));
  expect(result.requirements.map((r) => r.earned)).toEqual([2, 0]);
});
test("explicit splits count once and cannot exceed certificate hours", () => {
  const input = licenseInput({ requirements: [requirement(), requirement({ id: "pain", topic: "PAIN_MANAGEMENT" })], certificates: [certificate({ manuallyVerified: true, specialTopics: ["ETHICS", "PAIN_MANAGEMENT"], creditHours: 2, topicHourAllocations: { ETHICS: 1, PAIN_MANAGEMENT: 1 } })] });
  expect(evaluateLicense(input).requirements.map((r) => r.earned)).toEqual([1, 1]);
  expect(evaluateLicense(input).generalHours.counted).toBe(2);
  expect(() => validateTopicAllocations({ ETHICS: 2, PAIN_MANAGEMENT: 1 }, 2)).toThrow("cannot exceed");
});
test("linked attestations cannot reuse the same certificate across different topics without a split", () => {
  const result = evaluateLicense(licenseInput({ requirements: [requirement({ id: "first", cadence: "ONE_TIME" }), requirement({ id: "second", topic: "PAIN_MANAGEMENT", cadence: "ONE_TIME" })], certificates: [certificate({ specialTopics: [], extractedSpecialTopics: [], creditHours: 2 })], completions: ["first", "second"].map((id) => ({ mandatoryRequirementId: id, physicianLicenseId: "license", completedAt: new Date("2026-01-15"), completedYear: 2026, notes: "__CLEARCME_CERT__:certificate" })) }));
  expect(result.requirements.map((r) => r.status)).toEqual(["MET", "NOT_MET"]);
});
test("a confirmed certificate link and extracted flag share one topic allocation", () => {
  const result = evaluateLicense(licenseInput({ requirements: [requirement({ id: "ethics" }), requirement({ id: "pain", topic: "PAIN_MANAGEMENT", cadence: "ONE_TIME" })], certificates: [certificate()], completions: [{ mandatoryRequirementId: "pain", physicianLicenseId: "license", completedAt: new Date("2026-01-15"), completedYear: 2026, notes: "__CLEARCME_CERT__:certificate" }] }));
  expect(result.requirements.map((r) => r.status)).toEqual(["NOT_MET", "MET"]);
});
