-- Duplicate detection: SHA-256 of the uploaded bytes. Nullable — manual
-- entries and rows from before this column have none, and null never
-- matches a dup lookup. MUST be applied to prod before (or with) the code
-- that writes it.
ALTER TABLE "Certificate" ADD COLUMN "fileHash" TEXT;

CREATE INDEX "Certificate_userId_fileHash_idx" ON "Certificate"("userId", "fileHash");
