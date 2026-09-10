import { prismaMock } from "../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { licenseInput, requirement } from "../../helpers/compliance-fixtures";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams(), redirect: vi.fn() }));
import Dashboard from "@/app/dashboard/page";
import Compliance from "@/app/dashboard/compliance/page";
beforeEach(() => {
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
