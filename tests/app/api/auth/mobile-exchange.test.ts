import { prismaMock } from "../../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import { POST } from "@/app/api/auth/mobile-session/exchange/route";
import { GET } from "@/app/api/auth/mobile-session/route";
const exchanges = new Map<string, { token: string; identifier: string; expires: Date }>();
beforeEach(() => {
  exchanges.clear(); vi.stubEnv("NEXTAUTH_SECRET", "offline-test-secret");
  prismaMock.user.findUnique.mockResolvedValue({ id: "user" });
  prismaMock.verificationToken.create.mockImplementation(async ({ data }) => { exchanges.set(data.token, data); return data; });
  prismaMock.verificationToken.findUnique.mockImplementation(async ({ where }) => exchanges.get(where.token));
  prismaMock.verificationToken.deleteMany.mockImplementation(async ({ where }) => ({ count: exchanges.delete(where.token) ? 1 : 0 }));
  prismaMock.session.create.mockResolvedValue({});
});
async function issue() {
  const jwt = await new SignJWT({ sub: "user" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode("offline-test-secret"));
  const response = await POST(new NextRequest("https://clearcme.test/api/auth/mobile-session/exchange", { method: "POST", headers: { Authorization: `Bearer ${jwt}` } }));
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); return (await response.json()).code as string;
}
const redeem = (code: string) => GET(new NextRequest(`https://clearcme.test/api/auth/mobile-session?code=${code}`));
test("exchange stores only a hash and yields one HTTPS session; reuse is 401", async () => {
  const code = await issue();
  expect(code).toHaveLength(43); expect(exchanges.has(code)).toBe(false); expect(exchanges.has(createHash("sha256").update(code).digest("hex"))).toBe(true);
  const response = await redeem(code); expect(response.status).toBe(307);
  expect(response.headers.get("set-cookie")).toContain("__Secure-authjs.session-token="); expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect((await redeem(code)).status).toBe(401); expect(prismaMock.session.create).toHaveBeenCalledOnce();
});
test("concurrent redemption permits only one session", async () => { const code = await issue(); const responses = await Promise.all([redeem(code), redeem(code)]); expect(responses.map((r) => r.status).sort()).toEqual([307, 401]); expect(prismaMock.session.create).toHaveBeenCalledOnce(); });
test("expired code returns 401", async () => { const code = await issue(); for (const row of exchanges.values()) row.expires = new Date(0); expect((await redeem(code)).status).toBe(401); expect(prismaMock.session.create).not.toHaveBeenCalled(); });
test("old JWT query bridge is 410 and never creates a session", async () => { vi.spyOn(console, "warn").mockImplementation(() => {}); expect((await GET(new NextRequest("https://clearcme.test/api/auth/mobile-session?token=retired"))).status).toBe(410); expect(prismaMock.session.create).not.toHaveBeenCalled(); });
test("exchange requires the Authorization header", async () => { expect((await POST(new NextRequest("https://clearcme.test/api/auth/mobile-session/exchange", { method: "POST" }))).status).toBe(401); });
