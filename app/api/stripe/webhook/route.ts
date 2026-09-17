import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, getTierForPriceId } from "@/lib/stripe";
import { effectiveSubscriptionTier } from "@/lib/entitlements";
import type { Prisma, SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";
const GRACE_MS = 14 * 24 * 60 * 60 * 1000;

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active": return "ACTIVE";
    case "trialing": return "TRIALING";
    case "past_due": return "PAST_DUE";
    case "canceled": return "CANCELED";
    case "incomplete": return "INCOMPLETE";
    case "incomplete_expired": return "INCOMPLETE_EXPIRED";
    default: return "UNPAID"; // Paused/unknown states must not grant access.
  }
}
const toDate = (timestamp: number | null | undefined) => timestamp == null ? null : new Date(timestamp * 1000);
const objectId = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id;

function subscriptionIdForEvent(event: Stripe.Event): string | undefined {
  if (event.type.startsWith("customer.subscription.")) return (event.data.object as Stripe.Subscription).id;
  if (event.type === "checkout.session.completed") return objectId((event.data.object as Stripe.Checkout.Session).subscription);
  if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
    return objectId(invoice.parent?.subscription_details?.subscription) ?? objectId(invoice.subscription);
  }
}

async function syncSubscription(tx: Prisma.TransactionClient, subscription: Stripe.Subscription, event: Stripe.Event) {
  const customerId = objectId(subscription.customer)!;
  let byId = await tx.subscription.findUnique({ where: { stripeSubId: subscription.id } });
  const userId = byId?.userId ?? subscription.metadata.userId ?? (await tx.subscription.findUnique({ where: { stripeCustomerId: customerId } }))?.userId;
  if (!userId) throw new Error("Stripe subscription has no known user");
  // Account deletion cancels in Stripe and then removes the user, so the
  // resulting subscription.deleted event has nobody to sync to. Acknowledge it.
  if (!byId && !(await tx.user.findUnique({ where: { id: userId }, select: { id: true } }))) return;
  // A customer can change after a recovery/recreated checkout. Serialize the
  // current-user pointer too, before comparing creation times or replacing it.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`billing-user:${userId}`}, 0))`;
  byId = await tx.subscription.findUnique({ where: { stripeSubId: subscription.id } });
  const current = byId ?? await tx.subscription.findUnique({ where: { userId } });

  if (current?.stripeSubId && current.stripeSubId !== subscription.id) {
    // Legacy rows have no creation timestamp. Retrieve the current identity;
    // never compare event timestamps or local row creation dates.
    const currentCreated = current.stripeCreatedAt ?? toDate((await getStripe().subscriptions.retrieve(current.stripeSubId)).created)!;
    if (subscription.created * 1000 <= currentCreated.getTime()) return;
  }

  const sameSubscription = current?.stripeSubId === subscription.id;
  const status = mapStatus(subscription.status);
  let paymentFailureGraceUntil = sameSubscription ? current.paymentFailureGraceUntil : null;
  if (status === "ACTIVE" || status === "TRIALING") paymentFailureGraceUntil = null;
  const failedInvoiceIsCurrent = event.type === "invoice.payment_failed"
    && (!subscription.latest_invoice || objectId(subscription.latest_invoice) === event.data.object.id);
  if (status === "PAST_DUE" && failedInvoiceIsCurrent) {
    // Earliest failed invoice wins, including a delayed first failure. Retries
    // cannot extend grace. A stale failure while Stripe is active does nothing.
    const candidate = new Date(event.created * 1000 + GRACE_MS);
    if (!paymentFailureGraceUntil || candidate < paymentFailureGraceUntil) paymentFailureGraceUntil = candidate;
  }
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const pricedTier = await getTierForPriceId(priceId, { userId, stripeEventId: event.id });
  const tier = effectiveSubscriptionTier({ tier: pricedTier, status, paymentFailureGraceUntil });
  const data = {
    tier, status, paymentFailureGraceUntil,
    stripeCustomerId: customerId, stripePriceId: priceId, stripeSubId: subscription.id,
    stripeCreatedAt: toDate(subscription.created),
    currentPeriodStart: toDate(item?.current_period_start), currentPeriodEnd: toDate(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
  if (byId) await tx.subscription.update({ where: { stripeSubId: subscription.id }, data });
  else if (current) await tx.subscription.update({ where: { id: current.id }, data });
  else await tx.subscription.create({ data: { userId, ...data } });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? process.env.Stripe_webhook_secret;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (await prisma.stripeEvent.findUnique({ where: { stripeEventId: event.id } })) return NextResponse.json({ received: true, duplicate: true });
  try {
    await prisma.$transaction(async (tx) => {
      // Claim and effects commit together. A failed fetch/write rolls the claim
      // back, allowing Stripe to retry; the unique key handles concurrent retries.
      await tx.stripeEvent.create({ data: { stripeEventId: event.id, type: event.type } });
      const id = subscriptionIdForEvent(event);
      if (!id) return;
      const customerId = objectId((event.data.object as { customer?: string | { id: string } | null }).customer);
      if (!customerId) throw new Error("Stripe event has no customer");
      // Serialize per customer, then fetch current Stripe state *inside* the
      // lock so a slow earlier request cannot overwrite a later snapshot.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${customerId}, 0))`;
      const subscription = await getStripe().subscriptions.retrieve(id);
      await syncSubscription(tx, subscription, event);
    }, { timeout: 30_000 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002" && await prisma.stripeEvent.findUnique({ where: { stripeEventId: event.id } })) return NextResponse.json({ received: true, duplicate: true });
    console.error("[billing] Stripe event processing failed", { stripeEventId: event.id });
    return NextResponse.json({ error: "Billing synchronization failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
