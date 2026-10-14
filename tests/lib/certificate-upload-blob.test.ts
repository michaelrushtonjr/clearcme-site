import { createHash } from "node:crypto";
import { beforeEach, expect, test, vi } from "vitest";
import "../helpers/prisma-mock";

const blobs = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@vercel/blob", () => blobs);
import { readClientCertificate } from "@/lib/certificate-upload-blob";

const pathname = "certificates/user/incoming/12345678-1234-1234-1234-123456789012/QA.pdf";
const blobUrl = `https://teststore.private.blob.vercel-storage.com/${pathname}`;
const bytes = Buffer.from("QA-only certificate bytes");
const body = { blobUrl, sha256: createHash("sha256").update(bytes).digest("hex") };
const cancel = vi.fn<() => void>();

beforeEach(() => {
  cancel.mockReset();
  blobs.get.mockImplementation(async () => ({
    statusCode: 200,
    blob: { url: blobUrl, contentType: "application/pdf", size: bytes.length },
    stream: new ReadableStream({ start(controller) { controller.enqueue(bytes); }, cancel }),
  }));
});

test("accepts SDK store-host casing without changing the requested path or hash", async () => {
  blobs.get.mockResolvedValueOnce({
    statusCode: 200,
    blob: { url: blobUrl.replace("teststore", "TestStore"), contentType: "application/pdf", size: bytes.length },
    stream: new Blob([bytes]).stream(),
  });
  const result = await readClientCertificate(body, "user");
  expect(result.blobUrl).toBe(blobUrl);
  expect(result.file.name).toBe("QA.pdf");
  expect(Buffer.from(await result.file.arrayBuffer())).toEqual(bytes);
  expect(blobs.get).toHaveBeenCalledWith(pathname, { access: "private", useCache: false });
});

test.each([
  blobUrl.replace("teststore", "anotherstore"),
  blobUrl.replace("QA.pdf", "qa.pdf"),
  blobUrl.replace("/user/", "/other/"),
  "not a URL",
])("rejects a different or malformed store result and closes its stream: %s", async (returnedUrl) => {
  const result = await blobs.get();
  result.blob.url = returnedUrl;
  blobs.get.mockResolvedValueOnce(result);
  await expect(readClientCertificate(body, "user")).rejects.toMatchObject({ status: 404 });
  expect(cancel).toHaveBeenCalledOnce();
});

test.each([
  blobUrl.replace("/user/", "/other/"),
  blobUrl.replace("https:", "http:"),
  blobUrl.replace("teststore.private.blob.vercel-storage.com", "attacker.invalid"),
  `${blobUrl}?token=untrusted`,
])("rejects invalid client ownership before reading storage: %s", async (url) => {
  await expect(readClientCertificate({ ...body, blobUrl: url }, "user")).rejects.toMatchObject({ status: 403 });
  expect(blobs.get).not.toHaveBeenCalled();
});

test("still rejects altered bytes after URL normalization", async () => {
  blobs.get.mockResolvedValueOnce({
    statusCode: 200,
    blob: { url: blobUrl.replace("teststore", "TestStore"), contentType: "application/pdf", size: bytes.length },
    stream: new Blob([bytes]).stream(),
  });
  await expect(readClientCertificate({ ...body, sha256: "0".repeat(64) }, "user"))
    .rejects.toMatchObject({ status: 400, message: expect.stringContaining("hash does not match") });
});
