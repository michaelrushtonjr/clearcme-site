"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/PublicSiteShell";

const faqs: { q: string; a: string; mocCta?: boolean }[] = [
  {
    q: "Is ClearCME data accurate?",
    a: "We verify all state requirements against primary board sources. Every entry shows a 'last verified' date. Our QA process cross-references official state medical board websites, administrative codes, and regulations — not third-party aggregators.",
  },
  {
    q: "I'm licensed in two states. Do I need Pro?",
    a: "No — Essential covers up to 2 states, which is the most common scenario for physicians with dual licensure (e.g., Nevada + California, or a neighboring-state compact). Pro is designed for physicians tracking 3 or more states, or practices managing compliance across a group. If you're a two-state physician, Essential is all you need.",
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
    a: "Yes. ClearCME is Secure & Private (Non-PHI). CME certificates are professional credentials, not patient medical records. Please do not upload patient identifiers or clinical records. Your data is encrypted in transit and at rest.",
  },
  {
    q: "What if I subscribe and it is not right for me?",
    a: "Email hello@clearcme.ai within 14 days of purchase. During launch, we will either help fix the issue or handle a reasonable refund in good faith.",
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
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
        window.location.href = `/login?callbackUrl=${encodeURIComponent(`/pricing?checkout=${tier.toLowerCase()}`)}`;
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

  const tiers = [
    {
      name: "Free",
      price: { annual: "$0", monthly: "$0" },
      cta: "Get started free",
      ctaHref: "/login",
      ctaStyle: "public-btn-secondary",
      features: [
        "Single state requirement lookup",
        "Renewal countdown",
        "Manual CME entry",
        "One best course match per gap/topic",
        "Basic compliance dashboard",
      ],
      popular: false,
      muted: true,
    },
    {
      name: "Essential",
      price: { annual: "$99/yr", monthly: "$9/mo" },
      cta: "Start Essential",
      ctaHref: "/login",
      checkoutTier: "ESSENTIAL" as const,
      ctaStyle: "public-btn-secondary",
      features: [
        "Everything in Free",
        "Multi-state tracking (up to 2 states)",
        "AI-supported certificate extraction",
        "Full course recommendation list",
        "Sort by price, time, topic, accreditation",
        "Full gap analysis",
        "Deadline alerts",
        "DEA MATE Act tracking",
        "Audit-ready PDF export",
      ],
      popular: false,
      muted: false,
    },
    {
      name: "Pro",
      price: { annual: "$199/yr", monthly: "$19/mo" },
      cta: "Start Pro",
      ctaHref: "/login",
      checkoutTier: "PRO" as const,
      ctaStyle: "public-btn-primary",
      features: [
        "Everything in Essential",
        "Multi-state tracking (unlimited states)",
        "Side-by-side state comparison",
        "Priority alerts",
        "Shareable compliance summary",
        "Quarterly digest emails",
      ],
      popular: true,
      muted: false,
    },
    {
      name: "Group",
      price: { annual: "Contact us", monthly: "Contact us" },
      cta: "Contact sales",
      ctaHref: "mailto:hello@clearcme.ai",
      ctaStyle: "public-btn-secondary",
      features: [
        "Hospital / group billing",
        "$149/physician/yr (10+ min.)",
        "Admin dashboard",
        "Everything in Pro",
        "Dedicated onboarding",
        "Priority support",
      ],
      popular: false,
      muted: true,
    },
  ];

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
          Start free with a useful compliance map and one best course match per gap. Upgrade when you want AI extraction, full course choice, reminders, and audit-ready exports.
        </p>

        {/* Annual / Monthly toggle */}
        <div className="inline-flex items-center gap-1 bg-[#ece4cf] border border-[#ddd4bd] rounded-full p-1 mb-12">
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              annual ? "bg-[#fffdf6] text-[#1e2920] shadow-sm" : "text-[#6b7568] hover:text-[#1e2920]"
            }`}
          >
            Annual
            <span className="ml-2 text-xs font-medium text-[#3f5f33] bg-[#dde8cf] px-1.5 py-0.5 rounded-full">
              Save ~25%
            </span>
          </button>
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              !annual ? "bg-[#fffdf6] text-[#1e2920] shadow-sm" : "text-[#6b7568] hover:text-[#1e2920]"
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Tier cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {tiers.map((tier) => {
            const tierCheckoutTier = tier.name === "Essential" ? "ESSENTIAL" : tier.name === "Pro" ? "PRO" : null;

            return (
            <div
              key={tier.name}
              className={`relative public-card p-6 flex flex-col gap-5 ${
                tier.popular
                  ? "border-[#3f5f33] ring-2 ring-[#3f5f33] ring-offset-2 ring-offset-[#f4efe3] bg-[#fffdf6] shadow-lg"
                  : "border-[#ddd4bd] bg-[#fffdf6]/80"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#3f5f33] text-[#fffdf6] text-xs font-bold px-3 py-1 rounded-full tracking-wide whitespace-nowrap">
                    ⭐ Most Popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-[#6b7568] uppercase tracking-widest mb-1">
                  {tier.name}
                </p>
                <p className={`text-3xl font-black tracking-tight ${tier.muted ? "text-[#6b7568]" : "text-[#1e2920]"}`}>
                  {annual ? tier.price.annual : tier.price.monthly}
                </p>
                {tier.name !== "Free" && tier.name !== "Group" && (
                  <p className="text-xs text-[#6b7568] mt-1">
                    {annual ? "billed annually" : "billed monthly"}
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 flex-1">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-[#3f4a40]">
                    <Check />
                    {feat}
                  </li>
                ))}
              </ul>

              {tierCheckoutTier ? (
                <button
                  type="button"
                  onClick={() => startCheckout(tierCheckoutTier)}
                  disabled={checkoutTier !== null}
                  className={`block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${tier.ctaStyle}`}
                >
                  {checkoutTier === tierCheckoutTier ? "Opening checkout…" : tier.cta}
                </button>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className={`block text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tier.ctaStyle}`}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
            );
          })}
        </div>
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
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-semibold text-[#1e2920] text-sm pr-4">{faq.q}</span>
                <svg
                  className={`w-4 h-4 text-[#6b7568] flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
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
            Sign in with Google →
          </Link>
          <p className="text-xs text-[#6b7568] mt-4">Free · No credit card · One helpful course match included</p>
        </div>
      </section>

    </PublicShell>
  );
}
