import { expect, test, vi } from "vitest";
import { planBackfill, assertResolved, applyBackfill, planIdentity } from "../scripts/backfill-requirement-keys";
const rows = ["First", "Second"].map((description, index) => ({ id: `row-${index}`, complianceRuleId: "rule", state: "ZZ", licenseType: "MD", topic: "ETHICS", description, requirementKey: null }));
const mapping = { "ZZ:MD:ETHICS:First": "ZZ:MD:ETHICS:first", "ZZ:MD:ETHICS:Second": "ZZ:MD:ETHICS:second" };
test("inventory reports every collision and dry-run reports every proposed key", () => {
  const plan = planBackfill(rows);
  expect(plan.rows).toHaveLength(2);
  expect(plan.collisions).toHaveLength(1);
  expect(plan.unresolvedCollisions).toHaveLength(1);
  expect(() => assertResolved(plan)).toThrow("Unresolved");
});
test("description mapping works across environments with different row IDs", () => {
  const plan = planBackfill(rows.map((row) => ({ ...row, id: `remote-${row.id}`, complianceRuleId: "remote-rule" })), mapping);
  expect(() => assertResolved(plan)).not.toThrow();
  expect(plan.rows.map((row: { requirementKey: string }) => row.requirementKey)).toEqual(Object.values(mapping));
});
test("duplicate computed keys and stale mapping entries block apply", () => {
  const duplicate = planBackfill(rows, { ...mapping, "ZZ:MD:ETHICS:Second": mapping["ZZ:MD:ETHICS:First"] });
  expect(duplicate.duplicateKeys).toHaveLength(1);
  expect(() => assertResolved(duplicate)).toThrow("duplicate");
  expect(() => assertResolved(planBackfill(rows.slice(0, 1), mapping))).toThrow("stale");
});
test("same-description siblings cannot be disambiguated by a description mapping", () => {
  expect(() => assertResolved(planBackfill([rows[0], { ...rows[0], id: "other" }], mapping))).toThrow("Unresolved");
});
test("backfill rolls back on write failure and never commits partial keys", async () => {
  let writes = 0;
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith("SELECT")) return { rows };
    if (sql.startsWith("UPDATE") && ++writes === 2) throw new Error("write failed");
    return { rows: [] };
  });
  await expect(applyBackfill({ query }, mapping)).rejects.toThrow("write failed");
  expect(writes).toBe(2);
  expect(query).toHaveBeenLastCalledWith("ROLLBACK");
  expect(query).not.toHaveBeenCalledWith("COMMIT");
});
test("review checksum changes with identity or mapping but permits an idempotent rerun", () => {
  const first = planIdentity(rows, mapping);
  expect(planIdentity(rows.map((row) => ({ ...row, requirementKey: "already-backfilled" })), mapping)).toEqual(first);
  expect(planIdentity([{ ...rows[0], description: "changed" }, rows[1]], mapping)).not.toEqual(first);
  expect(planIdentity(rows, { ...mapping, "ZZ:MD:ETHICS:Second": "different" })).not.toEqual(first);
});

test("a mismatched reviewed plan aborts the locked transaction before any update", async () => {
  const query = vi.fn(async (sql: string) => ({ rows: sql.startsWith("SELECT") ? rows : [] }));
  await expect(applyBackfill({ query }, mapping, () => { throw new Error("checksum mismatch"); })).rejects.toThrow("checksum");
  expect(query.mock.calls.some(([sql]) => sql.startsWith("UPDATE"))).toBe(false);
  expect(query).toHaveBeenLastCalledWith("ROLLBACK");
});
