import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

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

// Cache only known prices. Unknown IDs must always produce a durable anomaly.
let priceCache: { key: string; expires: number; prices: Map<string, "FREE" | PaidTier> } | undefined;

export function configuredStripePrices(env: Record<string, string | undefined> = process.env) {
  const prices = new Map<string, { priceId: string; tier: PaidTier; label: string; active: boolean }>();
  for (const pair of (env.STRIPE_RETIRED_PRICE_IDS ?? "").split(",").filter((p) => p.trim())) {
    const [priceId, tier, extra] = pair.trim().split(":").map((v) => v.trim());
    if (!priceId?.startsWith("price_") || !["ESSENTIAL", "PRO"].includes(tier) || extra !== undefined) throw new Error("Invalid STRIPE_RETIRED_PRICE_IDS: expected priceId:ESSENTIAL or priceId:PRO");
    if (prices.has(priceId) && prices.get(priceId)!.tier !== tier) throw new Error("Conflicting Stripe price tiers");
    prices.set(priceId, { priceId, tier: tier as PaidTier, label: `Retired ${tier}`, active: false });
  }
  for (const tier of ["ESSENTIAL", "PRO"] as const) {
    const priceId = env[`STRIPE_PRICE_${tier}_YEARLY`]?.trim();
    if (!priceId) continue;
    if (prices.has(priceId) && prices.get(priceId)!.tier !== tier) throw new Error("Conflicting Stripe price tiers");
    prices.set(priceId, { priceId, tier, label: `${tier} yearly`, active: true });
  }
  return [...prices.values()];
}

export async function getTierForPriceId(priceId: string | null | undefined, context: { userId?: string; stripeEventId?: string } = {}): Promise<"FREE" | PaidTier> {
  const configured = configuredStripePrices();
  const key = JSON.stringify(configured);
  if (!priceCache || priceCache.key !== key || priceCache.expires <= Date.now()) {
    // Empty update preserves the historical tier even if an environment variable is misconfigured.
    for (const price of configured) await prisma.stripePriceMap.upsert({ where: { priceId: price.priceId }, create: price, update: {} });
    const rows = await prisma.stripePriceMap.findMany();
    priceCache = { key, expires: Date.now() + 60_000, prices: new Map(rows.map((p) => [p.priceId, p.tier])) };
  }
  const tier = priceId ? priceCache.prices.get(priceId) : undefined;
  if (tier) return tier;
  console.error("[billing] Unknown Stripe price", { priceId: priceId ?? null, ...context });
  await prisma.billingAnomaly.create({ data: { priceId: priceId ?? null, ...context, message: "Unknown Stripe price; entitlement is FREE" } });
  return "FREE";
}
