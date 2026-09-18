import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../helpers/prisma-mock";
const requestState = vi.hoisted(() => ({ cookie: undefined as string | undefined, dnt: null as string | null }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => requestState.cookie ? { value: requestState.cookie } : undefined }), headers: async () => ({ get: () => requestState.dnt }) }));
import { recordSeoActivation, recordSeoRegistration } from "@/lib/seo-events";
import { POST } from "@/app/api/seo/event/route";
beforeEach(() => {
  requestState.cookie = encodeURIComponent(JSON.stringify({ landing: "/cme-requirements/texas", cluster: "state_requirements", channel: "organic_search", at: Date.now() }));
  requestState.dnt = null;
  prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.user.findUnique.mockResolvedValue({ seoLandingPath: "/cme-requirements/texas", seoChannel: "organic_search", seoActivatedAt: null });
  prismaMock.physicianLicense.findFirst.mockResolvedValue({ id: "license" });
  prismaMock.certificate.findFirst.mockResolvedValue({ id: "certificate" });
});
describe("registration and activation accounting", () => {
  it("records registration using a coarse page/source aggregate without account identifiers", async () => {
    await recordSeoRegistration("private-user");
    const metric = prismaMock.seoDailyMetric.upsert.mock.calls[0][0];
    expect(metric.create).toMatchObject({ event: "registration", landing: "/cme-requirements/texas", channel: "organic_search", cluster: "state_requirements", count: 1 });
    expect(JSON.stringify(metric)).not.toContain("private-user");
  });
  it("respects missing attribution and Do Not Track", async () => {
    requestState.cookie = undefined;
    await recordSeoRegistration("user");
    requestState.dnt = "1";
    await recordSeoRegistration("user");
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });
  it("does not duplicate registration or activation on a lost concurrent claim", async () => {
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
    await recordSeoRegistration("user");
    expect(await recordSeoActivation("user")).toBe(false);
    expect(prismaMock.seoDailyMetric.upsert).not.toHaveBeenCalled();
  });
  it("requires an active license and an extracted or verified manual certificate", async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(null);
    expect(await recordSeoActivation("user")).toBe(false);
    expect(prismaMock.certificate.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user", OR: [{ extractionStatus: "COMPLETED" }, { extractionStatus: "MANUAL", manuallyVerified: true }] } }));
    expect(prismaMock.seoDailyMetric.upsert).not.toHaveBeenCalled();
    prismaMock.certificate.findFirst.mockResolvedValue({ id: "certificate" });
    prismaMock.physicianLicense.findFirst.mockResolvedValue(null);
    expect(await recordSeoActivation("user")).toBe(false);
  });
  it("records one activation and skips an already activated account", async () => {
    expect(await recordSeoActivation("user")).toBe(true);
    prismaMock.user.findUnique.mockResolvedValue({ seoLandingPath: "/cme-requirements/texas", seoChannel: "organic_search", seoActivatedAt: new Date() });
    expect(await recordSeoActivation("user")).toBe(false);
    expect(prismaMock.seoDailyMetric.upsert).toHaveBeenCalledTimes(1);
  });
});
describe("anonymous event boundary", () => {
  const request = (body: unknown, origin = "https://clearcme.ai", dnt = "0") => new Request("https://clearcme.ai/api/seo/event", { method: "POST", headers: { origin, dnt, "content-type": "application/json" }, body: JSON.stringify(body) });
  it("rejects foreign origins, fake conversions, private paths and PII dimensions", async () => {
    expect((await POST(request({}, "https://foreign.example"))).status).toBe(403);
    for (const body of [{ event: "registration", page: "/", channel: "organic_search" }, { event: "cta_click", page: "/dashboard", channel: "organic_search" }, { event: "cta_click", page: "/", channel: "name@example.com" }]) expect((await POST(request(body))).status).toBe(400);
    expect(prismaMock.seoDailyMetric.upsert).not.toHaveBeenCalled();
  });
  it("skips DNT and accepts bounded click dimensions", async () => {
    const body = { event: "cta_click", page: "/mate-act", channel: "organic_search" };
    expect((await POST(request(body, undefined, "1"))).status).toBe(204);
    expect(prismaMock.seoDailyMetric.upsert).not.toHaveBeenCalled();
    expect((await POST(request(body))).status).toBe(204);
    expect(prismaMock.seoDailyMetric.upsert).toHaveBeenCalledTimes(1);
  });
});
