import { describe, expect, test } from "vitest";
import { STATE_REQUIREMENTS } from "../lib/state-requirements";
import { statedHours } from "../scripts/rule-source";
import { planSync } from "../scripts/rule-sync-planner";
import { matchExistingRows, sourceRows } from "../scripts/sync-rules-from-source";
// Rule rows exactly as the account database held them on 2026-11-13 (no user data).
import storedRows from "./fixtures/requirements/stored-legacy-cadence.json";

const stored = (overrides: Record<string, unknown> = {}) => ({
  requirementKey: "CA:MD:OTHER_MANDATORY", topic: "OTHER_MANDATORY", hoursRequired: 10, description: "Geriatric medicine",
  firstRenewalOnly: false, cadence: "CONDITIONAL", intervalYears: null, lookbackYears: null, attestationAllowed: true,
  notes: "10 hrs per cycle", retiredAt: null, ...overrides,
});

describe("hours a rule states for itself", () => {
  test.each([
    ["2 hrs per cycle", 2], ["At least 1 hr, one-time", 1], ["0.5 hr per renewal", 0.5], ["3 credits per cycle", 3],
    ["4.5 hrs every 3 years", 4.5], ["20 hrs Category I per 2 years", 20], ["1 hr online, once every 2 calendar years", 1],
  ])("'%s' states %d", (hours, expected) => expect(statedHours({ hours })).toBe(expected));
  test.each([
    "Board course every 48 months", "20% of total mandatory CME per cycle (currently 10 hrs of 50)", "Required every 4 years",
    "Review within prior 2 years before performing an abortion", "Initial + every 4 years", "Training every 6 years", "1 course per cycle", "One-time training",
  ])("'%s' states none", (hours) => expect(statedHours({ hours })).toBeNull());
  test("a number in the rules file wins over the label", () => {
    expect(statedHours({ hours: "20% of total mandatory CME per cycle (currently 10 hrs of 50)", hoursRequired: 10 })).toBe(10);
    expect(statedHours({ hours: "Initial + every 4 years", hoursRequired: 0 })).toBe(0);
  });
});

describe("the sync writes hours only when the rule states them", () => {
  test("a label with no count keeps the stored hours", () => {
    const existing = stored();
    const rows = sourceRows("CA", "MD", [{ topic: "Geriatric medicine", hours: "20% of total mandatory CME per cycle (currently 10 hrs of 50)" }], [existing], []);
    expect(rows[0].hoursRequired).toBe(10);
    expect(planSync(rows, [existing])).toEqual({ creates: [], updates: [], retires: [] });
  });
  test("a new row with no count starts at 0 hours and is listed as a question", () => {
    const questions: string[] = [];
    const rows = sourceRows("AL", "MD", [{ topic: "Collaborative/supervisory practice CME", hours: "Board course every 48 months", cadence: "CONDITIONAL", intervalYears: 4 }], [], questions);
    expect(rows[0]).toMatchObject({ hoursRequired: 0, cadence: "CONDITIONAL", intervalYears: 4, lookbackYears: 4 });
    expect(questions).toEqual([expect.stringContaining("states no hour count")]);
  });
  test("a label that opens with a count still updates the stored hours", () => {
    const existing = stored({ hoursRequired: 0, notes: "One-time training" });
    const rows = sourceRows("CA", "MD", [{ topic: "Geriatric medicine", hours: "At least 1 hr, one-time" }], [existing], []);
    expect(planSync(rows, [existing]).updates).toEqual([{ requirementKey: "CA:MD:OTHER_MANDATORY", changes: { hoursRequired: { from: 0, to: 1 } } }]);
  });
  test("the real California MD geriatric rule keeps its stored 10 hours", () => {
    const rows = sourceRows("CA", "MD", STATE_REQUIREMENTS.CA.MD.mandatoryTopics, storedRows["CA:MD"], []);
    expect(rows.find((row: { topic: string; hoursRequired: number }) => row.topic === "OTHER_MANDATORY")?.hoursRequired).toBe(10);
  });
});

describe("a reviewed pairing continues a stored row under its new name", () => {
  const sbirt = stored({ requirementKey: "XX:DO:SUBSTANCE_USE:sbirt-old", topic: "SUBSTANCE_USE", hoursRequired: 2, description: "SBIRT (old hand-entered name)", cadence: "INITIAL_LICENSE_ONLY", notes: "hand-written note" });
  const opioid = stored({ requirementKey: "XX:DO:OPIOID_PRESCRIBING", topic: "OPIOID_PRESCRIBING", hoursRequired: 2, description: "Misuse of controlled substances", cadence: "EVERY_RENEWAL", notes: "annual" });
  const topics = [{ topic: "Opioid / controlled substance education", hours: "2 hrs every year" }, { topic: "SBIRT", hours: "2 hrs one-time" }];
  test("the pairing wins even across categories, and a paired row is lent to nobody else", () => {
    const matched = matchExistingRows(topics, [sbirt, opioid], { SBIRT: "XX:DO:SUBSTANCE_USE:sbirt-old", "Opioid / controlled substance education": "XX:DO:OPIOID_PRESCRIBING" });
    expect(matched.map((match: { row?: { requirementKey: string }; continuedKey?: string }) => [match.row?.requirementKey, match.continuedKey])).toEqual([
      ["XX:DO:OPIOID_PRESCRIBING", "XX:DO:OPIOID_PRESCRIBING"], ["XX:DO:SUBSTANCE_USE:sbirt-old", "XX:DO:SUBSTANCE_USE:sbirt-old"],
    ]);
  });
  test("without a pairing both topics are new and nothing is inherited", () => {
    const matched = matchExistingRows(topics, [sbirt, opioid]);
    expect(matched.map((match: { row?: unknown }) => match.row)).toEqual([undefined, undefined]);
  });
  test("a pairing whose stored row does not exist is ignored", () => {
    const matched = matchExistingRows(topics, [], { SBIRT: "XX:DO:SUBSTANCE_USE:sbirt-old" });
    expect(matched.map((match: { row?: unknown; continuedKey?: string }) => [match.row, match.continuedKey])).toEqual([[undefined, undefined], [undefined, undefined]]);
  });

  test("Nevada DO: the four hand-entered rows are continued, so nothing is retired or re-created", () => {
    const before = storedRows["NV:DO"];
    const plan = planSync(sourceRows("NV", "DO", STATE_REQUIREMENTS.NV.DO.mandatoryTopics, before, []), before);
    expect(plan.creates).toEqual([]);
    expect(plan.retires).toEqual([]);
    const changed = Object.fromEntries(plan.updates.map((update: { requirementKey: string; changes: object }) => [update.requirementKey, Object.keys(update.changes).sort()]));
    expect(changed["NV:DO:IMPLICIT_BIAS"]).toEqual(["description"]);
    expect(changed["NV:DO:OPIOID_PRESCRIBING"]).toEqual(["description"]);
    expect(changed["NV:DO:SUBSTANCE_USE:sbirt-screening-brief-intervention-and-referral-to-treatment-approach-to-substance-use-disorder"]).toEqual(["description"]);
    expect(changed["NV:DO:SUBSTANCE_USE:dea-mate-act-treating-managing-opioid-and-other-substance-use-disorders"]).toEqual(["description"]);
    // Category, cadence, hours and the hand-written notes of every Nevada DO row are left as stored.
    for (const fields of Object.values(changed) as string[][]) expect(fields).toEqual(["description"]);
  });
});
