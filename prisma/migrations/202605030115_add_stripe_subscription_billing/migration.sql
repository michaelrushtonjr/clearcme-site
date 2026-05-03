-- Add Stripe-backed subscription tiers/statuses and lookup constraints.
-- Existing columns were created earlier as placeholders; this migration makes them production billing-ready.

ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'ESSENTIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'INCOMPLETE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'INCOMPLETE_EXPIRED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'UNPAID';

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubId_key" ON "Subscription"("stripeSubId");
