import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { get } from "@vercel/blob";

export const LARGE_AUDIT_BYTES = 40 * 1024 * 1024;

export async function spoolAuditOriginals(certificates: { id: string; fileUrl: string | null }[]) {
  const directory = await mkdtemp(join(tmpdir(), "clearcme-audit-"));
  const files = new Map<string, { path: string; size: number } | null>();
  let total = 0;
  try {
    for (const [index, certificate] of certificates.entries()) {
      files.set(certificate.id, null);
      if (!certificate.fileUrl) continue;
      const path = join(directory, String(index));
      try {
        const result = await get(certificate.fileUrl, { access: "private" });
        if (!result || result.statusCode !== 200) continue;
        let size = 0;
        await pipeline(Readable.fromWeb(result.stream as import("node:stream/web").ReadableStream), new Transform({ transform(chunk, _encoding, callback) {
          size += chunk.length; total += chunk.length;
          // Leave headroom in Vercel's temporary filesystem. This fails the
          // export, rather than silently claiming oversized originals missing.
          callback(total > 256 * 1024 * 1024 ? new Error("Audit package exceeds temporary storage capacity") : null, chunk);
        } }), createWriteStream(path));
        files.set(certificate.id, { path, size });
      } catch (error) {
        await rm(path, { force: true });
        if (total > 256 * 1024 * 1024) throw error;
      }
    }
    return { files, dispose: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
}

// JSZip receives independent lazy streams for each folder copy; no file or ZIP
// is held wholesale in RAM. Files were fully read before inclusion is claimed.
export function auditFileStream(path: string) {
  return Readable.from((async function* () { yield* createReadStream(path); })());
}

export function auditDownloadToken(userId: string, url: string, filename: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ userId, url, filename, expiresAt })).toString("base64url");
  const signature = createHmac("sha256", process.env.BLOB_READ_WRITE_TOKEN!).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAuditDownload(token: string, userId: string) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  const expected = createHmac("sha256", process.env.BLOB_READ_WRITE_TOKEN).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; url: string; filename: string; expiresAt: number };
    return data.userId === userId && data.expiresAt > Date.now() ? data : null;
  } catch { return null; }
}
