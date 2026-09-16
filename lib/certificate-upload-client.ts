"use client";

import { upload } from "@vercel/blob/client";
import { MAX_CERTIFICATE_BYTES, MAX_MULTIPART_BYTES } from "@/lib/upload-limits";

export async function downscaleCertificateImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare certificate photo");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Unable to resize photo")), "image/jpeg", 0.85));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadCertificate(original: File, userId: string): Promise<Response> {
  const file = await downscaleCertificateImage(original);
  if (file.size > MAX_CERTIFICATE_BYTES) throw new Error("File too large. Maximum 10 MB.");
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "certificate";
  let blobUrl: string;
  try {
    const blob = await upload(`certificates/${encodeURIComponent(userId)}/incoming/${crypto.randomUUID()}/${name}.${extension}`, file, {
      access: "private", handleUploadUrl: "/api/certificates/upload-token", contentType: file.type,
    });
    blobUrl = blob.url;
  } catch {
    if (file.size > MAX_MULTIPART_BYTES) throw new Error("Direct upload is unavailable. Try again, or choose a file under 4 MB for the fallback upload.");
    const form = new FormData(); form.set("file", file);
    return fetch("/api/certificates", { method: "POST", body: form });
  }
  // Do not repeat an extraction via multipart if this POST times out: it may
  // already have succeeded. A deliberate retry is deduplicated by SHA-256.
  return fetch("/api/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blobUrl, sha256 }) });
}
