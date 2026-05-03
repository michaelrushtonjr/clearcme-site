import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripe ??= new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
    appInfo: {
      name: "ClearCME",
      version: "0.1.0",
    },
  });

  return stripe;
}

export type PaidTier = "ESSENTIAL" | "PRO";

export function getPriceIdForTier(tier: PaidTier) {
  const envKey = tier === "ESSENTIAL" ? "STRIPE_PRICE_ESSENTIAL_YEARLY" : "STRIPE_PRICE_PRO_YEARLY";
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`${envKey} is not configured`);
  }
  return priceId;
}

export function getTierForPriceId(priceId: string | null | undefined): "FREE" | PaidTier {
  if (!priceId) return "FREE";
  if (priceId === process.env.STRIPE_PRICE_ESSENTIAL_YEARLY) return "ESSENTIAL";
  if (priceId === process.env.STRIPE_PRICE_PRO_YEARLY) return "PRO";
  return "FREE";
}
