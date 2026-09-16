import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({ auth: vi.fn(), mobile: vi.fn(), handleUpload: vi.fn() }));
vi.mock("@/auth", () => ({ auth: state.auth }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileUserId: state.mobile }));
vi.mock("@vercel/blob/client", () => ({ handleUpload: state.handleUpload }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { POST } from "@/app/api/certificates/upload-token/route";
const pathname = "certificates/user/incoming/12345678-1234-1234-1234-123456789012/file.pdf";
function request(path = pathname) { return new NextRequest("http://localhost/api/certificates/upload-token", { method: "POST", body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname: path } }) }); }
beforeEach(() => {
  state.auth.mockResolvedValue({ user: { id: "user" } }); state.mobile.mockResolvedValue(null);
  state.handleUpload.mockImplementation(async (options) => {
    const policy = await options.onBeforeGenerateToken(options.body.payload.pathname);
    expect(policy).toMatchObject({ maximumSizeInBytes: 10 * 1024 * 1024, allowedContentTypes: ["application/pdf", "image/jpeg", "image/png"], allowOverwrite: false });
    return { type: "blob.generate-client-token", clientToken: "mock" };
  });
});
test("upload token accepts only the authenticated user's incoming path with bounded MIME and size", async () => {
  expect((await POST(request())).status).toBe(200);
  expect((await POST(request(pathname.replace("/user/", "/other/")))).status).toBe(400);
  expect((await POST(request("certificates/user/incoming/../../private.pdf"))).status).toBe(400);
});
test("upload token supports mobile auth and rejects unauthenticated access", async () => {
  state.auth.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  state.mobile.mockResolvedValue("user"); expect((await POST(request())).status).toBe(200);
});
