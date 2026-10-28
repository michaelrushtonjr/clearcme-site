// Server only: never use NEXT_PUBLIC_ for Ads configuration or credentials.
export function googleAdsConfig() {
  const env = process.env;
  if (env.GOOGLE_ADS_MEASUREMENT_ENABLED !== "true" || (env.VERCEL_ENV && env.VERCEL_ENV !== "production")) return null;
  const customerId = env.GOOGLE_ADS_CUSTOMER_ID ?? "";
  const actionId = env.GOOGLE_ADS_REGISTRATION_ACTION_ID ?? "";
  const loginId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || customerId;
  const cookieKey = env.GOOGLE_ADS_COOKIE_KEY ?? "";
  const clientId = env.GOOGLE_ADS_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_ADS_OAUTH_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_ADS_OAUTH_REFRESH_TOKEN;
  if (!/^\d{10}$/.test(customerId) || !/^\d{10}$/.test(loginId) || !/^[1-9]\d{0,19}$/.test(actionId) || !/^[a-fA-F0-9]{64}$/.test(cookieKey) || !clientId || !clientSecret || !refreshToken) return null;
  return { customerId, actionId, loginId, cookieKey, clientId, clientSecret, refreshToken };
}
export type GoogleAdsConfig = NonNullable<ReturnType<typeof googleAdsConfig>>;
