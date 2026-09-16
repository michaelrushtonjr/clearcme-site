CREATE TABLE "ExtractionReservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ExtractionReservation_userId_expiresAt_idx" ON "ExtractionReservation"("userId", "expiresAt");
