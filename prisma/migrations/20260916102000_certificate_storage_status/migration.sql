CREATE TYPE "CertificateStorageStatus" AS ENUM ('STORED', 'STORE_FAILED', 'DELETED');
ALTER TABLE "Certificate" ADD COLUMN "storageStatus" "CertificateStorageStatus" NOT NULL DEFAULT 'STORE_FAILED';
UPDATE "Certificate" SET "storageStatus" = 'STORED' WHERE "fileUrl" IS NOT NULL;
-- STORED records prior upload success, not current availability. Exports verify reads.
