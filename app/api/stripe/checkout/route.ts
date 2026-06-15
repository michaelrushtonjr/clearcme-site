import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPriceIdForTier, getStripe, type PaidTier } from "@/lib/stripe";

function isPaidTier(value: unknown): value is PaidTier {
  return value === "ESSENTIAL" || value === "PRO";
}

function appUrl(req: Request) {
  return process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tier = body.tier;
  if (!isPaidTier(tier)) {
    return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      subscription: {
        select: { id: true, stripeCustomerId: true },
      },
    },
  });

  if (!user?.email) {
    return NextResponse.json({ error: "A verified email is required for checkout" }, { status: 400 });
  }

  const stripe = getStripe();
  let stripeCustomerId = user.subscription?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;

    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier: "FREE",
        status: "ACTIVE",
        stripeCustomerId,
      },
      update: { stripeCustomerId },
    });
  }

  const baseUrl = appUrl(req);
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: getPriceIdForTier(tier), quantity: 1 }],
    allow_promotion_codes: true,
    payment_method_collection: "if_required",
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
    client_reference_id: user.id,
    metadata: { userId: user.id, tier },
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  }

  return NextResponse.json({ url: checkout.url });
}
