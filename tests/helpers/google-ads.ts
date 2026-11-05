import { vi } from "vitest";

export const adsTestKey = "11".repeat(32);
export function configureAdsTests() {
  for (const [key, value] of Object.entries({
    GOOGLE_ADS_MEASUREMENT_ENABLED: "true", VERCEL_ENV: "production",
    GOOGLE_ADS_CUSTOMER_ID: "1234567890", GOOGLE_ADS_REGISTRATION_ACTION_ID: "987654321",
    GOOGLE_ADS_LOGIN_CUSTOMER_ID: "", GOOGLE_ADS_COOKIE_KEY: adsTestKey,
    GOOGLE_ADS_OAUTH_CLIENT_ID: "fixture-client", GOOGLE_ADS_OAUTH_CLIENT_SECRET: "fixture-secret",
    GOOGLE_ADS_OAUTH_REFRESH_TOKEN: "fixture-refresh",
  })) vi.stubEnv(key, value);
}
