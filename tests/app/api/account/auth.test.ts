import { prismaMock } from "../../../helpers/prisma-mock";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), cancel: vi.fn(), retrieve: vi.fn(),
  list: vi.fn(), del: vi.fn(), sendEmail: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@vercel/blob", () => ({ list: mocks.list, del: mocks.del }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ subscriptions: { cancel: mocks.cancel, retrieve: mocks.retrieve } }) }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
import { DELETE } from "@/app/api/account/route";

const secret = "account-deletion-test-secret";
const userId = "authenticated-user";
const order: string[] = [];
const account = {
  id: userId, email: "doc@example.invalid", subscription: { stripeSubId: "sub_1" },
  certificates: [{ fileUrl: "https://store.private.blob.vercel-storage.com/certificates/authenticated-user/a.pdf" }],
  accounts: [],
};

async function token(options: { secret?: string; expiration?: number; subject?: string | null } = {}) {
  const jwt = new SignJWT({}).setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(options.expiration ?? Math.floor(Date.now() / 1000) + 60);
  if (options.subject !== null) jwt.setSubject(options.subject ?? userId);
  return jwt.sign(new TextEncoder().encode(options.secret ?? secret));
}
function request(bearer?: string, body: unknown = { confirm: "DELETE", userId: "someone-else" }) {
  return new NextRequest("http://localhost/api/account", {
    method: "DELETE",
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXTAUTH_SECRET", secret);
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-blob-token");
  order.length = 0;
  mocks.auth.mockResolvedValue(null);
  mocks.cancel.mockImplementation(async () => { order.push("billing"); });
  mocks.list.mockResolvedValue({ blobs: [], hasMore: false });
  mocks.del.mockImplementation(async () => { order.push("blobs"); });
  mocks.sendEmail.mockImplementation(async () => { order.push("email"); });
  prismaMock.user.findUnique.mockResolvedValue(account);
  prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
  prismaMock.user.delete.mockImplementation(async () => { order.push("rows"); return account; });
});
afterEach(() => vi.unstubAllEnvs());

describe.each(["web session", "mobile bearer"] as const)("%s deletion", (mode) => {
  async function authenticatedRequest(body?: unknown) {
    if (mode === "web session") mocks.auth.mockResolvedValue({ user: { id: userId } });
    return request(mode === "mobile bearer" ? await token() : undefined, body);
  }

  test("deletes only the authenticated account and preserves deletion order", async () => {
    const response = await DELETE(await authenticatedRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: userId } }));
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    expect(order).toEqual(["billing", "blobs", "rows", "email"]);
    if (mode === "mobile bearer") expect(mocks.auth).not.toHaveBeenCalled();
  });

  test.each([null, {}, { confirm: "delete" }, { confirm: true }])("rejects invalid confirmation %j before deletion", async (body) => {
    const response = await DELETE(await authenticatedRequest(body));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  test("billing failure returns 502 and leaves documents and rows alone", async () => {
    mocks.cancel.mockRejectedValue(new Error("billing unavailable"));
    mocks.retrieve.mockResolvedValue({ status: "active" });
    const response = await DELETE(await authenticatedRequest());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: expect.stringContaining("couldn't cancel your subscription") });
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.del).not.toHaveBeenCalled();
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  test("storage failure returns 503 and keeps rows for retry", async () => {
    mocks.del.mockRejectedValue(new Error("storage unavailable"));
    const response = await DELETE(await authenticatedRequest());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.stringContaining("couldn't remove your stored documents") });
    expect(mocks.cancel).toHaveBeenCalledWith("sub_1");
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  test("missing account returns 404 without deleting anything", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const response = await DELETE(await authenticatedRequest());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Account not found." });
    expect(order).toEqual([]);
  });

  test("unexpected database failure retains the existing 500 response", async () => {
    prismaMock.user.delete.mockRejectedValue(new Error("database unavailable"));
    const response = await DELETE(await authenticatedRequest());
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: expect.stringContaining("Something went wrong") });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

test("missing, malformed, expired, wrongly signed, and subject-less bearer tokens cannot delete", async () => {
  for (const bearer of [undefined, "not-a-jwt", await token({ expiration: 1 }), await token({ secret: "wrong-secret" }), await token({ subject: null })]) {
    const response = await DELETE(request(bearer));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
  expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  expect(mocks.cancel).not.toHaveBeenCalled();
  expect(prismaMock.user.delete).not.toHaveBeenCalled();
});

test("a verified bearer identity takes precedence over a different web session", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "different-web-user" } });
  expect((await DELETE(request(await token()))).status).toBe(200);
  expect(mocks.auth).not.toHaveBeenCalled();
  expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
});
