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

// Re-evaluate grace on every read, even when no further Stripe event arrives.
export function effectiveSubscriptionTier(subscription: {
  tier: Tier; status: string; paymentFailureGraceUntil?: Date | null;
} | null, now = new Date()): Tier {
  if (!subscription) return "FREE";
  if (subscription.status === "ACTIVE" || subscription.status === "TRIALING") return subscription.tier;
  if (subscription.status === "PAST_DUE" && subscription.paymentFailureGraceUntil && subscription.paymentFailureGraceUntil > now) return subscription.tier;
  return "FREE";
}

// Extraction usage is the User.extractionsUsed counter, NOT a count of
// Certificate rows: certificates are hard-deleted, so a row count would let
// upload → delete → repeat reset the free trial.
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const [subscription, user] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId }, select: { tier: true, status: true, paymentFailureGraceUntil: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, extractionsUsed: true, extractionAttempts: true },
    }),
  ]);

  const tier = effectiveSubscriptionTier(subscription);
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

// The row lock serializes the reservation count and conditional increment across
// both upload routes. Leases recover slots after a killed serverless function.
export async function reserveExtractionAttempt(userId: string): Promise<{ id: string } | NextResponse> {
  const entitlements = await getEntitlements(userId);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const now = new Date();
    const updated = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "User" SET "extractionAttempts" = "extractionAttempts" + 1
      WHERE id = ${userId} AND (${entitlements.ungated} OR (
        "extractionAttempts" < ${FREE_SCAN_ATTEMPT_LIMIT} AND
        "extractionsUsed" + (SELECT count(*) FROM "ExtractionReservation"
          WHERE "userId" = ${userId} AND "expiresAt" > ${now}) < ${FREE_EXTRACTION_LIMIT}
      )) RETURNING id`;
    if (!updated.length) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { extractionsUsed: true, extractionAttempts: true } });
      if (user && user.extractionsUsed < FREE_EXTRACTION_LIMIT && user.extractionAttempts < FREE_SCAN_ATTEMPT_LIMIT) return NextResponse.json({ error: "Your remaining free scans are in progress. Please wait for them to finish." }, { status: 429, headers: { "Retry-After": "120" } });
      const reason = (user?.extractionsUsed ?? 0) >= FREE_EXTRACTION_LIMIT ? "slots" : "attempts";
      return upgradeRequiredResponse("extraction", {}, reason);
    }
    const id = crypto.randomUUID();
    await tx.extractionReservation.create({ data: { id, userId, expiresAt: new Date(now.getTime() + 120_000) } });
    return { id };
  });
}

export async function finishExtractionAttempt(userId: string, id: string, clean: boolean): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const reservation = await tx.extractionReservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== userId) return;
    // Never accept a clean result after its lease has been reused by another scan.
    if (clean && reservation.expiresAt <= new Date()) throw new Error("Extraction reservation expired; retry the scan.");
    if (clean) await tx.user.update({ where: { id: userId }, data: { extractionsUsed: { increment: 1 } } });
    await tx.extractionReservation.delete({ where: { id } });
    await tx.extractionReservation.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
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
