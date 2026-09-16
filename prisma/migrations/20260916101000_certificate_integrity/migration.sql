BEGIN;
-- Refuse pre-existing duplicate bytes; never silently delete or rewrite evidence.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Certificate" WHERE "fileHash" IS NOT NULL GROUP BY "userId", "fileHash" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate certificate file hashes require reviewed resolution before migration';
  END IF;
END $$;
ALTER TABLE "Certificate" ADD COLUMN "hoursEarned" DOUBLE PRECISION,
  ADD COLUMN "activityMaxHours" DOUBLE PRECISION,
  ADD COLUMN "activityFingerprint" TEXT,
  ADD COLUMN "possibleDuplicateOfId" TEXT;
DROP INDEX "Certificate_userId_fileHash_idx";
CREATE UNIQUE INDEX "Certificate_userId_fileHash_key" ON "Certificate"("userId", "fileHash");
CREATE INDEX "Certificate_userId_activityFingerprint_idx" ON "Certificate"("userId", "activityFingerprint");
-- Existing hours are untouched. No assertion that historical creditHours were earned.
COMMIT;
