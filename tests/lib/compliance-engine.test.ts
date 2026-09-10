import { describe, expect, test } from "vitest";
import { evaluateLicense } from "@/lib/compliance-engine";
import { dashboardCompliance, compliancePageCompliance, apiCompliance, notificationCompliance, auditCompliance } from "@/lib/compliance-adapters";
import unanswered from "../fixtures/requirements/unanswered-conditional.json";
import expired from "../fixtures/requirements/expired-attestation.json";
import zero from "../fixtures/requirements/zero-hour-requirement.json";
import { certificate, licenseInput, requirement } from "../helpers/compliance-fixtures";
import { buildNextAction } from "@/lib/next-action";

const conditional = licenseInput({ requirements: [requirement({ ...unanswered, cadence: "CONDITIONAL", topic: "ETHICS" })] });
const expiredInput = licenseInput({ requirements: [requirement({ ...expired.requirement, cadence: "EVERY_N_YEARS", topic: "ETHICS" })], completions: [{ ...expired.completion, completedAt: new Date(expired.completion.completedAt) }] });
for (const [name, adapt] of Object.entries({ dashboard: dashboardCompliance, compliancePage: compliancePageCompliance, api: apiCompliance, notification: notificationCompliance, auditZip: auditCompliance })) {
  describe(name, () => {
    test("unanswered conditional is UNKNOWN, never audit-ready", () => {
      const result = adapt(conditional);
      expect(result.overall).toBe("UNKNOWN"); expect(result.isCompliant).toBe(false); expect(result.statusLabel).toBe("Needs your answer");
      expect(result.mandatoryGaps[0].status).toBe("UNKNOWN");
    });
    test("expired attestation is EXPIRED and ACTION_NEEDED", () => {
      const result = adapt(expiredInput);
      expect(result.overall).toBe("ACTION_NEEDED"); expect(result.mandatoryGaps[0].status).toBe("EXPIRED"); expect(result.isCompliant).toBe(false);
    });
    test("zero hours without evidence stays unknown", () => {
      expect(adapt(licenseInput({ requirements: [requirement({ ...zero, topic: "CHILD_ABUSE", cadence: "EVERY_RENEWAL" })] })).overall).toBe("UNKNOWN");
    });
    test("NEEDS_REVIEW hours are uncertain", () => {
      const result = adapt(licenseInput({ rule: { totalHours: 1, renewalCycle: 24 }, certificates: [certificate({ extractionStatus: "NEEDS_REVIEW" })] }));
      expect(result.hoursEarned).toBe(0); expect(result.uncertainHours).toBe(1); expect(result.isCompliant).toBe(false);
    });
  });
}
test("synthetic NV MD golden evaluation", () => { expect(evaluateLicense(licenseInput({ rule: { totalHours: 1, renewalCycle: 24 }, requirements: [requirement()], certificates: [certificate()] }))).toMatchSnapshot(); });
test("Kansas and missing rules are NOT_COMPUTED", () => {
  const input = licenseInput(); input.license.state = "KS";
  expect(evaluateLicense(input).overall).toBe("NOT_COMPUTED");
  expect(evaluateLicense(licenseInput({ rule: null })).overall).toBe("NOT_COMPUTED");
});
test("retirement preserves history without evaluating the retired requirement", () => {
  expect(evaluateLicense(licenseInput({ requirements: [requirement({ retiredAt: new Date() })] })).requirements).toEqual([]);
});
test("unknown is retained even when another requirement is due and hours are full", () => {
  expect(evaluateLicense({ ...conditional, requirements: [...conditional.requirements, requirement({ id: "due" })] }).overall).toBe("UNKNOWN");
});
test("next action asks for answers when hours gap is zero", () => {
  expect(buildNextAction([{ state: "NV", licenseType: "MD", daysUntilRenewal: 1, renewalDateLabel: "tomorrow", generalGapHours: 0, isCompliant: false, overall: "UNKNOWN", mandatoryGaps: [] }])?.headline).toBe("Needs your answer");
});
test("a lookback requirement cannot be met by undated attestation", () => {
  const input = licenseInput({ requirements: [requirement({ hoursRequired: 0, lookbackYears: 2, cadence: "CONDITIONAL" })], completions: [{ mandatoryRequirementId: "requirement", physicianLicenseId: "license", completedAt: null, completedYear: null, notes: null }] });
  expect(evaluateLicense(input).overall).toBe("UNKNOWN");
});
