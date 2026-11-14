import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// Rules are checked against each board's own sources. Not every jurisdiction
// has been verified by a physician in person, so the site must not say so
// (Michael's decision, Nov 13 2026). "Built by a physician" is true and stays.
const HUMAN_VERIFICATION_CLAIM =
  /human physician|verified by a physician|physician[- ]verified|verified twice|once by AI|for human review/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : sourceFiles(path);
    return /\.(tsx?|json|txt|md)$/.test(entry.name) ? [path] : [];
  });
}

test("no page, component, email or guide claims a human physician verified every rule", () => {
  const offenders = ["app", "components", "lib", "content"]
    .flatMap(sourceFiles)
    .filter((path) => HUMAN_VERIFICATION_CLAIM.test(readFileSync(path, "utf8")));
  expect(offenders).toEqual([]);
});

test("the replacement wording is in the three places the old claim appeared", () => {
  const home = readFileSync("components/HomePage.tsx", "utf8");
  expect(home).toContain("Every rule is checked against the state board's own sources.");
  expect(home).toContain("Every rule is checked against the state board&apos;s own sources before it enters your dashboard.");
  expect(readFileSync("components/login/BrandPanel.tsx", "utf8")).toContain(
    "every rule checked against the state board's own sources",
  );
});
