import { SignJWT, importPKCS8 } from "jose";

// Sign in with Apple token exchange and revocation for the iOS app. Apple
// requires apps that offer Sign in with Apple to revoke the user's tokens when
// the account is deleted (guideline 5.1.1(v)). Everything here is dormant until
// APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 contents) and
// APPLE_BUNDLE_ID are all set, and every call is best-effort: a failure never
// blocks sign-in or deletion.
const APPLE = "https://appleid.apple.com";

function config() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientId = process.env.APPLE_BUNDLE_ID;
  return teamId && keyId && privateKey && clientId ? { teamId, keyId, privateKey, clientId } : null;
}

export const appleTokenRevocationConfigured = () => config() !== null;

async function clientSecret(c: NonNullable<ReturnType<typeof config>>) {
  const key = await importPKCS8(c.privateKey, "ES256");
  return new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: c.keyId })
    .setIssuer(c.teamId).setSubject(c.clientId).setAudience(APPLE).setIssuedAt().setExpirationTime("5m").sign(key);
}

/** Trades the app's one-time authorization code for a refresh token. Null when unconfigured or refused. */
export async function exchangeAppleAuthorizationCode(code: string): Promise<string | null> {
  const c = config();
  if (!c) return null;
  try {
    const res = await fetch(`${APPLE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: c.clientId, client_secret: await clientSecret(c) }),
    });
    if (!res.ok) return null;
    const token = ((await res.json()) as { refresh_token?: unknown }).refresh_token;
    return typeof token === "string" && token ? token : null;
  } catch {
    return null;
  }
}

/** Revokes a refresh token. True only when Apple confirms. */
export async function revokeAppleRefreshToken(refreshToken: string): Promise<boolean> {
  const c = config();
  if (!c) return false;
  try {
    const res = await fetch(`${APPLE}/auth/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken, token_type_hint: "refresh_token", client_id: c.clientId, client_secret: await clientSecret(c) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
