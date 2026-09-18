import { prismaMock as db } from "../../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { mateActDeadline, MATE_ACT_TEXT, isStateRequirement } from "@/lib/mate-act";
import { evaluateFederalTraining, evaluateLicense } from "@/lib/compliance-engine";
import { licenseInput, requirement } from "../../../helpers/compliance-fixtures";
const boundary = vi.hoisted(() => ({ ai: vi.fn(), reserve: vi.fn(), finish: vi.fn(), mobile: vi.fn(), auth: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: boundary.ai }; } }));
vi.mock("@/auth", () => ({ auth: boundary.auth }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileUserId: boundary.mobile }));
vi.mock("@/lib/entitlements", () => ({ reserveExtractionAttempt: boundary.reserve, finishExtractionAttempt: boundary.finish, getEntitlements: async () => ({ licenseLimit: 10 }), upgradeRequiredResponse: vi.fn() }));
vi.mock("@/lib/upload-rate-limit", () => ({ limitCertificateUpload: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/mate-act" }));
import { POST, PATCH } from "@/app/api/dea-certificate/route";
import { POST as licensePOST } from "@/app/api/licenses/route";
import { getComplianceSnapshot } from "@/lib/compliance-snapshot";
import ProfilePage from "@/app/dashboard/profile/page";
import MateActPage from "@/app/mate-act/page";
const jsonRequest = (body: object) => new NextRequest("http://localhost/api/dea-certificate", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
function scanRequest(licenseId?: string) { const form = new FormData(); form.set("file", new File(["synthetic"], "dea.pdf", { type: "application/pdf" })); if (licenseId) form.set("licenseId", licenseId); return new NextRequest("http://localhost/api/dea-certificate", { method: "POST", body: form }); }
beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  boundary.auth.mockResolvedValue({ user: { id: "user", name: "Physician" } }); boundary.mobile.mockResolvedValue(null);
  boundary.reserve.mockResolvedValue({ id: "reserved" }); boundary.finish.mockResolvedValue(undefined);
  boundary.ai.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify({ deaNumber: "TEST123", registrationDate: "2025-01-01", expirationDate: "2028-01-01", schedules: [] }) }] });
  db.federalTrainingRecord.findUnique.mockResolvedValue(null); db.federalTrainingRecord.upsert.mockImplementation(async ({ create }) => ({ id: "record", ...create }));
  db.physicianLicense.findFirst.mockResolvedValue({ ...licenseInput().license, userId: "user", deaRegisteredAt: new Date("2024-01-01") });
  db.physicianLicense.findMany.mockResolvedValue([{ ...licenseInput().license, deaRegisteredAt: new Date("2024-01-01") }]);
  db.user.findUnique.mockResolvedValue({ id: "user", name: "Physician", email: "test@example.invalid", hasDeaRegistration: true, deaFirstQualifyingAt: new Date("2024-01-01") });
  db.certificate.findMany.mockResolvedValue([]); db.userRequirementCompletion.findMany.mockResolvedValue([]);
  db.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, mandatoryRequirements: [] });
  db.$transaction.mockImplementation(async (callback) => callback(db));
});

test.each([
  [{ registeredAt: "2023-06-26" }, null],
  [{ registeredAt: "2023-06-27" }, "2023-06-27"],
  [{ registeredAt: "2024-02-01" }, "2024-02-01"],
  [{ registeredAt: "2020-01-01", firstRenewalOnOrAfterCutoff: "2023-07-01" }, "2023-07-01"],
  [{ registeredAt: "invalid" }, null],
])("deadline uses the first known qualifying event: %j", (registration, expected) => {
  expect(mateActDeadline(registration).date?.toISOString().slice(0, 10) ?? null).toBe(expected);
});
test("federal status needs one record; ordinary opioid hours cannot satisfy it", () => {
  const input = licenseInput({ requirements: [requirement({ description: "Federal DEA MATE Act", topic: "SUBSTANCE_USE", hoursRequired: 8 })] });
  const federal = evaluateFederalTraining({ record: null, registered: true, deadline: new Date("2024-01-01") });
  const result = evaluateLicense({ ...input, federalTraining: federal });
  expect(result.requirements).toHaveLength(1); expect(result.requirements[0]).toMatchObject({ topic: "MATE_ACT", status: "NOT_MET", scope: "FEDERAL" });
  expect(evaluateFederalTraining({ record: { kind: "MATE_ACT" }, registered: true, deadline: null }).status).toBe("MET");
  expect(evaluateFederalTraining({ record: null, registered: null, deadline: null }).status).toBe("UNKNOWN");
  expect(evaluateFederalTraining({ record: null, registered: false, deadline: null }).status).toBe("NOT_APPLICABLE");
});
test("two license snapshots show the same federal row but count its eight-hour gap once", async () => {
  db.physicianLicense.findMany.mockResolvedValue(["one", "two"].map((id) => ({ ...licenseInput().license, id, deaRegisteredAt: new Date("2024-01-01") })));
  const snapshot = await getComplianceSnapshot("user");
  expect(snapshot?.totalGapHours).toBe(8);
  expect(snapshot?.licenses.map((license) => license.mandatoryTopics.find((topic) => topic.topic === "MATE_ACT")?.status)).toEqual(["NOT_MET", "NOT_MET"]);
  expect(db.federalTrainingRecord.findUnique).toHaveBeenCalledTimes(1);
});
test("profile retains approved copy and public guide preserves the first qualifying deadline", async () => {
  const profile = renderToStaticMarkup(await ProfilePage());
  const publicPage = renderToStaticMarkup(MateActPage());
  expect(profile).toContain(MATE_ACT_TEXT);
  expect(publicPage).toContain("first applicable DEA registration or renewal on or after June 27, 2023");
  expect(publicPage).toContain("one-time");
  expect(publicPage).toContain("https://www.deadiversion.usdoj.gov/faq/MATE_Act_faq.html");
  expect(publicPage).not.toContain("within five years of June 27, 2023");
  expect(profile).not.toContain("before your next DEA renewal"); expect(publicPage).not.toContain("Required at your NEXT");
});
test("mobile DEA scan reserves and meters the same clean extraction quota", async () => {
  boundary.mobile.mockResolvedValue("user"); boundary.auth.mockResolvedValue(null);
  expect((await POST(scanRequest("license"))).status).toBe(200);
  expect(boundary.reserve).toHaveBeenCalledWith("user"); expect(boundary.finish).toHaveBeenCalledWith("user", "reserved", true);
  expect(boundary.auth).not.toHaveBeenCalled(); expect(db.federalTrainingRecord.upsert).not.toHaveBeenCalled();
  expect(db.physicianLicense.update.mock.calls[0][0].data).not.toHaveProperty("deaRegisteredAt");
});
test("DEA failures release the clean slot; denied quota and foreign licenses do not call AI", async () => {
  boundary.ai.mockRejectedValueOnce(new Error("AI unavailable"));
  expect((await POST(scanRequest())).status).toBe(422);
  expect(boundary.finish).toHaveBeenCalledWith("user", "reserved", false);
  boundary.ai.mockClear(); boundary.reserve.mockResolvedValue(new Response("{}", { status: 402 }));
  expect((await POST(scanRequest())).status).toBe(402); expect(boundary.ai).not.toHaveBeenCalled();
  db.physicianLicense.findFirst.mockResolvedValue(null);
  expect((await POST(scanRequest("foreign"))).status).toBe(404); expect(boundary.ai).not.toHaveBeenCalled();
});
test("attestation writes one user record and legacy compatibility flags, and revocation clears both", async () => {
  const response = await PATCH(jsonRequest({ trainingRecord: { completed: true, basis: "BOARD_CERT_ADDICTION", notes: "Attested basis" } }));
  expect(response.status).toBe(200);
  expect(db.federalTrainingRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user" }, create: expect.objectContaining({ userId: "user", basis: "BOARD_CERT_ADDICTION" }) }));
  expect(db.physicianLicense.updateMany).toHaveBeenCalledWith({ where: { userId: "user" }, data: { mateActCompleted: true } });
  await PATCH(jsonRequest({ trainingRecord: { completed: false, basis: "OTHER" } }));
  expect(db.federalTrainingRecord.deleteMany).toHaveBeenCalledWith({ where: { userId: "user" } });
  expect(db.physicianLicense.updateMany).toHaveBeenLastCalledWith({ where: { userId: "user" }, data: { mateActCompleted: false } });
});
test("legacy license creation also updates the federal record", async () => {
  db.physicianLicense.findUnique.mockResolvedValue(null); db.physicianLicense.count.mockResolvedValue(0);
  db.physicianLicense.upsert.mockResolvedValue({ id: "new-license" });
  const response = await licensePOST(jsonRequest({ state: "ZZ", licenseType: "MD", renewalDate: "2027-01-01", mateActCompleted: true }));
  expect(response.status).toBe(201); expect(db.federalTrainingRecord.upsert).toHaveBeenCalled();
});
test("invalid attestation dates and cross-user evidence are rejected without changing the record", async () => {
  expect((await PATCH(jsonRequest({ trainingRecord: { completed: true, basis: "OTHER", completedAt: "2026-02-30" } }))).status).toBe(400);
  db.certificate.findFirst.mockResolvedValue(null);
  expect((await PATCH(jsonRequest({ trainingRecord: { completed: true, basis: "OTHER", evidenceCertificateId: "foreign" } }))).status).toBe(404);
  expect(db.federalTrainingRecord.upsert).not.toHaveBeenCalled();
});

test("legacy issue or expiration dates cannot substitute for the first qualifying DEA event", async () => {
  db.user.findUnique.mockResolvedValue({ id: "user", email: "test@example.invalid", hasDeaRegistration: true, deaFirstQualifyingAt: null });
  db.physicianLicense.findMany.mockResolvedValue([{ ...licenseInput().license, deaRegisteredAt: new Date("2025-01-01"), deaExpiresAt: new Date("2028-01-01") }]);
  const snapshot = await getComplianceSnapshot("user");
  expect(snapshot?.licenses[0].mandatoryTopics.find((row) => row.topic === "MATE_ACT")?.status).toBe("UNKNOWN");
  expect(snapshot?.allCompliant).toBe(false);
});
test("missing federal input cannot silently drop a legacy MATE row from the engine", () => {
  const result = evaluateLicense(licenseInput({ requirements: [requirement({ description: "DEA MATE Act" })] }));
  expect(result.overall).toBe("UNKNOWN"); expect(result.requirements[0].topic).toBe("MATE_ACT");
});
test("invalid calendar dates do not become a known federal deadline", () => {
  expect(mateActDeadline({ firstQualifyingAt: "2026-02-30" }).status).toBe("UNKNOWN");
});
test("confirmed first qualifying event persists once on the user and is returned by the shared rule", async () => {
  const response = await PATCH(jsonRequest({ hasDeaRegistration: true, deaFirstQualifyingAt: "2024-01-01" }));
  expect(response.status).toBe(200);
  expect(db.user.update).toHaveBeenCalledWith({ where: { id: "user" }, data: { hasDeaRegistration: true, deaFirstQualifyingAt: new Date("2024-01-01") } });
  expect((await response.json()).mateActDeadline.date).toBe("2024-01-01T00:00:00.000Z");
});


test("a state topic mentioning overlap with MATE remains a state requirement", () => {
  expect(isStateRequirement({ description: "Opioid prescribing — overlaps federal MATE Act training" })).toBe(true);
  expect(isStateRequirement({ description: "DEA MATE Act / SUD training" })).toBe(false);
});
