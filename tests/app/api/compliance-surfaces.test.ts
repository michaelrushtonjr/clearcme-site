import { prismaMock } from "../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import JSZip from "jszip";
import { licenseInput, requirement } from "../../helpers/compliance-fixtures";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user", name: "Test Physician" } })) }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileUserId: vi.fn(async () => null) }));
vi.mock("@/lib/entitlements", () => ({ getEntitlements: vi.fn(async () => ({ ungated: true })), upgradeRequiredResponse: vi.fn() }));
vi.mock("@vercel/blob", () => ({ get: vi.fn(() => { throw new Error("No live blobs"); }) }));
import { GET as apiGET } from "@/app/api/compliance/route";
import { GET as auditGET } from "@/app/api/audit-export/route";
import { getComplianceSnapshot } from "@/lib/compliance-snapshot";

beforeEach(() => {
  prismaMock.federalTrainingRecord.findUnique.mockResolvedValue({ kind: "MATE_ACT" });
  prismaMock.user.findUnique.mockResolvedValue({ id: "user", name: "Test Physician", email: "test@example.invalid" });
  prismaMock.physicianLicense.findMany.mockResolvedValue([{ ...licenseInput().license, licenseNumber: null }]);
  prismaMock.certificate.findMany.mockResolvedValue([]);
  prismaMock.userRequirementCompletion.findMany.mockResolvedValue([]);
  prismaMock.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, mandatoryRequirements: [requirement({ cadence: "CONDITIONAL" })] });
  prismaMock.complianceStatus.upsert.mockResolvedValue({});
});
for (const expired of [false, true]) {
  test(`API, email snapshot and actual ZIP preserve ${expired ? "EXPIRED" : "UNKNOWN"}`, async () => {
    if (expired) {
      prismaMock.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, mandatoryRequirements: [requirement({ cadence: "EVERY_N_YEARS", lookbackYears: 2 })] });
      prismaMock.userRequirementCompletion.findMany.mockResolvedValue([{ mandatoryRequirementId: "requirement", physicianLicenseId: "license", completedAt: new Date("2020-01-01"), completedYear: 2020, notes: null }]);
    }
    const overall = expired ? "ACTION_NEEDED" : "UNKNOWN";
    const status = expired ? "EXPIRED" : "UNKNOWN";
    const api = await (await apiGET(new NextRequest("http://localhost/api/compliance"))).json();
    expect(api.compliance[0].overall).toBe(overall);
    const notification = await getComplianceSnapshot("user");
    expect(notification?.licenses[0].overall).toBe(overall);
    expect(notification?.allCompliant).toBe(false);
    const response = await auditGET(new NextRequest("http://localhost/api/audit-export"));
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const filename = Object.keys(zip.files).find((name) => name.endsWith("/compliance.json"))!;
    const json = JSON.parse(await zip.file(filename)!.async("string"));
    expect(json.licenses[0].complianceStatus).toBe(overall);
    expect(json.licenses[0].mandatoryTopics[0].status).toBe(status);
    const summary = Object.keys(zip.files).find((name) => name.endsWith("/Summary_Report.txt"))!;
    expect(await zip.file(summary)!.async("string")).toContain(`COMPLIANCE STATUS: ${overall}`);
  });
}
for (const [name, specialty, practiceArea, profile, expected] of [
  ["license specialty takes priority", "Emergency Medicine", null, { specialty: "Psychiatry" }, "NOT_APPLICABLE"],
  ["profile specialty fallback", null, null, { specialty: "Psychiatry" }, "NOT_MET"],
  ["profile practice area fallback", "Emergency Medicine", null, { practiceArea: "Psychiatry" }, "NOT_MET"],
  ["empty license fields do not fall back", "", "", { specialty: "Psychiatry", practiceArea: "Psychiatry" }, "NOT_APPLICABLE"],
] as const) {
  test(`NV DO API, snapshot and ZIP use ${name}`, async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user", email: "test@example.invalid", ...profile });
    prismaMock.physicianLicense.findMany.mockResolvedValue([{ ...licenseInput().license, licenseType: "DO", specialty, practiceArea }]);
    prismaMock.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, mandatoryRequirements: [requirement({ topic: "CULTURAL_COMPETENCY", description: "Psychiatry cultural competency" })] });
    const api = await (await apiGET(new NextRequest("http://localhost/api/compliance"))).json();
    expect(api.compliance[0].evaluation.requirements[0].status).toBe(expected);
    const notification = await getComplianceSnapshot("user");
    expect(notification?.licenses[0].mandatoryTopics[0].status).toBe(expected);
    const response = await auditGET(new NextRequest("http://localhost/api/audit-export"));
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const filename = Object.keys(zip.files).find((name) => name.endsWith("/compliance.json"))!;
    const json = JSON.parse(await zip.file(filename)!.async("string"));
    expect(json.licenses[0].mandatoryTopics[0].status).toBe(expected);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ specialty: true, practiceArea: true }) }));
  });
}
