import { createHash } from "node:crypto";
import { del, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { lockCertificateUser } from "@/lib/certificate-duplicates";

export class CertificateFileError extends Error {
  constructor(message: string, public status: number, public certificateId?: string) { super(message); }
}

export async function storeCertificateOriginal(id: string, userId: string, file: File) {
  if (!["application/pdf", "image/jpeg", "image/png", "image/jpg"].includes(file.type)) throw new CertificateFileError("Invalid file type. Accepts PDF, JPG, PNG.", 400);
  if (file.size > 10 * 1024 * 1024) throw new CertificateFileError("File too large. Maximum 10MB.", 400);
  const fileHash = createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
  let uploadedUrl: string | undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      await lockCertificateUser(tx, userId);
      const existing = await tx.certificate.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) throw new CertificateFileError("Not found", 404);
      if (existing.fileUrl) throw new CertificateFileError("This certificate already has a stored document.", 409);
      if (existing.fileHash && existing.fileHash !== fileHash) throw new CertificateFileError("The file does not match the original certificate. Re-attach the original file.", 409);
      const duplicate = await tx.certificate.findFirst({ where: { userId, fileHash, id: { not: id } }, select: { id: true } });
      if (duplicate) throw new CertificateFileError("This exact file is already attached to another certificate.", 409, duplicate.id);
      if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CertificateFileError("Document storage is not available right now. Please try again later.", 503);
      const blob = await put(`certificates/${userId}/${file.name}`, file, { access: "private", addRandomSuffix: true });
      uploadedUrl = blob.url;
      return tx.certificate.update({ where: { id }, data: { fileUrl: blob.url, fileName: file.name, fileSize: file.size, mimeType: file.type, fileHash, storageStatus: "STORED" } });
    }, { timeout: 30_000 });
  } catch (error) {
    if (uploadedUrl) {
      try { await del(uploadedUrl); }
      catch { console.error("[certificates] Failed to clean up original after row write failure", { certificateId: id }); }
    }
    throw error;
  }
}

// Blob deletion precedes row deletion. If the latter fails, persist the absence
// of the original separately, because a failed SQL transaction cannot commit it.
export async function deleteCertificateOriginalAndRow(id: string, userId: string, merge = false) {
  let removedUrl: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      await lockCertificateUser(tx, userId);
      const existing = await tx.certificate.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) throw new CertificateFileError("Not found", 404);
      if (merge) {
        const target = existing.possibleDuplicateOfId ? await tx.certificate.findUnique({ where: { id: existing.possibleDuplicateOfId } }) : null;
        if (!target || target.userId !== userId) throw new CertificateFileError("The original certificate is no longer available. Choose keep both to retain this entry.", 409);
        if (!target.fileUrl && existing.fileUrl) {
          // Merge retains the only original instead of deleting it. Release the
          // unique hash on the duplicate then move it to the surviving row in
          // the same transaction; rollback restores both on any DB failure.
          await tx.certificate.delete({ where: { id } });
          await tx.certificate.update({ where: { id: target.id }, data: {
            fileUrl: existing.fileUrl, fileHash: existing.fileHash,
            fileName: existing.fileName, fileSize: existing.fileSize, mimeType: existing.mimeType,
            storageStatus: "STORED",
          } });
          return;
        }
      }
      if (existing.fileUrl) {
        await del(existing.fileUrl);
        removedUrl = existing.fileUrl;
      }
      await tx.certificate.delete({ where: { id } });
    }, { timeout: 30_000 });
  } catch (error) {
    if (removedUrl) {
      try {
        await prisma.certificate.updateMany({ where: { id, userId, fileUrl: removedUrl }, data: { fileUrl: null, storageStatus: "DELETED" } });
      } catch { console.error("[certificates] Could not record deleted original; database recovery required", { certificateId: id }); }
    }
    throw error;
  }
}
