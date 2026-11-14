import "../helpers/prisma-mock";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { FREE_EXTRACTION_LIMIT, LICENSE_LIMIT } from "@/lib/entitlements";
import { GROUP_CONTACT, PLAN_LIMITS, PLAN_ORDER, PLANS, planPriceLabel } from "@/lib/plan-features";

const homePage = readFileSync("components/HomePage.tsx", "utf8");
const pricingPage = readFileSync("app/pricing/page.tsx", "utf8");

test("the limits printed on the price cards are the limits the app enforces", () => {
  expect(PLAN_LIMITS.freeLicenses).toBe(LICENSE_LIMIT.FREE);
  expect(PLAN_LIMITS.essentialLicenses).toBe(LICENSE_LIMIT.ESSENTIAL);
  expect(LICENSE_LIMIT.PRO).toBe(Number.POSITIVE_INFINITY);
  expect(PLAN_LIMITS.freeCertificateReads).toBe(FREE_EXTRACTION_LIMIT);
  expect(PLANS.free.features).toContain("1 state license");
  expect(PLANS.free.features).toContain("3 certificates read for you (PDF or photo)");
  expect(PLANS.essential.features).toContain("2 state licenses");
  expect(PLANS.pro.features).toEqual(["Everything in Essential", "Unlimited state licenses"]);
});

test("Essential lists what it adds today: two licenses, unlimited reading, exports, reminders", () => {
  expect(PLANS.essential.features).toEqual([
    "2 state licenses",
    "Unlimited certificate reading",
    "Audit-ready exports: certificate ZIP and CE Broker file",
    "Renewal reminders by email",
  ]);
});

test("both price tables render from the one module and keep no list of their own", () => {
  for (const source of [homePage, pricingPage]) {
    expect(source).toContain('from "@/lib/plan-features"');
    expect(source).toContain("PLAN_ORDER.map(");
    expect(source).toMatch(/plan\.features/);
    // A literal feature array in either file would be a second list.
    expect(source).not.toMatch(/features:\s*\[/);
    expect(source).not.toContain("planFeatures");
  }
});

test("features that are not built appear on neither table nor in the shared list", () => {
  const notBuilt = [
    /cross-state hour reuse/i,
    /side-by-side/i,
    /shareable/i,
    /quarterly digest/i,
    /priority alerts?/i,
    /priority support/i,
    /admin dashboard/i,
    /dedicated onboarding/i,
    /sort by price/i,
    /one (best|helpful|strong) course match/i,
  ];
  const shared = JSON.stringify({ PLANS, GROUP_CONTACT });
  for (const pattern of notBuilt) {
    expect(shared).not.toMatch(pattern);
    expect(homePage).not.toMatch(pattern);
    expect(pricingPage).not.toMatch(pattern);
  }
});

test("prices are stated once and read the same in both forms", () => {
  expect(PLAN_ORDER).toEqual(["free", "essential", "pro"]);
  expect(PLAN_ORDER.map(planPriceLabel)).toEqual(["$0", "$99/yr", "$199/yr"]);
  expect(PLANS.essential.per).toBe("/year");
});
