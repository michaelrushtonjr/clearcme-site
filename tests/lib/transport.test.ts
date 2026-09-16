import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { deflateSync } from "node:zlib";
import { boundedInflate, DecompressionLimitError, MAX_INFLATED_BYTES } from "@/lib/bounded-inflate";
import { limitCertificateUpload } from "@/lib/upload-rate-limit";
import { auditDownloadToken, verifyAuditDownload } from "@/lib/audit-export-storage";
import { downscaleCertificateImage, uploadCertificate } from "@/lib/certificate-upload-client";
const blob = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@vercel/blob/client", () => blob);

beforeEach(() => vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-signing-key"));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test("streaming inflate enforces a shared 25 MB budget across PDF objects", async () => {
  const budget = { remaining: MAX_INFLATED_BYTES };
  const compressed = deflateSync(Buffer.alloc(13 * 1024 * 1024, 65));
  expect((await boundedInflate(compressed, budget)).length).toBe(13 * 1024 * 1024);
  await expect(boundedInflate(compressed, budget)).rejects.toBeInstanceOf(DecompressionLimitError);
});
test("in-process rate limit allows ten requests and then resets per user", async () => {
  for (let i = 0; i < 10; i++) expect(limitCertificateUpload("rate-user", 1000)).toBeNull();
  const blocked = limitCertificateUpload("rate-user", 1000)!;
  expect(blocked.status).toBe(429); expect(blocked.headers.get("Retry-After")).toBe("60");
  expect(limitCertificateUpload("another-user", 1000)).toBeNull();
  expect(limitCertificateUpload("rate-user", 61000)).toBeNull();
});
test("private ZIP link rejects tampering, another user, and expiry", () => {
  const token = auditDownloadToken("u", "https://private.invalid/archive", "audit.zip", Date.now() + 50000);
  expect(verifyAuditDownload(token, "u")?.filename).toBe("audit.zip");
  expect(verifyAuditDownload(token, "other")).toBeNull();
  expect(verifyAuditDownload(`x${token}`, "u")).toBeNull();
  expect(verifyAuditDownload(auditDownloadToken("u", "url", "audit.zip", Date.now() - 1), "u")).toBeNull();
});
test("camera image uses a 2000 px long edge and JPEG quality 0.85", async () => {
  const context = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: "" };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: vi.fn((callback) => callback(new Blob(["smaller"], { type: "image/jpeg" }))) };
  vi.stubGlobal("Image", class { src = ""; naturalWidth = 4000; naturalHeight = 3000; decode = async () => {}; });
  vi.stubGlobal("document", { createElement: () => canvas });
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  const result = await downscaleCertificateImage(new File(["big"], "photo.png", { type: "image/png" }));
  expect(canvas.width).toBe(2000); expect(canvas.height).toBe(1500);
  expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.85);
  expect(result.type).toBe("image/jpeg"); expect(result.name).toBe("photo.jpg"); expect(revoke).toHaveBeenCalled();
});
test("direct client upload sends private bytes followed by a SHA-256 JSON extraction request", async () => {
  blob.upload.mockResolvedValue({ url: "https://test.private.blob.vercel-storage.com/file.pdf" });
  vi.mocked(fetch).mockResolvedValue(new Response("{}"));
  await uploadCertificate(new File(["hello"], "scan.pdf", { type: "application/pdf" }), "u");
  expect(blob.upload).toHaveBeenCalledWith(expect.stringMatching(/^certificates\/u\/incoming\//), expect.any(File), expect.objectContaining({ access: "private", handleUploadUrl: "/api/certificates/upload-token" }));
  const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(body.sha256).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  expect(body.blobUrl).toContain("private.blob");
});
test("token failure falls back only below 4 MB; extraction failure never submits multipart again", async () => {
  blob.upload.mockRejectedValue(new Error("token unavailable"));
  vi.mocked(fetch).mockResolvedValue(new Response("{}"));
  await uploadCertificate(new File(["pdf"], "small.pdf", { type: "application/pdf" }), "u");
  expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBeInstanceOf(FormData);
  await expect(uploadCertificate(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" }), "u")).rejects.toThrow("under 4 MB");
  expect(fetch).toHaveBeenCalledTimes(1);
  blob.upload.mockResolvedValue({ url: "https://private.invalid/file.pdf" });
  vi.mocked(fetch).mockRejectedValue(new Error("extraction connection lost"));
  await expect(uploadCertificate(new File(["pdf"], "small.pdf", { type: "application/pdf" }), "u")).rejects.toThrow("connection lost");
  expect(fetch).toHaveBeenCalledTimes(2);
});
