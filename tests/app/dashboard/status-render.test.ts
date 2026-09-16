import { prismaMock } from "../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { licenseInput, requirement } from "../../helpers/compliance-fixtures";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams(), redirect: vi.fn() }));
import Dashboard from "@/app/dashboard/page";
import Compliance from "@/app/dashboard/compliance/page";
beforeEach(() => {
  prismaMock.federalTrainingRecord.findUnique.mockResolvedValue({ kind: "MATE_ACT" });
  prismaMock.physicianLicense.findMany.mockResolvedValue([licenseInput().license]);
  prismaMock.certificate.findMany.mockResolvedValue([]);
  prismaMock.userRequirementCompletion.findMany.mockResolvedValue([]);
  prismaMock.emailPreference.findUnique.mockResolvedValue({ renewalReminders: true });
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, updatedAt: new Date("2026-01-01"), mandatoryRequirements: [requirement({ cadence: "CONDITIONAL" })] });
});
for (const [name, page] of [["dashboard", Dashboard], ["compliance", Compliance]] as const) {
  test(`${name} renders unanswered status without the audit-ready assertion`, async () => {
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("Needs your answer"); expect(html).not.toContain("Every tracked requirement is met"); expect(html).not.toContain("All CME requirements are met");
  });
  test(`${name} keeps Kansas visible as not computed`, async () => {
    prismaMock.physicianLicense.findMany.mockResolvedValue([{ ...licenseInput().license, state: "KS" }]);
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("ClearCME is holding computed compliance for Kansas"); expect(html).not.toContain("All CME requirements are met");
  });
}
for (const [name, page] of [["dashboard", Dashboard], ["compliance", Compliance]] as const) {
  for (const psychiatrist of [false, true]) {
    test(`${name} passes license-first practice context for NV DO ${psychiatrist ? "psychiatrist" : "EM"}`, async () => {
      prismaMock.user.findUnique.mockResolvedValue({ specialty: "Psychiatry", practiceArea: null });
      prismaMock.physicianLicense.findMany.mockResolvedValue([{ ...licenseInput().license, licenseType: "DO", specialty: psychiatrist ? null : "Emergency Medicine", practiceArea: null }]);
      prismaMock.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, updatedAt: new Date("2026-01-01"), mandatoryRequirements: [requirement({ topic: "CULTURAL_COMPETENCY", description: "Psychiatry cultural competency" })] });
      const html = renderToStaticMarkup(await page());
      expect(html).toContain(psychiatrist ? "Action needed" : name === "dashboard" ? "Audit-ready" : "On track");
      if (!psychiatrist && name === "compliance") expect(html).toContain("psychiatry-only requirement; not your specialty");
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: "user" }, select: { specialty: true, practiceArea: true } });
    });
  }
}
