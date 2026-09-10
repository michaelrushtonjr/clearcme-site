import { expect, test } from "vitest";
import { scanText } from "../../scripts/check-secrets.mjs";
import { readFileSync } from "node:fs";
test("credential scan finds database, Stripe, Resend and Blob values without echoing secrets", () => {
  const value = "offlineCredentialValue0123456789";
  const text = ["postgresql://user:" + value + "@example.rlwy.net/db", "sk_" + "test_" + value, "whsec_" + value, "re_" + value, "BLOB_READ_WRITE_TOKEN=vercel_blob_rw_" + value].join("\n");
  const findings = scanText(text);
  expect(findings.filter((f) => f.actionable)).toHaveLength(5);
  expect(JSON.stringify(findings)).not.toContain(value);
});
test("local sandbox and placeholder values do not fail the future secrets gate", () => {
  expect(scanText("postgresql://postgres:postgres@localhost:51214/db\nBLOB_READ_WRITE_TOKEN=YOUR_TOKEN").some((f) => f.actionable)).toBe(false);
});
test("legacy seed requires the environment and guards the database hostname", () => {
  const source = readFileSync("scripts/seed-do-remaining-states.js", "utf8");
  expect(source).toContain("process.env.DATABASE_URL");
  expect(source).toContain("Seed requires a local sandbox DATABASE_URL");
  expect(scanText(source).filter((f) => f.actionable)).toEqual([]);
});
