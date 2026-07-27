import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type Tier = "FREE" | "ESSENTIAL" | "PRO";

export const FREE_EXTRACTION_LIMIT = 3;

// Backstop on total scans (any outcome). Imperfect scans don't burn a trial
// slot, so without this a stack of bad scans could generate unlimited
// Anthropic calls on a free account.
export const FREE_SCAN_ATTEMPT_LIMIT = 10;

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
  /** Lifetime clean full-confidence extractions — see User.extractionsUsed. */
  extractionsUsed: number;
  /** Lifetime scans attempted, any outcome — see User.extractionAttempts. */
  extractionAttempts: number;
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
      select: { createdAt: true, extractionsUsed: true, extractionAttempts: true },
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
    extractionAttempts: user?.extractionAttempts ?? 0,
  };
}

// Call once per scan that runs, before the outcome is known — every attempt
// spends the extraction work, so every attempt counts toward the backstop.
export async function recordExtractionAttempt(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { extractionAttempts: { increment: 1 } },
  });
}

// Call only when extraction came back clean at full confidence. Imperfect
// (NEEDS_REVIEW / partial) and FAILED extractions must NOT consume a trial
// slot — a physician shouldn't burn one on a scan they had to fix by hand.
export async function recordExtractionUse(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { extractionsUsed: { increment: 1 } },
  });
}

export type FencedFeature = "export" | "extraction" | "licenses";
/** For feature "extraction": which limit blocked — trial slots or the scan backstop. */
export type ExtractionBlockReason = "slots" | "attempts";

function upgradeMessage(
  feature: FencedFeature,
  limit?: number,
  reason?: ExtractionBlockReason
): string {
  switch (feature) {
    case "export":
      return "Audit-ready export is part of Essential. Your compliance map and course matches stay free — export packages everything into a single file your board or employer will accept. Founding rate: $99/year.";
    case "extraction":
      return reason === "attempts"
        ? `Free includes ${FREE_SCAN_ATTEMPT_LIMIT} certificate scans, and you've used them. You can still add CME manually, as much as you like — Essential scans unlimited certificates. Founding rate: $99/year.`
        : `You've used your ${FREE_EXTRACTION_LIMIT} free certificate extractions. You can still add CME manually, as much as you like — Essential reads certificates for you. Founding rate: $99/year.`;
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
  extra: Record<string, number> = {},
  reason?: ExtractionBlockReason
): NextResponse {
  const limit = "limit" in extra ? extra.limit : undefined;
  return NextResponse.json(
    {
      error: "upgrade_required",
      feature,
      ...(reason ? { reason } : {}),
      message: upgradeMessage(feature, limit, reason),
      ...extra,
    },
    { status: 402 }
  );
}
