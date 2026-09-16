BEGIN;
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
ALTER TABLE "EmailLog"
  ADD COLUMN "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'SENT',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "cycleKey" TEXT,
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3);
-- Retain historical dedupe protection. Legacy rows have no delivery receipt;
-- an operator must reconcile suspected pre-send crashes against provider logs.
UPDATE "EmailLog" SET "cycleKey" = CASE
  WHEN "dedupeKey" LIKE 'renewal:%' THEN split_part("dedupeKey", ':', 2) || ':' || split_part("dedupeKey", ':', 4)
  ELSE "dedupeKey" END, "lastAttemptAt" = "sentAt";
ALTER TABLE "EmailLog" ALTER COLUMN "cycleKey" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'PENDING',
  ALTER COLUMN "attempts" SET DEFAULT 0,
  ALTER COLUMN "sentAt" DROP NOT NULL,
  ALTER COLUMN "sentAt" DROP DEFAULT;
COMMIT;
