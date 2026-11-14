import { prismaMock as db } from "../helpers/prisma-mock";
import { beforeEach, expect, test } from "vitest";
import { expectsPracticeStep, setupStepLabel, totalSetupSteps } from "@/lib/setup-steps";
import { practiceQuestionOutlook } from "@/lib/practice-questions";

const ALL = ["NV:MD", "NV:DO", "KS:MD", "KS:DO"];
const base = { questionPairs: ["NV:MD", "NV:DO"], hasOpenQuestions: false, primaryCandidates: ALL, additionalPairs: [] as string[] };

test("a fifth screen is announced from step 1 when every choice leads to practice questions", () => {
  expect(expectsPracticeStep({ ...base, questionPairs: ALL })).toBe(true);
  expect(setupStepLabel(1, totalSetupSteps(true))).toBe("Step 1 of 5");
  expect(setupStepLabel(4, totalSetupSteps(true))).toBe("Step 4 of 5");
  expect(setupStepLabel(5, totalSetupSteps(true))).toBe("Step 5 of 5");
});
test("four screens are announced only when no chosen license raises a question", () => {
  expect(expectsPracticeStep({ ...base, questionPairs: [] })).toBe(false);
  expect(expectsPracticeStep({ ...base, primaryCandidates: ["KS:MD"] })).toBe(false);
  expect(expectsPracticeStep({ ...base, primaryCandidates: ["KS:MD", "KS:DO"] })).toBe(false);
  expect(setupStepLabel(4, totalSetupSteps(false))).toBe("Step 4 of 4");
});
test("no total is claimed while the count still depends on a choice", () => {
  // Nothing chosen yet, and only some states raise a question.
  expect(expectsPracticeStep(base)).toBeNull();
  // State chosen, license type not, and only one type raises a question.
  expect(expectsPracticeStep({ ...base, questionPairs: ["NV:MD"], primaryCandidates: ["NV:MD", "NV:DO"] })).toBeNull();
  // The server lookup failed.
  expect(expectsPracticeStep({ ...base, questionPairs: null, primaryCandidates: ["NV:MD"] })).toBeNull();
  expect(setupStepLabel(2, totalSetupSteps(null))).toBe("Step 2");
});
test("the count follows the choices as they are made", () => {
  expect(expectsPracticeStep({ ...base, primaryCandidates: ["NV:MD", "NV:DO"] })).toBe(true);
  expect(expectsPracticeStep({ ...base, primaryCandidates: ["NV:DO"] })).toBe(true);
  // A second license that raises a question adds the fifth screen.
  expect(expectsPracticeStep({ ...base, primaryCandidates: ["KS:MD"], additionalPairs: ["NV:MD"] })).toBe(true);
  // Licenses already on the account do too, whatever is chosen here.
  expect(expectsPracticeStep({ ...base, questionPairs: null, hasOpenQuestions: true })).toBe(true);
});

beforeEach(() => {
  db.physicianLicense.findMany.mockResolvedValue([]);
  db.userRequirementCompletion.findMany.mockResolvedValue([]);
});
test("the outlook lists exactly the pairs whose rules map to a practice question", async () => {
  db.complianceRule.findMany.mockResolvedValue([
    { state: "NV", licenseType: "MD", mandatoryRequirements: [{ id: "mate", notes: "8 hrs one-time — If DEA-registered" }] },
    // A caveat that is not an applicability condition must not become a question.
    { state: "KS", licenseType: "MD", mandatoryRequirements: [{ id: "plain", notes: "1 hr — Category 1 only" }] },
    { state: "CA", licenseType: "MD", mandatoryRequirements: [] },
  ]);
  expect(await practiceQuestionOutlook("user")).toEqual({ questionPairs: ["NV:MD"], hasOpenQuestions: false });
  // Only live rows with a cadence a question can settle are considered.
  const query = db.complianceRule.findMany.mock.calls[0][0];
  expect(query.select.mandatoryRequirements.where).toMatchObject({ retiredAt: null, cadence: { in: expect.arrayContaining(["CONDITIONAL", "ONE_TIME"]) } });
});
test("a question already answered for every license is not counted again", async () => {
  db.complianceRule.findMany.mockResolvedValue([
    { state: "NV", licenseType: "MD", mandatoryRequirements: [{ id: "mate", notes: "8 hrs one-time — If DEA-registered" }] },
  ]);
  db.userRequirementCompletion.findMany.mockResolvedValue([{ mandatoryRequirementId: "mate", physicianLicenseId: null }]);
  expect((await practiceQuestionOutlook("user")).questionPairs).toEqual([]);
});
