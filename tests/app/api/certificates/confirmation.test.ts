import { prismaMock } from "../../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileUserId: vi.fn(async () => null) }));
import { PATCH } from "@/app/api/certificates/[id]/route";
const context = { params: Promise.resolve({ id: "cert" }) };
beforeEach(() => {
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
