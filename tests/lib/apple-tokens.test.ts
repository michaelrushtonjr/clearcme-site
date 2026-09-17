import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { appleTokenRevocationConfigured, exchangeAppleAuthorizationCode, revokeAppleRefreshToken } from "@/lib/apple-tokens";

const pem = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const fetchMock = vi.fn();
beforeEach(() => { vi.unstubAllEnvs(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());
const configure = () => { vi.stubEnv("APPLE_TEAM_ID", "TEAM123456"); vi.stubEnv("APPLE_KEY_ID", "KEY1234567"); vi.stubEnv("APPLE_BUNDLE_ID", "ai.clearcme.test"); vi.stubEnv("APPLE_PRIVATE_KEY", pem.replace(/\n/g, "\\n")); };

test("dormant until all four variables are set: no network, no token", async () => {
  expect(appleTokenRevocationConfigured()).toBe(false);
  expect(await exchangeAppleAuthorizationCode("code")).toBeNull(); expect(await revokeAppleRefreshToken("token")).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});
test("exchange posts the code with a short-lived ES256 client secret for the bundle ID", async () => {
  configure(); fetchMock.mockResolvedValue(new Response(JSON.stringify({ refresh_token: "r1" }), { status: 200 }));
  expect(await exchangeAppleAuthorizationCode("auth-code")).toBe("r1");
  const [url, init] = fetchMock.mock.calls[0]; expect(url).toBe("https://appleid.apple.com/auth/token");
  const body = init.body as URLSearchParams; expect(body.get("grant_type")).toBe("authorization_code"); expect(body.get("code")).toBe("auth-code"); expect(body.get("client_id")).toBe("ai.clearcme.test");
  const secret = body.get("client_secret")!; expect(decodeProtectedHeader(secret)).toMatchObject({ alg: "ES256", kid: "KEY1234567" });
  const claims = decodeJwt(secret); expect(claims).toMatchObject({ iss: "TEAM123456", sub: "ai.clearcme.test", aud: "https://appleid.apple.com" }); expect(claims.exp! - claims.iat!).toBeLessThanOrEqual(300);
});
test("refusals and network errors resolve quietly", async () => {
  configure(); fetchMock.mockResolvedValue(new Response("{}", { status: 400 }));
  expect(await exchangeAppleAuthorizationCode("bad")).toBeNull(); expect(await revokeAppleRefreshToken("bad")).toBe(false);
  fetchMock.mockRejectedValue(new Error("offline")); expect(await exchangeAppleAuthorizationCode("x")).toBeNull(); expect(await revokeAppleRefreshToken("x")).toBe(false);
});
test("revoke targets the refresh token and reports Apple's confirmation", async () => {
  configure(); fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  expect(await revokeAppleRefreshToken("r1")).toBe(true);
  const [url, init] = fetchMock.mock.calls[0]; expect(url).toBe("https://appleid.apple.com/auth/revoke");
  expect((init.body as URLSearchParams).get("token")).toBe("r1"); expect((init.body as URLSearchParams).get("token_type_hint")).toBe("refresh_token");
});
