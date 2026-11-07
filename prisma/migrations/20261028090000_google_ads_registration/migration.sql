-- Additive, consent-gated delivery outbox. No account/compliance data is sent.
CREATE TABLE "GoogleAdsRegistration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "consentId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "clickCiphertext" TEXT NOT NULL,
  "registeredAt" TIMESTAMP(3) NOT NULL,
  "availableAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "requestId" TEXT,
  "lockedUntil" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  CONSTRAINT "GoogleAdsRegistration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GoogleAdsRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GoogleAdsRegistration_userId_key" ON "GoogleAdsRegistration"("userId");
CREATE INDEX "GoogleAdsRegistration_availableAt_deliveredAt_idx" ON "GoogleAdsRegistration"("availableAt", "deliveredAt");
CREATE INDEX "GoogleAdsRegistration_consentId_idx" ON "GoogleAdsRegistration"("consentId");
