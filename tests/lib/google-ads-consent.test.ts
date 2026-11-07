import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADS_TTL, adMeasurementBlocked, parseAdClick } from "@/lib/google-ads-consent";
import { googleAdsConfig } from "@/lib/google-ads-config";
import { newAdsConsent, readAdsConsent, sealAdsConsent } from "@/lib/google-ads-cookie";
import { adsTestKey, configureAdsTests } from "../helpers/google-ads";

beforeEach(configureAdsTests);
afterEach(() => vi.unstubAllEnvs());
describe("Ads configuration and consent boundary", () => {
  it("requires explicit enablement and complete server credentials", () => {
    expect(googleAdsConfig()).not.toBeNull();
    for (const key of ["GOOGLE_ADS_MEASUREMENT_ENABLED", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_REGISTRATION_ACTION_ID", "GOOGLE_ADS_COOKIE_KEY", "GOOGLE_ADS_OAUTH_CLIENT_ID", "GOOGLE_ADS_OAUTH_CLIENT_SECRET", "GOOGLE_ADS_OAUTH_REFRESH_TOKEN"]) {
      const previous = process.env[key]; vi.stubEnv(key, "");
      expect(googleAdsConfig()).toBeNull(); vi.stubEnv(key, previous!);
    }
    vi.stubEnv("GOOGLE_ADS_REGISTRATION_ACTION_ID", "AW-123/website-label");
    expect(googleAdsConfig()).toBeNull();
  });
  it("disables Preview and accepts a separate manager ID only in numeric form", () => {
    vi.stubEnv("VERCEL_ENV", "preview"); expect(googleAdsConfig()).toBeNull();
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "0987654321");
    expect(googleAdsConfig()?.loginId).toBe("0987654321");
    vi.stubEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "098-765-4321"); expect(googleAdsConfig()).toBeNull();
  });
  it("blocks DNT, GPC and the native app", () => {
    for (const headers of [{ dnt: "1" }, { "sec-gpc": "1" }, { "user-agent": "ClearCMEApp iOS" }] as Record<string, string>[]) expect(adMeasurementBlocked(new Headers(headers))).toBe(true);
    expect(adMeasurementBlocked(new Headers())).toBe(false);
  });
  it("accepts bounded web click IDs and drops other fields", () => {
    expect(parseAdClick({ kind: "wbraid", value: "test_wbraid-123", email: "private@example.invalid" })).toEqual({ kind: "wbraid", value: "test_wbraid-123" });
    for (const value of [null, { kind: "gbraid", value: "app_click_123" }, { kind: "gclid", value: "doctor@example.invalid" }, { kind: "gclid", value: "a".repeat(513) }, { kind: "gclid", value: "https://example.invalid" }]) expect(parseAdClick(value)).toBeNull();
  });
  it("encrypts/authenticates consent and rejects tampering, wrong keys and expiry", () => {
    const now = Date.now();
    const consent = newAdsConsent("granted", { kind: "gclid", value: "test_click-123" }, now);
    const sealed = sealAdsConsent(consent, adsTestKey);
    expect(sealed).not.toContain("test_click-123");
    expect(readAdsConsent(sealed, adsTestKey, now)).toEqual(consent);
    const changed = Buffer.from(sealed, "base64url"); changed[30] ^= 1;
    expect(readAdsConsent(changed.toString("base64url"), adsTestKey, now)).toBeNull();
    expect(readAdsConsent(sealed, "22".repeat(32), now)).toBeNull();
    expect(readAdsConsent(sealed, adsTestKey, now + ADS_TTL * 1000)).toBeNull();
    expect(readAdsConsent(sealed, adsTestKey, now - 1)).toBeNull();
    expect(readAdsConsent("bad!", adsTestKey, now)).toBeNull();
  });
  it("stores no click identifier with a denied choice", () => {
    expect(newAdsConsent("denied", { kind: "gclid", value: "test_click-123" }).click).toBeNull();
  });
});
