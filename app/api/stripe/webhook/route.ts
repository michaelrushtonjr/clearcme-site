import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, getTierForPriceId } from "@/lib/stripe";
import type { SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";

type StripeSubStatus = Stripe.Subscription.Status;

function mapStatus(status: StripeSubStatus): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAST_DUE";
    default:
      return "PAST_DUE";
  }
}

function toDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000) : null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const withLegacySubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  return typeof withLegacySubscription.subscription === "string" ? withLegacySubscription.subscription : null;
}

// Statuses that should grant paid access. A canceled/unpaid/expired
// subscription still carries its price ID, so we must NOT derive the stored
// tier from price alone — otherwise tier-based gates (compliance course choice,
// settings "paid plan") keep granting access after a cancellation. past_due is
// intentionally kept as a grace state while Stripe dunning retries.
const ENTITLING_STATUSES = new Set<StripeSubStatus>(["active", "trialing", "past_due"]);

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id ?? null;
  // Effective tier: the priced tier only while the subscription is entitling,
  // otherwise FREE so access is revoked on cancel/unpaid/expiry.
  const tier = ENTITLING_STATUSES.has(subscription.status) ? getTierForPriceId(priceId) : "FREE";
  const userId = subscription.metadata.userId;

  if (!userId) {
    const existing = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    if (!existing?.userId) return;

    await prisma.subscription.update({
      where: { userId: existing.userId },
      data: {
        tier,
        status: mapStatus(subscription.status),
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        stripeSubId: subscription.id,
        currentPeriodStart: toDate(firstItem?.current_period_start),
        currentPeriodEnd: toDate(firstItem?.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
    return;
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: mapStatus(subscription.status),
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      stripeSubId: subscription.id,
      currentPeriodStart: toDate(firstItem?.current_period_start),
      currentPeriodEnd: toDate(firstItem?.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      tier,
      status: mapStatus(subscription.status),
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      stripeSubId: subscription.id,
      currentPeriodStart: toDate(firstItem?.current_period_start),
      currentPeriodEnd: toDate(firstItem?.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? process.env.Stripe_webhook_secret;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription);
        await syncSubscription(subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { stripeSubId: subscriptionId },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (subscriptionId) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        await syncSubscription(subscription);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
