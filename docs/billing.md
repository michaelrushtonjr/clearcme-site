# Billing identity, price history, and lapse

`Subscription.stripeSubId` is the existing unique Stripe subscription identity. The user has one current subscription row. Webhooks update that identity, or replace it only when Stripe's subscription creation time is newer. A delayed event for an older subscription cannot revoke the current one. Missing creation times on legacy rows are resolved by retrieving the current subscription from Stripe.

Every `customer.subscription.*` event, checkout completion, and payment success/failure retrieves current Stripe state. Processing is serialized per customer and user using transaction advisory locks. The `StripeEvent` primary key is the idempotency receipt; receipt and subscription writes commit together. Failed processing returns 500 and can be retried. Unknown prices log an error and persist a `BillingAnomaly`; inspect this table during billing support. No credential values are logged.

## Price rotation

`StripePriceMap` is seeded on the first price lookup (and refreshed at most once per minute per process) from `STRIPE_PRICE_ESSENTIAL_YEARLY` and `STRIPE_PRICE_PRO_YEARLY`. Existing mappings are never overwritten or deleted. The in-process cache reads the table, including inactive/retired prices. `active` describes availability when seeded; it is not an entitlement gate. Checkout uses the current environment price for the requested tier.

Michael confirmed these are the only two prices to date. `STRIPE_RETIRED_PRICE_IDS` is currently empty. For future rotations, keep prior IDs in the table and configure `STRIPE_RETIRED_PRICE_IDS=price_old:ESSENTIAL,price_other:PRO` in every deployment that must seed a fresh database. Tier conflicts are configuration errors. Do not seed via the compliance seed script. No live Stripe or database seed is run by the offline tests.

## Founding rate and payment failure

An active/trialing founding subscription retains its historical price's tier. A past-due subscription keeps paid access until `paymentFailureGraceUntil`, 14 days after the first failed-invoice event. Later retries do not restart the clock; an earlier failure delivered late shortens it. Recovery to active/trialing clears grace. At or after the deadline, reads through `lib/entitlements.ts` return FREE even if no new webhook arrives. Canceled, unpaid, expired, and paused subscriptions have no paid access. Existing past-due rows have no verified first failure date: migration leaves grace NULL (FREE), requiring a verified invoice event or billing support reconciliation.

The founding rate dies on lapse: cancellation or exhausted payment grace ends paid entitlement. Rejoining via checkout uses the current price, never a retired founding price. This code does not alter Stripe's dunning/cancellation settings; configure Stripe to end a lapsed subscription if the commercial promise requires cancellation rather than later payment recovery. A currently past-due subscription goes to the portal instead of opening a second subscription. The pre-existing founding-free cohort exemption remains unchanged.

Schema migrations in Run B are draft SQL verified offline, not applied. Reconcile with `migrate dev` against the populated local sandbox before rollout. Retain the price map in backups and review BillingAnomaly after price configuration changes.
