import { expect, test } from "vitest";
import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { STATE_NAME_BY_CODE } from "@/lib/state-names";
import { isStateComputed, notComputedNotice, stateOptionLabel } from "@/lib/state-availability";

test("the picker label follows the engine's own gate for every state", () => {
  for (const [code, name] of Object.entries(STATE_NAME_BY_CODE)) {
    for (const type of ["MD", "DO"]) {
      expect(isStateComputed(code, type)).toBe(!isComputedComplianceBlocked(code, type));
      expect(stateOptionLabel(name, code, type).endsWith("(not yet computed)")).toBe(isComputedComplianceBlocked(code, type));
    }
  }
});
test("Kansas is labeled not yet computed before a license type is chosen; Nevada is not", () => {
  expect(isStateComputed("KS")).toBe(false);
  expect(stateOptionLabel("Kansas", "KS")).toBe("Kansas (not yet computed)");
  expect(isStateComputed("NV")).toBe(true);
  expect(stateOptionLabel("Nevada", "NV")).toBe("Nevada");
  expect(notComputedNotice("Nevada", "NV", "MD")).toBeNull();
});
test("the Kansas notice says plainly what the account does and does not do", () => {
  const notice = notComputedNotice("Kansas", "KS");
  expect(notice?.title).toBe("Kansas is not yet computed.");
  expect(notice?.reason).toContain("18-, 30- or 42-month");
  expect(notice?.included).toMatch(/renewal date/);
  expect(notice?.included).toMatch(/certificates/);
  expect(notice?.notIncluded).toMatch(/will not yet count your hours against Kansas's requirements/);
  // Nothing in it may read as a promise of computed compliance, or name a plan.
  const text = Object.values(notice ?? {}).join(" ");
  expect(text).not.toMatch(/on track|compliant\b|audit-ready|Essential|Pro\b|\$/i);
  expect(text).not.toMatch(/credits/i);
});
test("the home-page picker and setup read the same helper", async () => {
  const { readFileSync } = await import("node:fs");
  for (const file of ["components/HomePage.tsx", "app/dashboard/setup/SetupWizard.tsx"]) {
    expect(readFileSync(file, "utf8")).toContain('from "@/lib/state-availability"');
  }
});
