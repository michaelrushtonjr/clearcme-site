import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prismaMock } from "../helpers/prisma-mock";
import { adsTestKey, configureAdsTests } from "../helpers/google-ads";
import { newAdsConsent, sealAdsConsent } from "@/lib/google-ads-cookie";
const state = vi.hoisted(() => ({ raw: undefined as string | undefined, headers: new Headers() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.raw ? { value: state.raw } : undefined }), headers: async () => state.headers }));
import { queueGoogleAdsRegistration } from "@/lib/google-ads-registration";

beforeEach(() => {
  configureAdsTests(); state.headers = new Headers();
  state.raw = sealAdsConsent(newAdsConsent("granted", { kind: "gclid", value: "test_click-123" }), adsTestKey);
});
afterEach(() => vi.unstubAllEnvs());

it("queues only a successfully created new account, with a stable unique user claim", async () => {
  await queueGoogleAdsRegistration("private-user", false);
  await queueGoogleAdsRegistration("private-user", undefined);
  expect(prismaMock.googleAdsRegistration.upsert).not.toHaveBeenCalled();
  await queueGoogleAdsRegistration("private-user", true);
  const call = prismaMock.googleAdsRegistration.upsert.mock.calls[0][0];
  expect(call).toMatchObject({ where: { userId: "private-user" }, update: {}, create: { userId: "private-user", clickCiphertext: state.raw, customerId: "1234567890", actionId: "987654321" } });
  expect(call.create.availableAt.getTime() - call.create.registeredAt.getTime()).toBe(6 * 3600 * 1000);
  expect(JSON.stringify(call)).not.toContain("test_click-123");
});
it("skips missing, forged, expired, denied and clickless consent", async () => {
  const click = { kind: "gclid" as const, value: "test_click-123" };
  for (const raw of [undefined, "forged", sealAdsConsent(newAdsConsent("denied", click), adsTestKey), sealAdsConsent(newAdsConsent("granted", null), adsTestKey), sealAdsConsent(newAdsConsent("granted", click, Date.now() - 31 * 86400_000), adsTestKey)]) {
    state.raw = raw; await queueGoogleAdsRegistration("private-user", true);
  }
  expect(prismaMock.googleAdsRegistration.upsert).not.toHaveBeenCalled();
});
it("honors privacy headers even with valid earlier consent", async () => {
  for (const headers of [{ dnt: "1" }, { "sec-gpc": "1" }, { "user-agent": "ClearCMEApp" }] as Record<string, string>[]) {
    state.headers = new Headers(headers); await queueGoogleAdsRegistration("private-user", true);
  }
  expect(prismaMock.googleAdsRegistration.upsert).not.toHaveBeenCalled();
});
it("disabled configuration makes no attribution write", async () => {
  vi.stubEnv("GOOGLE_ADS_MEASUREMENT_ENABLED", "false");
  await queueGoogleAdsRegistration("private-user", true);
  expect(prismaMock.googleAdsRegistration.upsert).not.toHaveBeenCalled();
});
it("a queue failure cannot fail authentication or log account/click data", async () => {
  prismaMock.googleAdsRegistration.upsert.mockRejectedValueOnce(new Error("private-user test_click-123 private@example.invalid"));
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  await expect(queueGoogleAdsRegistration("private-user", true)).resolves.toBeUndefined();
  expect(log).toHaveBeenCalledWith("Google Ads registration queue unavailable");
  log.mockRestore();
});
