import { afterEach, expect, test, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { databaseTarget, checksum, requirePlan, savePlan } from "../scripts/reviewed-db-plan";

afterEach(() => vi.restoreAllMocks());
test("remote targets require opt-in and print only the host", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => databaseTarget("postgres://user:secret@example.invalid/db", [])).toThrow("--allow-remote");
  expect(databaseTarget("postgres://user:secret@example.invalid:5432/db", ["--allow-remote"]).remote).toBe(true);
  expect(log).toHaveBeenCalledWith("Database target host: example.invalid:5432");
  expect(databaseTarget("postgres://localhost/db", []).remote).toBe(false);
  expect(() => databaseTarget("postgres://localhost/db?host=example.invalid", [])).toThrow("Unsupported");
});
test("apply requires a dry-run plan matching source checksum and scope", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clearcme-plan-test-"));
  const file = path.join(dir, "plan.json");
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  try {
    const identity = { kind: "rule-sync", licenseType: "MD", sourceChecksum: checksum(["source"]) };
    expect(() => requirePlan(undefined, identity)).toThrow("--dry-run");
    savePlan({ ...identity, dryRun: true, states: [] }, file);
    expect(requirePlan(file, identity).dryRun).toBe(true);
    expect(() => requirePlan(file, { ...identity, sourceChecksum: checksum(["changed"]) })).toThrow("checksum");
    expect(() => requirePlan(file, { ...identity, licenseType: "DO" })).toThrow("scope");
    savePlan({ ...identity, dryRun: false }, file);
    expect(() => requirePlan(file, identity)).toThrow("checksum");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
