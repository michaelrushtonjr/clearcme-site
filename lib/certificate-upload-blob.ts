import { get } from "@vercel/blob";
import { createHash } from "node:crypto";
import { CertificateFileError } from "@/lib/certificate-storage";
import { CERTIFICATE_CONTENT_TYPES, MAX_CERTIFICATE_BYTES } from "@/lib/upload-limits";

export function validIncomingPath(pathname: string, userId: string): boolean {
  const prefix = `certificates/${encodeURIComponent(userId)}/incoming/`;
  return pathname.startsWith(prefix) && /^[a-f0-9-]{36}\/[a-zA-Z0-9_-]{1,100}\.(pdf|jpg|jpeg|png)$/.test(pathname.slice(prefix.length));
}

export async function readClientCertificate(body: Record<string, unknown>, userId: string): Promise<{ file: File; blobUrl: string }> {
  if (typeof body.blobUrl !== "string" || typeof body.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(body.sha256)) throw new CertificateFileError("Invalid upload or SHA-256", 400);
  let url: URL;
  try { url = new URL(body.blobUrl); } catch { throw new CertificateFileError("Invalid blob URL", 400); }
  if (url.protocol !== "https:" || !/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(url.hostname) || url.port || url.username || url.password || url.search || url.hash || !validIncomingPath(url.pathname.slice(1), userId)) throw new CertificateFileError("Invalid blob ownership", 403);
  // Read by pathname from OUR configured private store, never fetch a supplied host.
  const result = await get(url.pathname.slice(1), { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || result.blob.url !== url.href) throw new CertificateFileError("Uploaded file not found", 404);
  if (!CERTIFICATE_CONTENT_TYPES.includes(result.blob.contentType) || result.blob.size > MAX_CERTIFICATE_BYTES) {
    await result.stream.cancel();
    throw new CertificateFileError("Invalid file type or file exceeds 10 MB", 400);
  }
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_CERTIFICATE_BYTES) throw new CertificateFileError("File exceeds 10 MB", 400);
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  if (createHash("sha256").update(bytes).digest("hex") !== body.sha256) throw new CertificateFileError("Uploaded file hash does not match. Please upload again.", 400);
  return { file: new File([bytes], url.pathname.split("/").pop()!, { type: result.blob.contentType }), blobUrl: url.href };
}
