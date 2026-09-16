ALTER TABLE "Subscription" ADD COLUMN "stripeCreatedAt" TIMESTAMP(3), ADD COLUMN "paymentFailureGraceUntil" TIMESTAMP(3);
CREATE TABLE "StripePriceMap" (
  "priceId" TEXT PRIMARY KEY, "tier" "SubscriptionTier" NOT NULL,
  "label" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "BillingAnomaly" (
  "id" TEXT PRIMARY KEY, "priceId" TEXT, "stripeEventId" TEXT, "userId" TEXT,
  "message" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BillingAnomaly_createdAt_idx" ON "BillingAnomaly"("createdAt");
CREATE TABLE "StripeEvent" (
  "stripeEventId" TEXT PRIMARY KEY, "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Environment-specific price IDs are seeded lazily by lib/stripe.ts, never embedded in SQL.
-- Existing PAST_DUE rows have no verified first failure date: NULL grace fails closed.
