import { prismaMock as db } from "../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { certificate, licenseInput } from "../../helpers/compliance-fixtures";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams(), redirect: vi.fn() }));
import CertificateList from "@/components/CertificateList";
import Dashboard from "@/app/dashboard/page";
import Privacy from "@/app/privacy/page";
beforeEach(() => {
  db.federalTrainingRecord.findUnique.mockResolvedValue({ kind: "MATE_ACT" });
  db.physicianLicense.findMany.mockResolvedValue([licenseInput().license]);
  db.certificate.findMany.mockResolvedValue([]);
  db.userRequirementCompletion.findMany.mockResolvedValue([]);
  db.emailPreference.findUnique.mockResolvedValue({ renewalReminders: true });
  db.subscription.findUnique.mockResolvedValue(null);
  db.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, updatedAt: new Date(), mandatoryRequirements: [] });
});
test("library keeps Counts for and topic confirmation while displaying duplicate resolution", () => {
  const html = renderToStaticMarkup(createElement(CertificateList, {
    certs: [{ ...certificate(), suggestedSpecialTopics: ["ETHICS"] }, { ...certificate({ id: "duplicate", possibleDuplicateOfId: "certificate" }), suggestedSpecialTopics: ["ETHICS"] }],
    totalCount: 2, sharedCredits: { certificate: ["NV", "MI"] },
  }));
  expect(html).toContain("Counts for: NV, MI");
  expect(html).toContain("Looks like a duplicate of Clinical ethics");
  expect(html).toContain("Keep both"); expect(html).toContain("Merge");
  expect(html).toContain("confirm");
});
test("maximum-only row asks for earned hours and keeps reattachment available during review", () => {
  const html = renderToStaticMarkup(createElement(CertificateList, { certs: [{ ...certificate({ creditHours: null, extractionStatus: "NEEDS_REVIEW" }), hoursEarned: null, activityMaxHours: 20, storageStatus: "STORE_FAILED", fileUrl: null }], totalCount: 1 }));
  expect(html).toContain("Enter your earned hours. Activity maximum: 20 hours.");
  expect(html).toContain("Original not saved — re-attach");
});
test("dashboard surfaces retained extraction whose original failed storage", async () => {
  db.certificate.findMany.mockResolvedValue([{ ...certificate(), fileName: "scan.pdf", storageStatus: "STORE_FAILED" }]);
  const html = renderToStaticMarkup(await Dashboard());
  expect(html).toContain("Original not saved — re-attach");
  expect(html).toContain("/dashboard/certificates");
});
test("pending Anthropic privacy copy does not render before Michael approval", () => {
  expect(renderToStaticMarkup(createElement(Privacy))).not.toContain("Anthropic");
});
