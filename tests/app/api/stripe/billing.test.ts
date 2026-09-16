import { prismaMock as db } from "../../../helpers/prisma-mock";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import type { Subscription, StripePriceMap } from "@prisma/client";
const stripe = vi.hoisted(() => ({
  webhooks: { constructEvent: vi.fn() }, subscriptions: { retrieve: vi.fn() },
  customers: { create: vi.fn() }, billingPortal: { sessions: { create: vi.fn() } },
  checkout: { sessions: { create: vi.fn() } },
}));
vi.mock("stripe", () => ({ default: class { constructor() { return stripe; } } }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { configuredStripePrices, getTierForPriceId } from "@/lib/stripe";
import { NextRequest } from "next/server";
import { GET as auditExport } from "@/app/api/audit-export/route";
import { GET as certificateExport } from "@/app/api/certificates/export/route";
import { GET as brokerExport } from "@/app/api/certificates/cebroker-export/route";
import { effectiveSubscriptionTier, getEntitlements } from "@/lib/entitlements";

let prices: StripePriceMap[];
let current: Subscription | null;
let events: Set<string>;
const now = new Date("2026-09-16T12:00:00Z");
const remote = (overrides = {}) => ({
  id: "sub_current", customer: "cus_user", created: 1789000000, metadata: { userId: "user" }, status: "active",
  cancel_at_period_end: false, items: { data: [{ price: { id: "price_original" }, current_period_start: 1789000000, current_period_end: 1820000000 }] }, ...overrides,
});
function event(type = "customer.subscription.updated", object = remote(), id = "evt_one", created = now.getTime() / 1000) {
  stripe.webhooks.constructEvent.mockReturnValue({ id, type, created, data: { object } });
  return webhook(new Request("http://localhost/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "mock" }, body: "mock" }));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv("STRIPE_SECRET_KEY", "test-key"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-signature");
  vi.stubEnv("STRIPE_PRICE_ESSENTIAL_YEARLY", "price_original"); vi.stubEnv("STRIPE_PRICE_PRO_YEARLY", "price_pro"); vi.stubEnv("STRIPE_RETIRED_PRICE_IDS", "");
  prices = [{ priceId: "price_original", tier: "ESSENTIAL", label: "Founding", active: false, createdAt: now }];
  current = { id: "local", userId: "user", stripeSubId: "sub_current", stripeCustomerId: "cus_user", tier: "ESSENTIAL", status: "ACTIVE", stripeCreatedAt: new Date(1789000000000), paymentFailureGraceUntil: null } as Subscription;
  events = new Set();
  db.stripePriceMap.upsert.mockImplementation(async ({ create }) => { if (!prices.some((p) => p.priceId === create.priceId)) prices.push(create); return create; });
  db.stripePriceMap.findMany.mockImplementation(async () => prices);
  db.billingAnomaly.create.mockResolvedValue({});
  db.stripeEvent.findUnique.mockImplementation(async ({ where }) => events.has(where.stripeEventId) ? { stripeEventId: where.stripeEventId } : null);
  db.stripeEvent.create.mockImplementation(async ({ data }) => { if (events.has(data.stripeEventId)) throw { code: "P2002" }; events.add(data.stripeEventId); return data; });
  db.subscription.findUnique.mockImplementation(async ({ where }) => where.stripeSubId && current?.stripeSubId !== where.stripeSubId ? null : current);
  db.subscription.update.mockImplementation(async ({ data }) => current = { ...current, ...data } as Subscription);
  db.subscription.create.mockImplementation(async ({ data }) => current = data);
  db.$transaction.mockImplementation(async (callback) => {
    const before = current && { ...current }, receipts = new Set(events);
    try { return await callback(db); } catch (error) { current = before; events = receipts; throw error; }
  });
  stripe.subscriptions.retrieve.mockResolvedValue(remote());
  stripe.billingPortal.sessions.create.mockResolvedValue({ url: "https://billing.example.invalid/portal" });
  stripe.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.example.invalid/session" });
  db.user.findUnique.mockImplementation(async () => ({ id: "user", email: "test@example.invalid", createdAt: new Date("2026-08-01"), subscription: current }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

test("price rotation preserves founding ESSENTIAL from the database even when inactive", async () => {
  await getTierForPriceId("price_original");
  vi.stubEnv("STRIPE_PRICE_ESSENTIAL_YEARLY", "price_rotated");
  expect((await event()).status).toBe(200);
  expect(current?.tier).toBe("ESSENTIAL");
  expect(prices.map((p) => p.priceId)).toContain("price_rotated");
  expect(db.stripePriceMap.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
});
test("future retired price configuration is parsed strictly", () => {
  expect(configuredStripePrices({ STRIPE_RETIRED_PRICE_IDS: "price_old:ESSENTIAL, price_older:PRO" })).toEqual(expect.arrayContaining([expect.objectContaining({ priceId: "price_old", tier: "ESSENTIAL", active: false })]));
  expect(() => configuredStripePrices({ STRIPE_RETIRED_PRICE_IDS: "price_old:OWNER" })).toThrow();
});
test("unknown price fails closed with a logged durable anomaly", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await getTierForPriceId("price_unknown", { userId: "user", stripeEventId: "evt_unknown" })).toBe("FREE");
  expect(log).toHaveBeenCalled();
  expect(db.billingAnomaly.create).toHaveBeenCalledWith({ data: expect.objectContaining({ priceId: "price_unknown", stripeEventId: "evt_unknown" }) });
  log.mockRestore();
});
test("duplicate webhook is a no-op and never fetches or writes again", async () => {
  await event();
  expect(await (await event()).json()).toMatchObject({ duplicate: true });
  expect(stripe.subscriptions.retrieve).toHaveBeenCalledTimes(1);
  expect(db.subscription.update).toHaveBeenCalledTimes(1);
});
test("every subscription event re-fetches current Stripe state, ignoring its stale payload", async () => {
  await event("customer.subscription.paused", remote({ status: "canceled" }));
  expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_current");
  expect(current?.tier).toBe("ESSENTIAL");
  expect(db.$queryRaw).toHaveBeenCalled();
});
test("out-of-order old cancellation cannot overwrite the newer current subscription", async () => {
  const old = remote({ id: "sub_old", created: 1770000000, status: "canceled" });
  stripe.subscriptions.retrieve.mockResolvedValue(old);
  await event("customer.subscription.deleted", old);
  expect(db.subscription.update).not.toHaveBeenCalled();
  expect(current).toMatchObject({ stripeSubId: "sub_current", tier: "ESSENTIAL" });
});
test("legacy current creation time is fetched before accepting an older identity", async () => {
  current!.stripeCreatedAt = null;
  const old = remote({ id: "sub_old", created: 1770000000, status: "canceled" });
  stripe.subscriptions.retrieve.mockImplementation(async (id) => id === "sub_old" ? old : remote());
  await event("customer.subscription.deleted", old);
  expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_current");
  expect(db.subscription.update).not.toHaveBeenCalled();
});
test("failed synchronization rolls back the receipt and can retry", async () => {
  stripe.subscriptions.retrieve.mockRejectedValueOnce(new Error("mock unavailable"));
  expect((await event()).status).toBe(500); expect(events.size).toBe(0);
  expect((await event()).status).toBe(200); expect(events.has("evt_one")).toBe(true);
});
test.each(["ACTIVE", "TRIALING", "PAST_DUE"] as const)("second checkout while %s returns portal", async (status) => {
  current!.status = status;
  const response = await checkout(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: JSON.stringify({ tier: "PRO" }) }));
  expect(await response.json()).toMatchObject({ portal: true, url: "https://billing.example.invalid/portal" });
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled(); expect(stripe.customers.create).not.toHaveBeenCalled();
});
test("free customer placeholder still permits first checkout", async () => {
  current!.stripeSubId = null; current!.tier = "FREE";
  await checkout(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: JSON.stringify({ tier: "ESSENTIAL" }) }));
  expect(stripe.checkout.sessions.create).toHaveBeenCalled();
});
test("first failure starts 14-day grace, retries cannot extend it, and expiry is enforced on read", async () => {
  stripe.subscriptions.retrieve.mockResolvedValue(remote({ status: "past_due" }));
  const invoice = { customer: "cus_user", parent: { subscription_details: { subscription: "sub_current" } } };
  await event("invoice.payment_failed", invoice as never);
  expect(current?.paymentFailureGraceUntil).toEqual(new Date("2026-09-30T12:00:00Z"));
  expect((await getEntitlements("user")).tier).toBe("ESSENTIAL");
  await event("invoice.payment_failed", invoice as never, "evt_retry", now.getTime() / 1000 + 86400);
  expect(current?.paymentFailureGraceUntil).toEqual(new Date("2026-09-30T12:00:00Z"));
  vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
  expect((await getEntitlements("user")).tier).toBe("FREE");
});
test("out-of-order failed invoice cannot revoke an already recovered subscription", async () => {
  current!.paymentFailureGraceUntil = new Date("2026-09-17");
  await event("invoice.payment_failed", { customer: "cus_user", subscription: "sub_current" } as never);
  expect(current).toMatchObject({ status: "ACTIVE", tier: "ESSENTIAL", paymentFailureGraceUntil: null });
});
test.each(["CANCELED", "UNPAID", "INCOMPLETE_EXPIRED", "INCOMPLETE", "PAST_DUE"])("%s without grace is FREE", (status) => {
  expect(effectiveSubscriptionTier({ tier: "PRO", status })).toBe("FREE");
});

test("a delayed failure from a recovered invoice cannot shorten a newer delinquency", async () => {
  current!.status = "PAST_DUE";
  current!.paymentFailureGraceUntil = new Date("2026-09-30T12:00:00Z");
  stripe.subscriptions.retrieve.mockResolvedValue(remote({ status: "past_due", latest_invoice: "in_new" }));
  await event("invoice.payment_failed", { id: "in_old", customer: "cus_user", subscription: "sub_current" } as never, "evt_delayed", 1700000000);
  expect(current?.paymentFailureGraceUntil).toEqual(new Date("2026-09-30T12:00:00Z"));
});
test("a newer replacement resets the old subscription's grace and switches identity", async () => {
  current!.paymentFailureGraceUntil = new Date("2026-09-17");
  const newer = remote({ id: "sub_new", created: 1789000001 });
  stripe.subscriptions.retrieve.mockResolvedValue(newer);
  await event("customer.subscription.created", newer);
  expect(current).toMatchObject({ stripeSubId: "sub_new", paymentFailureGraceUntil: null, tier: "ESSENTIAL" });
});
test("receipt unique-key race is acknowledged only when a committed receipt exists", async () => {
  db.stripeEvent.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ stripeEventId: "evt_one" });
  db.stripeEvent.create.mockRejectedValueOnce({ code: "P2002" });
  const response = await event();
  expect(await response.json()).toMatchObject({ duplicate: true });
  expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
});

test.each([["audit", auditExport], ["certificate", certificateExport], ["broker", brokerExport]] as const)("expired grace fences the %s export before reading any certificates", async (_name, handler) => {
  current!.status = "PAST_DUE"; current!.paymentFailureGraceUntil = new Date(now.getTime() - 1);
  const response = await handler(new NextRequest("http://localhost/api/export"));
  expect(response.status).toBe(402); expect(await response.json()).toMatchObject({ error: "upgrade_required" });
  expect(db.certificate.findMany).not.toHaveBeenCalled();
});
