import { expect, test } from "vitest";
import { assignedRenewalDateOptions } from "@/lib/renewal-date-options";
import { getRenewalRuleConfig, getSuggestedRenewalDate } from "@/lib/state-requirements";

const at = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);

test("Florida MD offers its two possible renewal dates, soonest first", () => {
  expect(assignedRenewalDateOptions("FL", "MD", at(2026, 11, 14))).toEqual([
    { date: "2027-01-31", label: "Jan 31, 2027" },
    { date: "2028-01-31", label: "Jan 31, 2028" },
  ]);
});
test("the options roll forward the day after a renewal date, and always cover an odd and an even year", () => {
  expect(assignedRenewalDateOptions("FL", "MD", at(2027, 1, 31)).map((o) => o.date)).toEqual(["2027-01-31", "2028-01-31"]);
  expect(assignedRenewalDateOptions("FL", "MD", at(2027, 2, 1)).map((o) => o.date)).toEqual(["2028-01-31", "2029-01-31"]);
  for (const reference of [at(2026, 11, 14), at(2027, 6, 1), at(2030, 1, 1)]) {
    const years = assignedRenewalDateOptions("FL", "MD", reference).map((o) => Number(o.date.slice(0, 4)) % 2);
    expect(years.sort()).toEqual([0, 1]);
  }
});
test("the buttons rest on the rule file's own Florida MD wording", () => {
  // If this wording changes, the options switch off and this test says why.
  const rule = getRenewalRuleConfig("FL", "MD");
  expect(rule.renewalType).toBe("variable");
  expect(rule.renewalDeadline).toBe("January 31 of your assigned odd- or even-year biennium");
  // The rule file itself still cannot estimate the date; the buttons are a choice, not an estimate.
  expect(getSuggestedRenewalDate("FL", "MD", { referenceDate: at(2026, 11, 14) }).date).toBeNull();
});
test("no other license gets date buttons", () => {
  // Florida DO renews on one fixed date, which setup already pre-fills.
  expect(assignedRenewalDateOptions("FL", "DO", at(2026, 11, 14))).toEqual([]);
  expect(getSuggestedRenewalDate("FL", "DO", { referenceDate: at(2026, 11, 14) }).date).toBe("2028-03-31");
  // Other "variable" states are set per physician, with no short list of dates.
  expect(assignedRenewalDateOptions("CA", "MD", at(2026, 11, 14))).toEqual([]);
  expect(assignedRenewalDateOptions("NV", "MD", at(2026, 11, 14))).toEqual([]);
  expect(assignedRenewalDateOptions("", "", at(2026, 11, 14))).toEqual([]);
});
