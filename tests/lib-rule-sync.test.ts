import { describe, expect, test, vi } from "vitest";
import { planSync, withRequirementKeys } from "../scripts/rule-sync-planner";
import { sourceRows, syncState } from "../scripts/sync-rules-from-source";

const row = { requirementKey: "NV:MD:ETHICS", topic: "ETHICS", hoursRequired: 1, description: "Ethics", retiredAt: null };
describe("non-destructive sync planner", () => {
  test("identical rerun emits zero writes", () => {
    expect(planSync([row], [{ ...row, id: "retained", completions: ["history"] }])).toEqual({ creates: [], updates: [], retires: [] });
  });
  test("removed source row retires its identity", () => {
    expect(planSync([], [row])).toEqual({ creates: [], updates: [], retires: [{ requirementKey: row.requirementKey }] });
    expect(planSync([], [{ ...row, retiredAt: "2026-01-01" }]).retires).toEqual([]);
  });
  test("only create, update, retire operations exist, and duplicate identities fail loudly", () => {
    expect(Object.keys(planSync([{ ...row, hoursRequired: 2 }], [row]))).toEqual(["creates", "updates", "retires"]);
    expect(() => planSync([row, row], [])).toThrow("Duplicate");
  });
  test("adding a sibling retains the existing requirement ID key", () => {
    const rows = withRequirementKeys("NV", "MD", [row, { ...row, description: "Other ethics" }], [row]);
    expect(rows.map((r: { requirementKey: string }) => r.requirementKey)).toEqual(["NV:MD:ETHICS", "NV:MD:ETHICS:other-ethics"]);
  });
  test("missing source cadence preserves every existing cadence field and produces zero updates", () => {
    const existing = { ...row, cadence: "EVERY_N_YEARS", intervalYears: 6, lookbackYears: null, firstRenewalOnly: true, attestationAllowed: false, notes: "Fleet verified notes" };
    const questions: string[] = [];
    const rows = sourceRows("NV", "MD", [{ topic: "Ethics", hours: "1", note: "initial training" }], [existing], questions);
    expect(rows[0]).toEqual(existing);
    expect(planSync(rows, [existing])).toEqual({ creates: [], updates: [], retires: [] });
    expect(questions).toHaveLength(1);
  });
  test("planner treats silent cadence as no change for all protected fields", () => {
    const existing = { ...row, cadence: "EVERY_N_YEARS", intervalYears: 6, firstRenewalOnly: true, notes: "verified" };
    expect(planSync([{ ...row, intervalYears: null, firstRenewalOnly: false, notes: "source prose" }], [existing]).updates).toEqual([]);
  });
  test("only new missing-cadence topics get the unverified conditional marker", () => {
    const rows = sourceRows("PA", "MD", [{ topic: "Child abuse", hours: "2", note: "initial training" }], [], []);
    expect(planSync(rows, []).creates[0]).toMatchObject({ cadence: "CONDITIONAL", notes: expect.stringMatching(/^UNVERIFIED-CADENCE:/) });
  });
  test("explicit source cadence replaces an unverified cadence and strips its marker", () => {
    const existing = { ...row, cadence: "CONDITIONAL", intervalYears: null, notes: "UNVERIFIED-CADENCE: old" };
    const source = sourceRows("NV", "MD", [{ topic: "Ethics", hours: "1", cadence: "EVERY_N_YEARS", intervalYears: 6 }], [existing], []);
    const plan = planSync(source, [existing]);
    expect(plan.updates[0].changes).toMatchObject({ cadence: { to: "EVERY_N_YEARS" }, intervalYears: { to: 6 }, notes: { to: "1" } });
    expect(planSync(source, source)).toEqual({ creates: [], updates: [], retires: [] });
  });
  test("sync writes and retirement use the same serializable transaction", async () => {
    const tx = { complianceRule: { findUnique: vi.fn().mockResolvedValue({ id: "rule", mandatoryRequirements: [row], state: "NV", licenseType: "MD", totalHours: 0, renewalCycle: 24, notes: "0; two years" }), upsert: vi.fn() }, mandatoryRequirement: { update: vi.fn(), upsert: vi.fn() } };
    const db = { $transaction: vi.fn(async (fn) => fn(tx)) };
    await syncState(db, "NV", { cycleYears: 2, totalHours: 0, totalHoursLabel: "0", cycleLabel: "two years", mandatoryTopics: [] }, "MD", []);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(tx.mandatoryRequirement.update).toHaveBeenCalledWith(expect.objectContaining({ data: { retiredAt: expect.any(Date) } }));
  });
});
test("description updates do not change an existing attestation permission", () => {
  const rows = sourceRows("NV", "MD", [{ topic: "Medical ethics", hours: "1" }], [{ topic: "ETHICS", description: "Ethics", requirementKey: "NV:MD:ETHICS", attestationAllowed: false }], []);
  expect(rows[0].attestationAllowed).toBe(false);
});
