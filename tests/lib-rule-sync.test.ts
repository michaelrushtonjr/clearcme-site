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
  test("missing cadence never uses prose to assert a renewal frequency", () => {
    const questions: string[] = [];
    const rows = sourceRows("PA", "MD", [{ topic: "Child abuse", hours: "2", note: "initial training" }], [{ topic: "CHILD_ABUSE", description: "Child abuse", requirementKey: "PA:MD:CHILD_ABUSE", attestationAllowed: false }], questions);
    expect(rows[0]).toMatchObject({ cadence: "CONDITIONAL", attestationAllowed: false, notes: expect.stringContaining("UNVERIFIED-CADENCE:") });
    expect(questions).toHaveLength(1);
  });
  test("sync writes and retirement use the same serializable transaction", async () => {
    const tx = { complianceRule: { findUnique: vi.fn().mockResolvedValue({ id: "rule", mandatoryRequirements: [row], state: "NV", licenseType: "MD", totalHours: 0, renewalCycle: 24, notes: "0; two years" }), upsert: vi.fn() }, mandatoryRequirement: { update: vi.fn(), upsert: vi.fn() } };
    const db = { $transaction: vi.fn(async (fn) => fn(tx)) };
    await syncState(db, "NV", { cycleYears: 2, totalHours: 0, totalHoursLabel: "0", cycleLabel: "two years", mandatoryTopics: [] }, "MD", []);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(tx.mandatoryRequirement.update).toHaveBeenCalledWith(expect.objectContaining({ data: { retiredAt: expect.any(Date) } }));
  });
});
