import { prismaMock } from "../../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
const mail = vi.hoisted(() => ({ sendEmail: vi.fn(), configured: true }));
vi.mock("@/lib/email", () => ({ sendEmail: mail.sendEmail, isEmailConfigured: () => mail.configured, renderSignInCodeEmail: ({ code }: { code: string }) => ({ subject: `code ${code}`, html: code }) }));
import { POST as startPOST } from "@/app/api/auth/mobile-email/start/route";
import { POST as verifyPOST } from "@/app/api/auth/mobile-email/verify/route";

const email = "doc@example.invalid";
const hash = (code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");
const user = { id: "user", email, name: null, image: null, emailVerified: null };
const post = (handler: typeof startPOST, body: unknown) => handler(new Request("http://localhost/api/auth/mobile-email", { method: "POST", body: JSON.stringify(body) }));
const row = (overrides: Record<string, unknown> = {}) => ({ email, codeHash: hash("123456"), expires: new Date(Date.now() + 60_000), attempts: 0, sendCount: 1, windowStart: new Date(), lastSentAt: new Date(Date.now() - 60_000), ...overrides });
beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs(); mail.configured = true; mail.sendEmail.mockResolvedValue({ ok: true });
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret-not-a-real-credential");
  prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(null); prismaMock.mobileEmailCode.upsert.mockResolvedValue({});
  prismaMock.mobileEmailCode.update.mockResolvedValue({}); prismaMock.mobileEmailCode.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.user.findUnique.mockResolvedValue(null); prismaMock.user.create.mockResolvedValue(user); prismaMock.user.update.mockResolvedValue(user);
});

test("start: rejects a malformed address", async () => { expect((await post(startPOST, { email: "nope" })).status).toBe(400); expect(mail.sendEmail).not.toHaveBeenCalled(); });
test("start: stores only a hash and emails a six-digit code to the normalized address", async () => {
  expect((await post(startPOST, { email: "  Doc@Example.INVALID " })).status).toBe(200);
  const code = mail.sendEmail.mock.calls[0][0].html as string; expect(code).toMatch(/^\d{6}$/); expect(mail.sendEmail.mock.calls[0][0].to).toBe(email);
  const stored = prismaMock.mobileEmailCode.upsert.mock.calls[0][0].create; expect(stored.codeHash).toBe(hash(code)); expect(JSON.stringify(stored)).not.toContain(`"${code}"`);
});
test("start: resend gap and per-window cap both return 429 without sending", async () => {
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(row({ lastSentAt: new Date() })); expect((await post(startPOST, { email })).status).toBe(429);
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(row({ sendCount: 5 })); expect((await post(startPOST, { email })).status).toBe(429);
  expect(mail.sendEmail).not.toHaveBeenCalled();
});
test("start: a stale window resets the send count; an unsent email is a 502", async () => {
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(row({ sendCount: 5, windowStart: new Date(Date.now() - 16 * 60_000) }));
  expect((await post(startPOST, { email })).status).toBe(200); expect(prismaMock.mobileEmailCode.upsert.mock.calls[0][0].update.sendCount).toBe(1);
  mail.sendEmail.mockResolvedValue({ ok: false }); prismaMock.mobileEmailCode.findUnique.mockResolvedValue(null); expect((await post(startPOST, { email })).status).toBe(502);
});
test("verify: wrong code is counted and rejected", async () => {
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(row());
  expect((await post(verifyPOST, { email, code: "654321" })).status).toBe(401);
  expect(prismaMock.mobileEmailCode.update).toHaveBeenCalledWith({ where: { email }, data: { attempts: { increment: 1 } } }); expect(prismaMock.user.create).not.toHaveBeenCalled();
});
test("verify: expired, exhausted, or missing codes never reach the comparison", async () => {
  for (const state of [null, row({ expires: new Date(Date.now() - 1) }), row({ attempts: 5 })]) {
    prismaMock.mobileEmailCode.findUnique.mockResolvedValue(state); expect((await post(verifyPOST, { email, code: "123456" })).status).toBe(401);
  }
  expect(prismaMock.mobileEmailCode.updateMany).not.toHaveBeenCalled();
});
test("verify: right code is spent once, creates a verified user, and returns a JWT", async () => {
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(row());
  const res = await post(verifyPOST, { email, code: "123456" }); expect(res.status).toBe(200); expect((await res.json()).jwt).toEqual(expect.any(String));
  expect(prismaMock.mobileEmailCode.updateMany).toHaveBeenCalledOnce(); expect(prismaMock.user.create.mock.calls[0][0].data).toMatchObject({ email, emailVerified: expect.any(Date) });
});
test("verify: a concurrently spent code fails; an existing user is reused, not duplicated", async () => {
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(row()); prismaMock.mobileEmailCode.updateMany.mockResolvedValue({ count: 0 });
  expect((await post(verifyPOST, { email, code: "123456" })).status).toBe(401);
  prismaMock.mobileEmailCode.updateMany.mockResolvedValue({ count: 1 }); prismaMock.user.findUnique.mockResolvedValue(user);
  expect((await post(verifyPOST, { email, code: "123456" })).status).toBe(200); expect(prismaMock.user.create).not.toHaveBeenCalled();
});
test("review account: off unless both env vars are set; fixed code works; misses are counted and lock", async () => {
  prismaMock.user.findUnique.mockResolvedValue(user);
  expect((await post(verifyPOST, { email, code: "REVIEW-CODE-1" })).status).toBe(401);
  vi.stubEnv("REVIEW_DEMO_EMAIL", email); vi.stubEnv("REVIEW_DEMO_CODE", "REVIEW-CODE-1");
  expect((await post(startPOST, { email })).status).toBe(200); expect(mail.sendEmail).not.toHaveBeenCalled();
  expect((await post(verifyPOST, { email, code: "REVIEW-CODE-1" })).status).toBe(200);
  expect((await post(verifyPOST, { email, code: "REVIEW-CODE-2" })).status).toBe(401); expect(prismaMock.mobileEmailCode.upsert.mock.calls.at(-1)![0].update.attempts).toBe(1);
  prismaMock.mobileEmailCode.findUnique.mockResolvedValue(row({ attempts: 10 })); expect((await post(verifyPOST, { email, code: "REVIEW-CODE-1" })).status).toBe(429);
});
