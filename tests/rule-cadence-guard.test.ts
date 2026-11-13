import { describe, expect, test } from "vitest";
import { ONE_TIME_KINDS, isOneTimeKind, labelRecurs } from "../scripts/label-cadence";
import { cadenceFor } from "../scripts/legacy-cadence-audit";
import { planSync } from "../scripts/rule-sync-planner";
import { sourceRows } from "../scripts/sync-rules-from-source";

// Shapes below mirror the rows the May 2026 text inference left in the account database.
const stored = (overrides: Record<string, unknown> = {}) => ({
  requirementKey: "PA:MD:CHILD_ABUSE", topic: "CHILD_ABUSE", hoursRequired: 2, description: "Child abuse recognition and reporting",
  firstRenewalOnly: true, cadence: "INITIAL_LICENSE_ONLY", intervalYears: null, lookbackYears: null, attestationAllowed: true,
  notes: "2 hrs per cycle — Plus 3 hrs at initial licensure", retiredAt: null, ...overrides,
});
const childAbuse = { topic: "Child abuse recognition and reporting", hours: "2 hrs per cycle", note: "Plus 3 hrs at initial licensure" };
const trafficking = { topic: "Human trafficking prevention", hours: "1 hr at first renewal and every third renewal after", note: "HHSC-approved course required" };
const storedTrafficking = () => stored({ requirementKey: "TX:MD:HUMAN_TRAFFICKING", topic: "HUMAN_TRAFFICKING", hoursRequired: 1, description: trafficking.topic, cadence: "FIRST_RENEWAL_ONLY", notes: trafficking.hours });

describe("what a label says about recurrence", () => {
  test.each([
    "2 hrs per cycle", "3 hrs per 2-year cycle", "0.5 hr per renewal", "1 hr annually", "1 hr every 2 years", "Initial + every 4 years",
    "1 hr at first renewal and every third renewal after", "1 hr initial, then 1-hr refresher at least every 3 years",
    "2 hrs front-loaded, then every 8 years", "Every other renewal", "Board course every 48 months", "2 hrs each full CSR renewal period",
    "20 hrs Category I per 2 years", "2 hrs in even-numbered years", "1 hr online, once every 2 calendar years",
  ])("'%s' recurs", (label) => expect(labelRecurs(label)).toBe(true));
  test.each([
    "8 hrs one-time", "1 hr one-time, within 5 years of initial licensure", "1 hr first renewal only", "1 hr initial course",
    "Required before first renewal", "One-time training", "At least 2 hrs", "6 hrs one-time/conditional", "2 hrs for 2027+ renewals", "", undefined,
  ])("'%s' does not", (label) => expect(labelRecurs(label)).toBe(false));
  test("a row counts as one-time when either stored field says so", () => {
    expect(isOneTimeKind("INITIAL_LICENSE_ONLY", false)).toBe(true);
    expect(isOneTimeKind("EVERY_RENEWAL", true)).toBe(true);
    expect(isOneTimeKind("EVERY_N_YEARS", false)).toBe(false);
  });
});

describe("a recurring rule cannot be synced as one-time", () => {
  test("a stored initial-only tag on a per-cycle rule is refused, not preserved", () => {
    expect(() => sourceRows("PA", "MD", [childAbuse], [stored()], []))
      .toThrow(/Cadence conflict: PA MD: Child abuse recognition and reporting .*2 hrs per cycle.*stored cadence is INITIAL_LICENSE_ONLY/);
  });
  test("the dry run collects every conflict instead of stopping at the first", () => {
    const conflicts: string[] = [];
    sourceRows("TX", "MD", [trafficking], [storedTrafficking()], [], conflicts);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toContain("stored cadence is FIRST_RENEWAL_ONLY");
  });
  test("an explicit recurring cadence replaces the stored tag and clears the one-time flag", () => {
    const existing = stored();
    const rows = sourceRows("PA", "MD", [{ ...childAbuse, cadence: "EVERY_RENEWAL" }], [existing], []);
    expect(planSync(rows, [existing]).updates).toEqual([{
      requirementKey: "PA:MD:CHILD_ABUSE",
      changes: { firstRenewalOnly: { from: true, to: false }, cadence: { from: "INITIAL_LICENSE_ONLY", to: "EVERY_RENEWAL" } },
    }]);
  });
  test("first renewal plus every third renewal syncs as a long-cycle rule once the source says so", () => {
    const rows = sourceRows("TX", "MD", [{ ...trafficking, cadence: "EVERY_N_YEARS", intervalYears: 6 }], [storedTrafficking()], []);
    expect(rows[0]).toMatchObject({ cadence: "EVERY_N_YEARS", intervalYears: 6, lookbackYears: 6, firstRenewalOnly: false });
  });
  test("a source cadence that contradicts its own label is refused too", () => {
    expect(() => sourceRows("PA", "MD", [{ ...childAbuse, cadence: "ONE_TIME" }], [], [])).toThrow(/source cadence is ONE_TIME/);
  });
  test("a one-time label keeps its stored tag, whatever its note says", () => {
    const existing = stored({ requirementKey: "PA:MD:OPIOID_PRESCRIBING", topic: "OPIOID_PRESCRIBING", hoursRequired: 4, description: "Initial opioid education", notes: "4 hrs one-time" });
    const rows = sourceRows("PA", "MD", [{ topic: "Initial opioid education", hours: "4 hrs one-time", note: "Counted in the cycle it is taken; new licensees every cycle" }], [existing], []);
    expect(rows[0]).toMatchObject({ cadence: "INITIAL_LICENSE_ONLY", firstRenewalOnly: true });
    expect(planSync(rows, [existing])).toEqual({ creates: [], updates: [], retires: [] });
  });
});

describe("a stored row is never lent to a second topic", () => {
  const lifeOfTheMother = {
    requirementKey: "TX:MD:OTHER_MANDATORY", topic: "OTHER_MANDATORY", hoursRequired: 0, description: "Life of the Mother Act emergency care CE",
    firstRenewalOnly: true, cadence: "ONE_TIME", intervalYears: null, lookbackYears: null, attestationAllowed: true,
    notes: "One-time training — For physicians providing obstetric care", retiredAt: null,
  };
  test("new sibling topics do not inherit the cadence or notes of the only stored row in their category", () => {
    const rows = sourceRows("TX", "MD", [
      { topic: "Forensic evidence collection / sexual assault survivor care", hours: "At least 2 hrs" },
      { topic: "Nutrition and metabolic health", hours: "At least 1 hr per renewal cycle" },
      { topic: "Life of the Mother Act emergency care CE", hours: "At least 1 hr, one-time" },
    ], [lifeOfTheMother], []);
    expect(rows[0]).toMatchObject({ cadence: "CONDITIONAL", firstRenewalOnly: false, notes: "UNVERIFIED-CADENCE: At least 2 hrs" });
    expect(rows[1]).toMatchObject({ cadence: "CONDITIONAL", firstRenewalOnly: false, notes: "UNVERIFIED-CADENCE: At least 1 hr per renewal cycle" });
    expect(rows[2]).toMatchObject({ cadence: "ONE_TIME", requirementKey: "TX:MD:OTHER_MANDATORY", notes: lifeOfTheMother.notes });
  });
  test("a renamed topic still keeps its stored row when it is the only one on each side", () => {
    const rows = sourceRows("TX", "MD", [{ topic: "Life of the Mother Act emergency CE", hours: "At least 1 hr, one-time" }], [lifeOfTheMother], []);
    expect(rows[0]).toMatchObject({ cadence: "ONE_TIME", requirementKey: "TX:MD:OTHER_MANDATORY", description: "Life of the Mother Act emergency CE" });
  });
  test("two unmatched topics competing for one stored row both start as new", () => {
    const rows = sourceRows("TX", "MD", [
      { topic: "Emergency obstetric care", hours: "At least 1 hr, one-time" },
      { topic: "Nutrition and metabolic health", hours: "At least 1 hr per renewal cycle" },
    ], [lifeOfTheMother], []);
    expect(rows.map((row: { cadence: string }) => row.cadence)).toEqual(["CONDITIONAL", "CONDITIONAL"]);
  });
});

describe("legacy text inference (audit helper, never used by sync)", () => {
  test.each([
    [childAbuse, "EVERY_RENEWAL"],
    [{ hours: "Initial + every 4 years" }, "EVERY_N_YEARS"],
    [{ hours: "1 hr every 2 years", note: "Also required at initial licensure" }, "EVERY_N_YEARS"],
    [{ hours: "1 hr first renewal only" }, "FIRST_RENEWAL_ONLY"],
    [{ hours: "1 hr initial course" }, "INITIAL_LICENSE_ONLY"],
    [{ hours: "8 hrs one-time", note: "If DEA-registered" }, "ONE_TIME"],
  ])("%o reads as %s", (topic, cadence) => expect(cadenceFor(topic)).toBe(cadence));
  test("first renewal plus every third renewal no longer reads as first-renewal-only", () => {
    expect(ONE_TIME_KINDS).not.toContain(cadenceFor(trafficking));
  });
});
