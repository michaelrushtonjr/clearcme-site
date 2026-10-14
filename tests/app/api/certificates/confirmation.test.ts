import { prismaMock } from "../../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileUserId: vi.fn(async () => null) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
import { trackEvent } from "@/lib/analytics";
import { getMobileUserId } from "@/lib/mobile-auth";
import { PATCH } from "@/app/api/certificates/[id]/route";
const context = { params: Promise.resolve({ id: "cert" }) };
beforeEach(() => {
  vi.mocked(getMobileUserId).mockResolvedValue(null);
  prismaMock.certificate.findFirst.mockResolvedValue(null);
  prismaMock.certificate.findMany.mockResolvedValue([]);
  prismaMock.certificate.findUnique.mockResolvedValue({ id: "cert", userId: "user", title: "Ethics and pain management", topics: [], creditHours: 2, specialTopics: [], manuallyVerified: false, extractionStatus: "NEEDS_REVIEW", topicHourAllocations: {} });
  prismaMock.certificate.update.mockImplementation(async ({ data }) => data);
});
test("confirmation stores explicit topic splits without certifying unreviewed extraction", async () => {
  const response = await PATCH(new NextRequest("http://localhost/api/certificates/cert", { method: "PATCH", body: JSON.stringify({ topicHourAllocations: { ETHICS: 1, PAIN_MANAGEMENT: 1 } }) }), context);
  expect(response.status).toBe(200);
  expect(prismaMock.certificate.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ specialTopics: ["ETHICS", "PAIN_MANAGEMENT"], topicHourAllocations: { ETHICS: 1, PAIN_MANAGEMENT: 1 }, manuallyVerified: true, extractionStatus: "NEEDS_REVIEW" }) }));
});
test("overallocated topic hours fail without a write", async () => {
  const response = await PATCH(new NextRequest("http://localhost/api/certificates/cert", { method: "PATCH", body: JSON.stringify({ topicHourAllocations: { ETHICS: 3 } }) }), context);
  expect(response.status).toBe(400); expect(prismaMock.certificate.update).not.toHaveBeenCalled();
});

function reviewRequest(body: object = {}) {
  return new NextRequest("http://localhost/api/certificates/cert", { method: "PATCH", body: JSON.stringify(body) });
}
function storedCertificate(extractionStatus = "COMPLETED") {
  return { id: "cert", userId: "user", title: "QA Clinical update", provider: "QA Provider", activityDate: new Date("2026-01-15"), hoursEarned: 1, creditHours: 1, activityMaxHours: null, activityFingerprint: null, possibleDuplicateOfId: null, topics: [], specialTopics: [], manuallyVerified: false, extractionStatus, topicHourAllocations: {} };
}

test("review is persisted and emits a content-free event once, including a repeated click", async () => {
  let row = storedCertificate();
  prismaMock.certificate.findUnique.mockImplementation(async () => row);
  prismaMock.certificate.update.mockImplementation(async ({ data }) => (row = { ...row, ...data }));
  expect((await PATCH(reviewRequest(), context)).status).toBe(200);
  expect(row.manuallyVerified).toBe(true);
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith("user", "certificate_reviewed", { result: "confirmed", previous_status: "COMPLETED" });
  await PATCH(reviewRequest(), context);
  expect(trackEvent).toHaveBeenCalledTimes(1);
});

test("manual recovery emits review only after complete fields are saved, including mobile auth", async () => {
  vi.mocked(getMobileUserId).mockResolvedValue("user");
  const row = storedCertificate("FAILED");
  prismaMock.certificate.findUnique.mockResolvedValue(row);
  prismaMock.certificate.update.mockImplementation(async ({ data }) => ({ ...row, ...data }));
  await PATCH(reviewRequest({ title: row.title, provider: row.provider, activityDate: "2026-01-15", creditHours: 1 }), context);
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith("user", "certificate_reviewed", { result: "confirmed", previous_status: "FAILED" });
});

test("incomplete review, rejected ownership and failed writes do not emit a completed review", async () => {
  await PATCH(reviewRequest(), context);
  expect(trackEvent).not.toHaveBeenCalled();
  prismaMock.certificate.findUnique.mockResolvedValue({ ...storedCertificate(), userId: "other" });
  expect((await PATCH(reviewRequest(), context)).status).toBe(404);
  expect(trackEvent).not.toHaveBeenCalled();
  prismaMock.certificate.findUnique.mockResolvedValue(storedCertificate());
  prismaMock.certificate.update.mockRejectedValueOnce(new Error("mock write failed"));
  expect((await PATCH(reviewRequest(), context)).status).toBe(500);
  expect(trackEvent).not.toHaveBeenCalled();
});
