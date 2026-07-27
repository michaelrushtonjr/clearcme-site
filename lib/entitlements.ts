import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type Tier = "FREE" | "ESSENTIAL" | "PRO";

export const FREE_EXTRACTION_LIMIT = 3;

export const LICENSE_LIMIT: Record<Tier, number> = {
  FREE: 1,
  ESSENTIAL: 2,
  PRO: Number.POSITIVE_INFINITY,
};

// Grandfathering: anyone who signed up while the product was ungated keeps
// ungated behavior (the "grandfather fully" option from the tier-fence spec).
// Set to the production deploy timestamp of the fences — users created before
// this moment bypass the export/extraction/license gates.
export const FOUNDING_FREE_CUTOFF = new Date("2026-07-27T10:55:00Z");

export interface Entitlements {
  tier: Tier;
  paid: boolean;
  grandfathered: boolean;
  /** Paid or grandfathered — bypasses the export and extraction fences. */
  ungated: boolean;
  licenseLimit: number;
  /** Lifetime AI extractions that produced data — see User.extractionsUsed. */
  extractionsUsed: number;
}

// Subscription.tier is already the *effective* tier: the Stripe webhook
// (c3a7246) writes FREE whenever the subscription status stops entitling,
// so no status re-check is needed here.
//
// Extraction usage is the User.extractionsUsed counter, NOT a count of
// Certificate rows: certificates are hard-deleted, so a row count would let
// upload → delete → repeat reset the free trial.
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const [subscription, user] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId }, select: { tier: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, extractionsUsed: true },
    }),
  ]);

  const tier = (subscription?.tier as Tier) ?? "FREE";
  const paid = tier === "ESSENTIAL" || tier === "PRO";
  const grandfathered = !paid && user != null && user.createdAt < FOUNDING_FREE_CUTOFF;

  return {
    tier,
    paid,
    grandfathered,
    ungated: paid || grandfathered,
    licenseLimit: grandfathered ? Number.POSITIVE_INFINITY : LICENSE_LIMIT[tier],
    extractionsUsed: user?.extractionsUsed ?? 0,
  };
}

// Call after an extraction produced data (COMPLETED / NEEDS_REVIEW / partial).
// FAILED extractions must NOT be recorded — a physician shouldn't burn a free
// slot on our parser failing.
export async function recordExtractionUse(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { extractionsUsed: { increment: 1 } },
  });
}

export type FencedFeature = "export" | "extraction" | "licenses";

function upgradeMessage(feature: FencedFeature, limit?: number): string {
  switch (feature) {
    case "export":
      return "Audit-ready export is part of Essential. Your compliance map and course matches stay free — export packages everything into a single file your board or employer will accept. Founding rate: $99/year.";
    case "extraction":
      return `You've used your ${FREE_EXTRACTION_LIMIT} free certificate extractions. You can still add CME manually, as much as you like — Essential reads certificates for you. Founding rate: $99/year.`;
    case "licenses":
      return limit === 2
        ? "Essential covers two state licenses. Pro tracks as many as you hold."
        : "Free covers one state license. Essential tracks two; Pro covers as many as you hold.";
  }
}

// 402, not 403: the client needs to distinguish "upgrade to unlock" from
// "not allowed", and render it as an upgrade prompt rather than an error.
export function upgradeRequiredResponse(
  feature: FencedFeature,
  extra: Record<string, number> = {}
): NextResponse {
  const limit = "limit" in extra ? extra.limit : undefined;
  return NextResponse.json(
    { error: "upgrade_required", feature, message: upgradeMessage(feature, limit), ...extra },
    { status: 402 }
  );
}
