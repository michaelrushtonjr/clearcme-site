import { describe, expect, test } from "vitest";
import {
  getRenewalRuleConfig,
  getSuggestedRenewalDate,
  STATE_REQUIREMENTS,
} from "@/lib/state-requirements";

// Regressions for the verified September 28–29, 2026 corrections. Assert only
// the affected public fields so unrelated state/topic edits remain independent.
describe.each(["MD", "DO"] as const)("state requirements (%s)", (licenseType) => {
  test("Oklahoma includes scope-conditional OMMA recommender education", () => {
    const topics = STATE_REQUIREMENTS.OK[licenseType].mandatoryTopics.filter(
      ({ topic }) => topic === "Medical marijuana recommender education (OMMA registry)",
    );
    expect(topics).toHaveLength(1);
    const education = topics[0];
    expect(education.hours).toContain("OMMA-approved initial course");
    expect(education.hours).toContain("annual CME to stay registered");
    expect(education.hours).toContain("hours set by OMMA rule");
    expect(education.note).toContain("If you recommend medical marijuana");
    expect(education.note).toContain("beginning Jan. 1, 2026");
    expect(education.note).toContain("before you are listed on the registry");
    expect(education.note).toContain("annually to remain on it");
  });

  test("Connecticut exposes birth-month annual registration separately from its CME lookback", () => {
    const requirement = STATE_REQUIREMENTS.CT[licenseType];
    const rule = getRenewalRuleConfig("CT", licenseType);
    expect(requirement.renewalType).toBe("birth-based");
    expect(requirement.renewalDeadline).toMatch(/month of your birth, annually/i);
    expect(rule).toMatchObject({
      renewalType: "birth-based",
      renewalDeadline: requirement.renewalDeadline,
      schedule: { kind: "birth-based" },
    });
    expect(rule.schedule).not.toHaveProperty("usesExactBirthday", true);
    expect(requirement.cycleYears).toBe(2);
    expect(requirement.cycleLabel).toContain("24-month CME lookback");
  });

  test.each([
    { referenceDate: new Date(2026, 0, 15), expected: "2026-04-30" },
    { referenceDate: new Date(2026, 3, 30), expected: "2026-04-30" },
    { referenceDate: new Date(2026, 4, 1), expected: "2027-04-30" },
  ])("Connecticut suggests $expected from $referenceDate", ({ referenceDate, expected }) => {
    expect(getSuggestedRenewalDate("CT", licenseType, {
      birthMonth: 4,
      referenceDate,
    })).toMatchObject({ date: expected });
  });

  test("Mississippi labels both first-cycle exemptions while retaining the 40-hour requirement", () => {
    const requirement = STATE_REQUIREMENTS.MS[licenseType];
    expect(requirement.totalHours).toBe(40);
    expect(requirement.cycleYears).toBe(2);
    expect(requirement.totalHoursLabel).toMatch(/^40 hours/);
    expect(requirement.totalHoursLabel).toContain("initial license");
    expect(requirement.totalHoursLabel).toContain("or first specialty-board certification");
    expect(requirement.totalHoursLabel).toContain("after the cycle's July 1 start");
    expect(requirement.totalHoursLabel).toContain("exempt for that cycle");
    expect(requirement.totalHoursLabel).toContain("CME resumes in full the next 2-year cycle");
  });
});

// Kentucky's explicit cadence metadata is currently authorized for MD only;
// STATE_REQUIREMENTS intentionally strips it from the inherited DO topics.
describe("Kentucky MD one-time education", () => {
  test.each([
    { name: "Domestic violence", hours: "3 hrs one-time", deadlineYears: 3 },
    { name: "Pediatric abusive head trauma", hours: "1 hr one-time", deadlineYears: 5 },
  ])("$name has an initial deadline, not a recurring interval", ({ name, hours, deadlineYears }) => {
    const topics = STATE_REQUIREMENTS.KY.MD.mandatoryTopics.filter(
      ({ topic }) => topic === name,
    );
    expect(topics).toHaveLength(1);
    const education = topics[0];
    expect(education.cadence).toBe("ONE_TIME");
    expect(education.intervalYears).toBeUndefined();
    expect(education.hours).toContain(hours);
    const description = `${education.hours}; ${education.note ?? ""}`;
    expect(description).toContain(`within ${deadlineYears} years of initial licensure`);
    expect(description).not.toMatch(/every\s+(?:3|5)\s+years/i);
  });
});
