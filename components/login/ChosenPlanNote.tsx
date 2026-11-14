"use client";

import { useSyncExternalStore } from "react";
import type { ChosenPlan } from "@/lib/login-callback";
import { PLANS } from "@/lib/plan-features";

// The plan a visitor picked on a price card, remembered for the "check your
// email" screen, which Auth.js opens without the original return path.
const STORAGE_KEY = "clearcme_chosen_plan";

export function rememberChosenPlan(plan: ChosenPlan | null) {
  try {
    if (plan) window.sessionStorage.setItem(STORAGE_KEY, plan);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing can refuse storage; the plan still rides the sign-in link.
  }
}

function readRememberedPlan(): ChosenPlan | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value === "essential" || value === "pro" ? value : null;
  } catch {
    return null;
  }
}

const subscribe = () => () => {};

/**
 * Tells a visitor who chose a paid plan that the choice was kept and what
 * happens next. Hidden inside the iPhone app, which shows no plan names,
 * prices or purchase steps (App Store 3.1.1).
 */
export function ChosenPlanNote({ plan, next }: { plan: ChosenPlan; next: string }) {
  const { name, price, per } = PLANS[plan];
  return (
    <div className="login-note app-hide" role="status">
      <span className="mono-label">Your plan</span>
      <strong>
        {name} · {price}
        {per}
      </strong>
      <span>{next}</span>
    </div>
  );
}

/** The same note on /login/check-email, read from this browser tab's memory. */
export function RememberedPlanNote() {
  const plan = useSyncExternalStore(subscribe, readRememberedPlan, () => null);
  if (!plan) return null;
  return <ChosenPlanNote plan={plan} next="Checkout opens after you click the link in your email. 30-day full refund." />;
}
