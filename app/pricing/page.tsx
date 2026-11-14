"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/PublicSiteShell";
import { usePricingViewed } from "@/components/analytics/FunnelEvents";
import { GROUP_CONTACT, PLAN_ORDER, PLANS, planPriceLabel, type PlanId } from "@/lib/plan-features";
import { planLoginHref } from "@/lib/login-callback";

const faqs: { q: string; a: string; mocCta?: boolean; defaultOpen?: boolean }[] = [
  {
    q: "Is ClearCME data accurate?",
    defaultOpen: true,
    a: "We verify all state requirements against primary board sources. Every entry shows a 'last verified' date. Our QA process cross-references official state medical board websites, administrative codes, and regulations — not third-party aggregators.",
  },
  {
    q: "I'm licensed in two states. Do I need Pro?",
    a: "No — Essential covers up to 2 states, which is the most common scenario for physicians with dual licensure (e.g., Nevada + California, or a neighboring-state compact). Pro is for physicians tracking 3 or more states. If you're a two-state physician, Essential is all you need.",
  },
  {
    q: "What does \"founding member\" mean?",
    a: "The first 100 paying members keep the price they signed up at. As ClearCME adds states, integrations, and features, prices will go up — founding rates don't. The one condition is that your subscription stays continuously active; if you cancel and rejoin later, you'll join at whatever the current rate is. There's no separate tier or application — if you're among the first 100, you're a founding member.",
  },
  {
    q: "Is there a monthly plan?",
    a: "No — ClearCME is billed annually. Your license renews on a cycle, and so does ClearCME. It keeps the price low and means you're covered the moment a state board changes its requirements mid-year, not just the month you happen to be subscribed.",
  },
  {
    q: "What if my state's requirements change?",
    a: "We monitor requirements continuously and update within 30 days of any confirmed change.",
  },
  {
    q: "Does ClearCME track MOC?",
    a: "Not yet. ClearCME currently tracks state CME requirements for medical licensure. ABIM/ABFM/ABEM Maintenance of Certification (MOC) is a separate program with its own requirements — and it's on our roadmap. We plan to add MOC tracking in a future release. If MOC support is important to you, let us know at hello@clearcme.ai.",
    mocCta: true,
  },
  {
    q: "Is my data secure?",
    defaultOpen: true,
    a: "Yes. ClearCME is Secure & Private (Non-PHI). CME certificates are professional credentials, not patient medical records. Please do not upload patient identifiers or clinical records. Your data is encrypted in transit and at rest.",
  },
  {
    q: "What if I subscribe and it is not right for me?",
    defaultOpen: true,
    a: "Email hello@clearcme.ai within 30 days of purchase and we'll refund you in full - no questions, no email chase.",
  },
  {
    q: "Is this legal or licensing advice?",
    a: "No. ClearCME is a tracking and organization tool. We verify requirements against primary sources, but you remain responsible for confirming your specific obligations with your licensing board.",
  },
  {
    q: "What states are covered?",
    a: "All 50 states + DC, for both MD and DO physicians.",
  },
];

function Check() {
  return (
    <svg className="w-4 h-4 text-[#3f5f33] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function PricingPage() {
  usePricingViewed("pricing_page");
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(
    () => new Set(faqs.flatMap((faq, index) => (faq.defaultOpen ? [index] : []))),
  );
  const toggleFaq = (index: number) =>
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  const [checkoutTier, setCheckoutTier] = useState<"ESSENTIAL" | "PRO" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const startCheckout = useCallback(async (tier: "ESSENTIAL" | "PRO") => {
    setCheckoutTier(tier);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (res.status === 401) {
        window.location.href = planLoginHref(tier === "ESSENTIAL" ? "essential" : "pro");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start checkout");
      }

      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Unable to start checkout");
      setCheckoutTier(null);
    }
  }, []);

  const autoCheckoutStarted = useRef(false);

  useEffect(() => {
    if (autoCheckoutStarted.current) return;

    const checkoutParam = new URLSearchParams(window.location.search).get("checkout")?.toLowerCase();
    const tier = checkoutParam === "essential" ? "ESSENTIAL" : checkoutParam === "pro" ? "PRO" : null;
    if (!tier) return;

    autoCheckoutStarted.current = true;
    void startCheckout(tier);
  }, [startCheckout]);

  // What each plan includes comes from lib/plan-features.ts, the same list
  // the home page renders. Only the buttons are decided here.
  const buttons: Record<PlanId, { cta: string; ctaStyle: string; checkoutTier: "ESSENTIAL" | "PRO" | null }> = {
    free: { cta: "Get started free", ctaStyle: "public-btn-secondary", checkoutTier: null },
    essential: { cta: "Start Essential", ctaStyle: "public-btn-primary", checkoutTier: "ESSENTIAL" },
    pro: { cta: "Start Pro", ctaStyle: "public-btn-secondary", checkoutTier: "PRO" },
  };

  return (
    <PublicShell links={[{ href: "/mate-act", label: "DEA MATE Act" }, { href: "/methodology", label: "Methodology" }]}>
      {/* Hero */}
      <section className="public-hero max-w-4xl mx-auto">
        <div className="public-kicker mb-6">Pricing</div>
        <h1 className="public-heading text-4xl sm:text-6xl mb-5">
          Know exactly where you stand —<br />
          <span className="public-accent">without the audit scramble.</span>
        </h1>
        <p className="public-subhead max-w-2xl mx-auto mb-10">
          Start free with your compliance map and course matches for each gap. Upgrade when you want a second license, unlimited certificate reading, and audit-ready exports. <strong className="text-[#1e2920]">Our first 100 members keep today&apos;s rate for as long as they stay.</strong>
        </p>

        {/* Tier cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const button = buttons[id];
            const tier = button.checkoutTier;
            const popular = id === "essential";
            const muted = id === "free";

            return (
            <div
              key={id}
              className={`relative public-card p-6 flex flex-col gap-5 ${
                popular
                  ? "border-[#3f5f33] ring-2 ring-[#3f5f33] ring-offset-2 ring-offset-[#f4efe3] bg-[#fffdf6] shadow-lg"
                  : "border-[#ddd4bd] bg-[#fffdf6]/80"
              }`}
            >
              {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#3f5f33] text-[#fffdf6] text-xs font-bold px-3 py-1 rounded-full tracking-wide whitespace-nowrap">
                    Most Physicians
                  </span>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-[#6b7568] uppercase tracking-widest mb-1">
                  {plan.name}
                </p>
                <p className={`text-3xl font-black tracking-tight ${muted ? "text-[#6b7568]" : "text-[#1e2920]"}`}>
                  {planPriceLabel(id)}
                </p>
                {id !== "free" && (
                  <>
                    <p className="text-xs text-[#6b7568] mt-1">billed annually</p>
                    <p className="text-xs italic text-[#3f5f33] mt-1">Founding-member rate — locked while active.</p>
                  </>
                )}
                <p className="text-sm text-[#3f4a40] mt-3 leading-relaxed">{plan.summary}</p>
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-[#3f4a40]">
                    <Check />
                    {feat}
                  </li>
                ))}
              </ul>

              {tier ? (
                <button
                  type="button"
                  onClick={() => startCheckout(tier)}
                  disabled={checkoutTier !== null}
                  className={`block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${button.ctaStyle}`}
                >
                  {checkoutTier === tier ? "Opening checkout…" : button.cta}
                </button>
              ) : (
                <Link
                  href="/login"
                  className={`block text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${button.ctaStyle}`}
                >
                  {button.cta}
                </Link>
              )}
            </div>
            );
          })}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-[#3f4a40]">
          {GROUP_CONTACT.line}{" "}
          <a href={`mailto:${GROUP_CONTACT.email}`} className="font-semibold text-[#3f5f33] underline underline-offset-4 hover:text-[#2a4123]">
            Email {GROUP_CONTACT.email}
          </a>
        </p>
        {checkoutError && (
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {checkoutError}
          </p>
        )}
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-[#1e2920] mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="public-card public-card-soft overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#ece4cf]/60 transition-colors"
                onClick={() => toggleFaq(i)}
              >
                <span className="font-semibold text-[#1e2920] text-sm pr-4">{faq.q}</span>
                <svg
                  className={`w-4 h-4 text-[#6b7568] flex-shrink-0 transition-transform ${openFaqs.has(i) ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqs.has(i) && (
                <div className="px-5 pb-4 text-sm text-[#3f4a40] leading-relaxed border-t border-[#ece3ca] pt-3">
                  {faq.a}
                  {faq.mocCta && (
                    <p className="mt-3">
                      Want early access when MOC tracking launches?{" "}
                      <a
                        href="mailto:moc@clearcme.ai"
                        className="text-[#3f5f33] hover:text-[#2a4123] font-medium"
                      >
                        Join the MOC early access list →
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#ece4cf]/45 border-t border-[#ece3ca] py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1e2920] mb-3">
            Start free — no credit card required.
          </h2>
          <p className="text-[#6b7568] mb-8">
            See your compliance map in under 2 minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#3f5f33] text-[#fffdf6] font-semibold rounded-xl hover:bg-[#2a4123] transition-colors text-base shadow-sm"
          >
            Start free →
          </Link>
          <p className="text-xs text-[#6b7568] mt-4">Free · No credit card · Course matches for each gap</p>
        </div>
      </section>

    </PublicShell>
  );
}
