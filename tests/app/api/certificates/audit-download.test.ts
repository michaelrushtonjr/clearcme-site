import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { auditDownloadToken } from "@/lib/audit-export-storage";
const boundary = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), entitlement: vi.fn() }));
vi.mock("@/auth", () => ({ auth: boundary.auth }));
vi.mock("@vercel/blob", () => ({ get: boundary.get }));
vi.mock("@/lib/entitlements", () => ({ getEntitlements: boundary.entitlement, upgradeRequiredResponse: () => new Response("{}", { status: 402 }) }));
import { GET } from "@/app/api/audit-export/download/route";
const request = (user = "user", expiresAt = Date.now() + 60000) => new NextRequest(`http://localhost/api/audit-export/download?token=${auditDownloadToken(user, "https://private.invalid/audit.zip", "audit.zip", expiresAt)}`);
beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-signature"); boundary.auth.mockResolvedValue({ user: { id: "user" } });
  boundary.entitlement.mockResolvedValue({ ungated: true }); boundary.get.mockResolvedValue({ statusCode: 200, stream: new Response("zip-stream").body });
});
afterEach(() => vi.unstubAllEnvs());
test("large ZIP download streams privately only to its authenticated owner", async () => {
  const response = await GET(request()); expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(await response.text()).toBe("zip-stream");
  expect(boundary.get).toHaveBeenCalledWith("https://private.invalid/audit.zip", { access: "private" });
});
test("expired, cross-user, anonymous and downgraded downloads cannot read the blob", async () => {
  expect((await GET(request("someone-else"))).status).toBe(403);
  expect((await GET(request("user", Date.now() - 1))).status).toBe(403);
  boundary.auth.mockResolvedValue(null); expect((await GET(request())).status).toBe(401);
  boundary.auth.mockResolvedValue({ user: { id: "user" } }); boundary.entitlement.mockResolvedValue({ ungated: false });
  expect((await GET(request())).status).toBe(402); expect(boundary.get).not.toHaveBeenCalled();
});
