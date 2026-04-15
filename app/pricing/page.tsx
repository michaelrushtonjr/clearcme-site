"use client";

import { useState } from "react";
import Link from "next/link";

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
    a: "Yes. ClearCME is Secure & Private (Non-PHI). CME certificates are professional credentials, not Protected Health Information. Your data is encrypted in transit and at rest.",
  },
  {
    q: "What states are covered?",
    a: "All 50 states + DC, for both MD and DO physicians.",
  },
];

function Check() {
  return (
    <svg className="w-4 h-4 text-[#0F766E] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tiers = [
    {
      name: "Free",
      price: { annual: "$0", monthly: "$0" },
      cta: "Get started free",
      ctaHref: "/login",
      ctaStyle: "border border-slate-300 text-slate-700 hover:bg-slate-50",
      features: [
        "Single state requirement lookup",
        "Renewal countdown",
        "Up to 3 certificate uploads",
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
      ctaStyle: "border border-[#0F766E] text-[#0F766E] hover:bg-teal-50",
      features: [
        "Everything in Free",
        "Multi-state tracking (up to 2 states)",
        "AI certificate extraction",
        "Full gap analysis",
        "Deadline alerts",
        "DEA MATE Act tracking",
        "PDF compliance report",
      ],
      popular: false,
      muted: false,
    },
    {
      name: "Pro",
      price: { annual: "$199/yr", monthly: "$19/mo" },
      cta: "Start Pro",
      ctaHref: "/login",
      ctaStyle: "bg-[#0F766E] text-white hover:bg-[#0D9488]",
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
      ctaStyle: "border border-slate-300 text-slate-700 hover:bg-slate-50",
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
    <main className="min-h-screen bg-[#FAFAF7]">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-[#1E293B] tracking-tight">
          Clear<span className="text-[#0F766E]">CME</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/mate-act" className="text-sm text-[#475569] hover:text-[#1E293B] transition-colors">
            DEA MATE Act
          </Link>
          <Link href="/methodology" className="text-sm text-[#475569] hover:text-[#1E293B] transition-colors">
            Methodology
          </Link>
          <Link href="/login" className="text-sm font-medium text-[#0F766E] hover:text-[#0D9488] transition-colors">
            Sign in →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1
          className="font-playfair text-4xl sm:text-5xl font-bold text-[#1E293B] leading-tight tracking-tight mb-4"
        >
          Know exactly where you stand —<br />
          <span className="text-[#0F766E]">for less than your renewal application fee.</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
          Nevada physicians pay $250 to renew. California pays $690. ClearCME costs less than a dinner.
        </p>

        {/* Annual / Monthly toggle */}
        <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-12">
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Annual
            <span className="ml-2 text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
              Save ~25%
            </span>
          </button>
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              !annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Tier cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-6 flex flex-col gap-5 ${
                tier.popular
                  ? "border-[#0F766E] ring-2 ring-[#0F766E] ring-offset-2 bg-white shadow-lg"
                  : "border-slate-200 bg-white"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#0F766E] text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide whitespace-nowrap">
                    ⭐ Most Popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  {tier.name}
                </p>
                <p className={`text-3xl font-black tracking-tight ${tier.muted ? "text-slate-500" : "text-[#1E293B]"}`}>
                  {annual ? tier.price.annual : tier.price.monthly}
                </p>
                {tier.name !== "Free" && tier.name !== "Group" && (
                  <p className="text-xs text-slate-400 mt-1">
                    {annual ? "billed annually" : "billed monthly"}
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 flex-1">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={`block text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tier.ctaStyle}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-[#1E293B] mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-2xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-semibold text-[#1E293B] text-sm pr-4">{faq.q}</span>
                <svg
                  className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                  {faq.mocCta && (
                    <p className="mt-3">
                      Want early access when MOC tracking launches?{" "}
                      <a
                        href="mailto:moc@clearcme.ai"
                        className="text-[#0F766E] hover:text-[#0D9488] font-medium"
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
      <section className="bg-slate-50 border-t border-slate-100 py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1E293B] mb-3">
            Start free — no credit card required.
          </h2>
          <p className="text-slate-500 mb-8">
            See your compliance map in under 2 minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0F766E] text-white font-semibold rounded-xl hover:bg-[#0D9488] transition-colors text-base shadow-sm"
          >
            Sign in with Google →
          </Link>
          <p className="text-xs text-slate-400 mt-4">Free · No certificate upload needed to get started</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 bg-[#FAFAF7]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span className="font-bold text-[#1E293B] tracking-tight text-base">
            Clear<span className="text-[#0F766E]">CME</span>
          </span>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-slate-700 transition-colors">Pricing</Link>
            <Link href="/mate-act" className="hover:text-slate-700 transition-colors">DEA MATE Act</Link>
            <Link href="/methodology" className="hover:text-slate-700 transition-colors">Methodology</Link>
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms</Link>
          </div>
          <p>© {new Date().getFullYear()} ClearCME. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
