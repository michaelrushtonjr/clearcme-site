import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prismaMock } from "../../helpers/prisma-mock";
import { adsTestKey, configureAdsTests } from "../../helpers/google-ads";
import { ADS_COOKIE } from "@/lib/google-ads-consent";
import { newAdsConsent, readAdsConsent, sealAdsConsent } from "@/lib/google-ads-cookie";
const state = vi.hoisted(() => ({ raw: undefined as string | undefined, set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => name === "clearcme_ads_measurement" && state.raw ? { value: state.raw } : undefined, set: state.set }) }));
import { GET, POST } from "@/app/api/ads/measurement/route";

const request = (body: unknown, headers = {}, url = "https://clearcme.ai/api/ads/measurement") => new Request(url, { method: "POST", headers: { origin: new URL(url).origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
const click = { kind: "gclid", value: "test_click-123" };
beforeEach(() => { configureAdsTests(); state.raw = undefined; });
afterEach(() => vi.unstubAllEnvs());

it("returns only availability and choice, with no-store and no advertising calls", async () => {
  const response = await GET(new Request("https://clearcme.ai/api/ads/measurement"));
  expect(await response.json()).toEqual({ enabled: true, choice: null });
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(fetch).not.toHaveBeenCalled(); expect(state.set).not.toHaveBeenCalled();
});
it("refuses foreign or missing origins and oversized inputs", async () => {
  expect((await POST(request({ choice: "granted", click, page: "/" }, { origin: "https://foreign.invalid" }))).status).toBe(403);
  expect((await POST(new Request("https://clearcme.ai/api/ads/measurement", { method: "POST" }))).status).toBe(403);
  expect((await POST(request({ choice: "granted", click, page: "/" }, { "content-length": "1025" }))).status).toBe(413);
  expect((await POST(request({ choice: "granted", padding: "a".repeat(1025) }))).status).toBe(413);
  expect(state.set).not.toHaveBeenCalled();
});
it("rejects forged registration signals, personal fields, private/token URLs and invalid JSON", async () => {
  for (const value of [{ event: "registration", userId: "private-user" }, { choice: "granted", click, page: "/dashboard" }, { choice: "granted", click, page: "/?token=private-token" }, { choice: "granted", email: "doctor@example.invalid" }]) expect((await POST(request(value))).status).toBe(400);
  const bad = new Request("https://clearcme.ai/api/ads/measurement", { method: "POST", headers: { origin: "https://clearcme.ai" }, body: "{" });
  expect((await POST(bad)).status).toBe(400);
  expect(prismaMock.googleAdsRegistration.upsert).not.toHaveBeenCalled(); expect(state.set).not.toHaveBeenCalled();
});
it("sets encrypted HttpOnly Secure consent with Apple's cross-site callback compatibility", async () => {
  expect((await POST(request({ choice: "granted", click, page: "/physician-cme-tracker" }))).status).toBe(204);
  const [name, raw, options] = state.set.mock.calls[0];
  expect(name).toBe(ADS_COOKIE); expect(raw).not.toContain(click.value);
  expect(readAdsConsent(raw, adsTestKey)).toMatchObject({ choice: "granted", click });
  expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/" });
  expect(options.maxAge).toBeLessThanOrEqual(30 * 86400);
  expect(fetch).not.toHaveBeenCalled();
});
it("withdrawal cancels unsubmitted events and stores no click identifier", async () => {
  const old = newAdsConsent("granted", { kind: "gclid", value: click.value });
  state.raw = sealAdsConsent(old, adsTestKey);
  expect((await POST(request({ choice: "denied" }))).status).toBe(204);
  expect(prismaMock.googleAdsRegistration.deleteMany).toHaveBeenCalledWith({ where: { consentId: old.id, requestId: null, deliveredAt: null } });
  expect(readAdsConsent(state.set.mock.calls[0][1], adsTestKey)).toMatchObject({ choice: "denied", click: null });
});
it("DNT/GPC/native headers override an allow request", async () => {
  for (const headers of [{ dnt: "1" }, { "sec-gpc": "1" }, { "user-agent": "ClearCMEApp" }] as Record<string, string>[]) {
    expect((await POST(request({ choice: "granted", click, page: "/" }, headers))).status).toBe(204);
    expect(readAdsConsent(state.set.mock.calls.at(-1)![1], adsTestKey)).toMatchObject({ choice: "denied", click: null });
    expect(await (await GET(new Request("https://clearcme.ai/api/ads/measurement", { headers }))).json()).toMatchObject({ enabled: false });
  }
});
it("refreshing paid attribution preserves consent ID and original expiry", async () => {
  const old = newAdsConsent("granted", { kind: "gclid", value: click.value }, Date.now() - 86400_000);
  state.raw = sealAdsConsent(old, adsTestKey);
  await POST(request({ choice: "granted", click: { ...click, value: "second_click-123" }, page: "/" }));
  const saved = readAdsConsent(state.set.mock.calls[0][1], adsTestKey);
  expect(saved).toMatchObject({ at: old.at, id: old.id, click: { value: "second_click-123" } });
  expect(state.set.mock.calls[0][2].maxAge).toBeLessThanOrEqual(29 * 86400);
});
it("stays inert without configured credentials", async () => {
  vi.stubEnv("GOOGLE_ADS_OAUTH_REFRESH_TOKEN", "");
  expect((await POST(request({ choice: "granted", click, page: "/" }))).status).toBe(204);
  expect(await (await GET(new Request("https://clearcme.ai/api/ads/measurement"))).json()).toEqual({ enabled: false, choice: null });
  expect(state.set).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
