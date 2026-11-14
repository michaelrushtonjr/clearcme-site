/**
 * The one list of what each plan includes. The home-page price cards and
 * /pricing both render from here, so the two tables cannot disagree.
 *
 * Only what the product does today belongs in this file. Before adding a
 * line, find the code that delivers it:
 *   - license counts and certificate reads: LICENSE_LIMIT and
 *     FREE_EXTRACTION_LIMIT in lib/entitlements.ts (tests/lib/plan-features.test.ts
 *     fails if the numbers here drift from those);
 *   - exports: the paid-only routes app/api/audit-export (ZIP) and
 *     app/api/certificates/cebroker-export (CE Broker file);
 *   - reminders: app/api/cron/renewal-reminders, sent on every plan.
 *
 * No server imports here: both price tables are client components.
 */

export type PlanId = "free" | "essential" | "pro";

export const PLAN_LIMITS = {
  freeLicenses: 1,
  freeCertificateReads: 3,
  essentialLicenses: 2,
} as const;

export type Plan = {
  id: PlanId;
  name: string;
  /** Dollar amount shown large on the card, e.g. "$99". */
  price: string;
  /** What follows the amount: "forever" or "/year". */
  per: string;
  /** One sentence under the price. */
  summary: string;
  features: string[];
};

const REMINDERS = "Renewal reminders by email";

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    per: "forever",
    summary: "See what your state requires and what you still owe. No credit card.",
    features: [
      `${PLAN_LIMITS.freeLicenses} state license`,
      `${PLAN_LIMITS.freeCertificateReads} certificates read for you (PDF or photo)`,
      "Unlimited manual entry",
      "Course matches for each gap",
      "DEA MATE Act training record",
      REMINDERS,
    ],
  },
  essential: {
    id: "essential",
    name: "Essential",
    price: "$99",
    per: "/year",
    summary: "Everything in Free, with a second license, every certificate read for you, and exports.",
    features: [
      `${PLAN_LIMITS.essentialLicenses} state licenses`,
      "Unlimited certificate reading",
      "Audit-ready exports: certificate ZIP and CE Broker file",
      REMINDERS,
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "$199",
    per: "/year",
    summary: "For physicians with 3 or more licenses.",
    features: ["Everything in Essential", "Unlimited state licenses"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "essential", "pro"];

/** "$99/yr" — the short form used where the price sits on one line. */
export function planPriceLabel(id: PlanId): string {
  const plan = PLANS[id];
  return id === "free" ? plan.price : `${plan.price}/yr`;
}

/**
 * Groups are sold by email, not through checkout. This is a contact line, not
 * a fourth plan: there is no group dashboard or group billing in the product.
 */
export const GROUP_CONTACT = {
  email: "hello@clearcme.ai",
  line: "Buying for a practice or hospital group? Groups of 10 or more physicians are $149 per physician per year on one invoice, and each physician gets a Pro account.",
} as const;
