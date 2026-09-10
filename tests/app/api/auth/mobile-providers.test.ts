import { prismaMock } from "../../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { CertificateFormat } from "google-auth-library/build/src/auth/oauth2client";
import { SignJWT } from "jose";
const key = vi.hoisted(() => ({ publicKey: null as KeyObject | null }));
vi.mock("jose", async (original) => ({ ...await original<typeof import("jose")>(), createRemoteJWKSet: vi.fn(() => async () => key.publicKey) }));
import { POST as googlePOST } from "@/app/api/auth/mobile-google/route";
import { POST as applePOST } from "@/app/api/auth/mobile-apple/route";
import { providerEmailVerified } from "@/lib/mobile-identity";
const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const user = { id: "user", email: "test@example.invalid", name: "Test", image: null, emailVerified: null };
vi.spyOn(OAuth2Client.prototype, "getFederatedSignonCertsAsync").mockResolvedValue({ certs: { fixture: pair.publicKey.export({ type: "spki", format: "pem" }).toString() }, format: CertificateFormat.PEM });
beforeEach(() => {
  key.publicKey = pair.publicKey;
  vi.stubEnv("GOOGLE_CLIENT_ID", "web-client"); vi.stubEnv("GOOGLE_IOS_CLIENT_ID", "ios-client"); vi.stubEnv("APPLE_BUNDLE_ID", "ai.clearcme.test"); vi.stubEnv("NEXTAUTH_SECRET", "test-secret-not-a-real-credential");
  prismaMock.account.findUnique.mockResolvedValue(null); prismaMock.account.findFirst.mockResolvedValue(null);
  prismaMock.user.findUnique.mockResolvedValue(null); prismaMock.user.create.mockResolvedValue(user); prismaMock.user.update.mockResolvedValue(user);
  prismaMock.account.create.mockResolvedValue({});
});
async function token(provider: "google" | "apple", data: Record<string, unknown> = {}) {
  return new SignJWT({ email: user.email, email_verified: true, ...data }).setProtectedHeader({ alg: "RS256", kid: "fixture" }).setSubject("provider-subject")
    .setIssuer(provider === "google" ? "https://accounts.google.com" : "https://appleid.apple.com").setAudience((data.aud as string) ?? (provider === "google" ? "web-client" : "ai.clearcme.test")).setIssuedAt().setExpirationTime((data.exp as number) ?? "1h").sign(pair.privateKey);
}
for (const [provider, post, field] of [["google", googlePOST, "idToken"], ["apple", applePOST, "identityToken"]] as const) {
  const request = async (data: Record<string, unknown> = {}) => new NextRequest(`http://localhost/api/auth/mobile-${provider}`, { method: "POST", body: JSON.stringify({ [field]: await token(provider, data) }) });
  test(`${provider}: cryptographically valid token with wrong audience returns 401`, async () => {
    expect((await post(await request({ aud: "another-application" }))).status).toBe(401); expect(prismaMock.account.findUnique).not.toHaveBeenCalled();
  });
  test(`${provider}: expired signed token returns 401`, async () => { expect((await post(await request({ exp: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(401); });
  test(`${provider}: unverified email returns 403 without linking`, async () => {
    expect((await post(await request({ email_verified: false }))).status).toBe(403); expect(prismaMock.account.create).not.toHaveBeenCalled(); expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
  test(`${provider}: new user and provider account are created`, async () => {
    expect((await post(await request())).status).toBe(200); expect(prismaMock.user.create).toHaveBeenCalledOnce(); expect(prismaMock.account.create).toHaveBeenCalledWith({ data: { userId: "user", type: "oauth", provider, providerAccountId: "provider-subject" } });
  });
  test(`${provider}: verified existing email links without duplicate user`, async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    expect((await post(await request())).status).toBe(200); expect(prismaMock.user.create).not.toHaveBeenCalled(); expect(prismaMock.account.create).toHaveBeenCalledOnce();
  });
  test(`${provider}: returning subject wins over an email lookup`, async () => {
    prismaMock.account.findUnique.mockResolvedValue({ userId: "user", user });
    expect((await post(await request())).status).toBe(200); expect(prismaMock.user.findUnique).not.toHaveBeenCalled(); expect(prismaMock.account.create).not.toHaveBeenCalled();
  });
  test(`${provider}: conflicting linked subject cannot be taken over by email`, async () => {
    prismaMock.user.findUnique.mockResolvedValue(user); prismaMock.account.findFirst.mockResolvedValue({ providerAccountId: "different-subject" });
    expect((await post(await request())).status).toBe(403); expect(prismaMock.account.create).not.toHaveBeenCalled();
  });
}
test("web linking uses strict Google boolean / Apple boolean-or-string verification", () => {
  expect(providerEmailVerified("google", "true")).toBe(false); expect(providerEmailVerified("apple", "true")).toBe(true); expect(providerEmailVerified("google", true)).toBe(true); expect(providerEmailVerified("apple", undefined)).toBe(false);
});
