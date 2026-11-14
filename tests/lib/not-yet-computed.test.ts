import { expect, test } from "vitest";
import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { isNotYetComputed, notYetComputedNote, stateOptionLabel } from "@/lib/not-yet-computed";
import { STATE_OPTIONS } from "@/lib/state-requirements";

test("Kansas is labelled not yet computed for MD, DO and before a license type is chosen", () => {
  expect(stateOptionLabel("Kansas", "KS", "MD")).toBe("Kansas (not yet computed)");
  expect(stateOptionLabel("Kansas", "KS", "DO")).toBe("Kansas (not yet computed)");
  expect(stateOptionLabel("Kansas", "KS")).toBe("Kansas (not yet computed)");
  expect(notYetComputedNote("Kansas", "KS", "MD")).toBe(
    "Kansas lets you choose an 18-, 30- or 42-month lookback for your continuing education, and ClearCME does not track those paths yet. You can add a Kansas license and keep your certificates here, but your account will not show hours or gaps for it.",
  );
});

test("the label follows the same check the account uses, for every state in the picker", () => {
  for (const { code, name } of STATE_OPTIONS) {
    for (const type of ["MD", "DO"] as const) {
      const blocked = isComputedComplianceBlocked(code, type);
      expect(isNotYetComputed(code, type)).toBe(blocked);
      expect(stateOptionLabel(name, code, type)).toBe(blocked ? `${name} (not yet computed)` : name);
      expect(notYetComputedNote(name, code, type) === null).toBe(!blocked);
    }
  }
});

test("computed states and an empty selection carry no label", () => {
  expect(stateOptionLabel("Nevada", "NV", "DO")).toBe("Nevada");
  expect(stateOptionLabel("Nevada", "NV")).toBe("Nevada");
  expect(isNotYetComputed("", "MD")).toBe(false);
  expect(notYetComputedNote("Nevada", "NV", "MD")).toBeNull();
});
