import { describe, expect, test } from "vitest";
import { STATE_REQUIREMENTS, type LicenseType, type StateCode } from "../lib/state-requirements";
import { ONE_TIME_KINDS, isOneTimeKind, labelRecurs } from "../scripts/label-cadence";
import { planSync } from "../scripts/rule-sync-planner";
import { sourceRows } from "../scripts/sync-rules-from-source";
// Rule rows exactly as the account database held them on 2026-11-13 (no user data).
import storedRows from "./fixtures/requirements/stored-legacy-cadence.json";

type StoredKey = keyof typeof storedRows;
type Changes = Record<string, { from: unknown; to: unknown }> | undefined;
const topicsFor = (key: string) => {
  const [state, licenseType] = key.split(":") as [StateCode, LicenseType];
  return { state, licenseType, topics: STATE_REQUIREMENTS[state][licenseType].mandatoryTopics };
};
const plannedChange = (key: StoredKey, requirementKey: string) => {
  const { state, licenseType, topics } = topicsFor(key);
  const plan = planSync(sourceRows(state, licenseType, topics, storedRows[key], []), storedRows[key]);
  return plan.updates.find((update: { requirementKey: string }) => update.requirementKey === requirementKey)?.changes as Changes;
};

describe("cadence in the rules file", () => {
  test("no rule declares a one-time cadence against a label that says it recurs", () => {
    const offenders = Object.values(STATE_REQUIREMENTS).flatMap((byLicense) => Object.values(byLicense)).flatMap((rule) => rule.mandatoryTopics
      .filter((topic) => topic.cadence && ONE_TIME_KINDS.includes(topic.cadence) && labelRecurs(topic.hours))
      .map((topic) => `${rule.stateCode}: ${topic.topic} (${topic.hours})`));
    expect(offenders).toEqual([]);
  });
});

describe("syncing the rules file over the rows the May 2026 text inference stored", () => {
  test.each(Object.keys(storedRows) as StoredKey[])("%s: no conflict is left and every rule whose label recurs ends up recurring", (key) => {
    const { state, licenseType, topics } = topicsFor(key);
    const conflicts: string[] = [];
    const rows = sourceRows(state, licenseType, topics, storedRows[key], [], conflicts);
    expect(conflicts).toEqual([]);
    const stillOneTime = topics.filter((topic, index) => labelRecurs(topic.hours) && isOneTimeKind(rows[index].cadence, rows[index].firstRenewalOnly));
    expect(stillOneTime.map((topic) => topic.topic)).toEqual([]);
  });

  test.each([
    ["PA:MD", "PA:MD:CHILD_ABUSE", "INITIAL_LICENSE_ONLY", "EVERY_RENEWAL"],
    ["PA:DO", "PA:DO:CHILD_ABUSE", "INITIAL_LICENSE_ONLY", "EVERY_RENEWAL"],
    ["NY:MD", "NY:MD:INFECTION_CONTROL", "INITIAL_LICENSE_ONLY", "EVERY_N_YEARS"],
    ["NY:DO", "NY:DO:INFECTION_CONTROL", "INITIAL_LICENSE_ONLY", "EVERY_N_YEARS"],
    ["TX:MD", "TX:MD:HUMAN_TRAFFICKING", "FIRST_RENEWAL_ONLY", "EVERY_N_YEARS"],
    ["TX:DO", "TX:DO:HUMAN_TRAFFICKING", "FIRST_RENEWAL_ONLY", "EVERY_N_YEARS"],
    ["OR:MD", "OR:MD:OPIOID_PRESCRIBING", "INITIAL_LICENSE_ONLY", "EVERY_N_YEARS"],
    ["OR:DO", "OR:DO:OPIOID_PRESCRIBING", "INITIAL_LICENSE_ONLY", "EVERY_N_YEARS"],
    ["WV:MD", "WV:MD:OPIOID_PRESCRIBING", "INITIAL_LICENSE_ONLY", "CONDITIONAL"],
    ["WV:DO", "WV:DO:OPIOID_PRESCRIBING", "INITIAL_LICENSE_ONLY", "CONDITIONAL"],
  ] as const)("%s: %s goes from %s to %s and loses its one-time flag", (key, requirementKey, from, to) => {
    expect(plannedChange(key, requirementKey)).toMatchObject({ cadence: { from, to }, firstRenewalOnly: { from: true, to: false } });
  });

  test("the long-cycle rules carry the interval their label states", () => {
    expect(plannedChange("NY:MD", "NY:MD:INFECTION_CONTROL")).not.toHaveProperty("intervalYears"); // already stored as 4
    expect(plannedChange("OR:MD", "OR:MD:OPIOID_PRESCRIBING")).not.toHaveProperty("intervalYears"); // already stored as 2
    expect(plannedChange("TX:MD", "TX:MD:HUMAN_TRAFFICKING")).toMatchObject({ intervalYears: { from: null, to: 6 }, lookbackYears: { from: null, to: 6 } });
    // Prescriber-only rule: Conditional, and a completion lasts one 2-year cycle.
    expect(plannedChange("WV:DO", "WV:DO:OPIOID_PRESCRIBING")).toMatchObject({ intervalYears: { from: null, to: 2 }, lookbackYears: { from: null, to: 2 } });
  });

  test("rules whose label is one-time keep their stored one-time tag", () => {
    expect(plannedChange("PA:MD", "PA:MD:OPIOID_PRESCRIBING:initial-opioid-education")?.cadence).toBeUndefined();
    const { state, licenseType, topics } = topicsFor("NY:MD");
    const rows = sourceRows(state, licenseType, topics, storedRows["NY:MD"], []);
    expect(rows.find((row: { topic: string }) => row.topic === "CHILD_ABUSE")).toMatchObject({ cadence: "ONE_TIME", firstRenewalOnly: true });
  });
});
