BEGIN;
-- Additive only: backs the iOS app's email sign-in codes. No existing table is touched.
CREATE TABLE "MobileEmailCode" (
  email TEXT NOT NULL PRIMARY KEY,
  "codeHash" TEXT NOT NULL,
  expires TIMESTAMP(3) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  "sendCount" INTEGER NOT NULL DEFAULT 1,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
