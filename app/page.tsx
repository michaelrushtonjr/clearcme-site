"use client";

import { useState, useRef } from "react";
import UrgencyBanner from "@/components/UrgencyBanner";
import RenewalSeasonStrip from "@/components/RenewalSeasonStrip";
import HeroProductPreview from "@/components/HeroProductPreview";

type DemoState = "NV" | "CA" | "TX" | "FL" | "NY";

const DEMO_STATES: Record<DemoState, {
  label: string;
  licenseType: string;
  totalHours: number;
  daysToRenewal: number;
  requirements: { topic: string; hrs: string; note?: string; met: boolean }[];
}> = {
  NV: {
    label: "Nevada",
    licenseType: "DO · Emergency Medicine",
    totalHours: 40,
    daysToRenewal: 267,
    requirements: [
      { topic: "Ethics", hrs: "1 hr", met: true },
      { topic: "Opioid Prescribing", hrs: "2 hrs", met: true },
      { topic: "Pain Management", hrs: "1 hr", met: false },
    ],
  },
  CA: {
    label: "California",
    licenseType: "MD · Internal Medicine",
    totalHours: 50,
    daysToRenewal: 314,
    requirements: [
      { topic: "Pain Management & End-of-Life", hrs: "12 hrs", met: false },
      { topic: "Implicit Bias", hrs: "4 hrs", met: false },
    ],
  },
  TX: {
    label: "Texas",
    licenseType: "MD · Family Medicine",
    totalHours: 48,
    daysToRenewal: 189,
    requirements: [
      { topic: "Human Trafficking", hrs: "1 hr", met: true },
      { topic: "Ethics", hrs: "2 hrs", met: true },
      { topic: "Opioid Prescribing", hrs: "varies", note: "first 2 renewals", met: false },
    ],
  },
  FL: {
    label: "Florida",
    licenseType: "DO · Internal Medicine",
    totalHours: 40,
    daysToRenewal: 92,
    requirements: [
      { topic: "Medical Errors", hrs: "2 hrs", met: true },
      { topic: "Domestic Violence", hrs: "2 hrs", note: "every 6 yrs", met: false },
      { topic: "Controlled Substances", hrs: "2 hrs", met: false },
    ],
  },
  NY: {
    label: "New York",
    licenseType: "MD · Emergency Medicine",
    totalHours: 36,
    daysToRenewal: 441,
    requirements: [
      { topic: "Child Abuse", hrs: "2 hrs", note: "one-time", met: true },
      { topic: "Infection Control", hrs: "varies", note: "every 4 yrs", met: true },
      { topic: "Opioid Prescribing", hrs: "3 hrs", note: "one-time", met: false },
    ],
  },
};

function MethodologyAccordion() {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-w-2xl mx-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-700 hover:text-[#0F766E] transition-colors text-left"
        aria-expanded={open}
      >
        <span>How do we verify CME requirements? →</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          ref={contentRef}
          className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100"
        >
          <p className="mt-4">
            Every requirement in ClearCME is sourced directly from official state medical board statutes,
            administrative codes, and renewal guidance — not third-party aggregators. We cross-reference
            primary sources and update rules each renewal cycle.
          </p>
          <p className="mt-2">
            Mandatory topic hour requirements (opioid prescribing, implicit bias, MATE Act, and others)
            are verified against each board&apos;s published rules, not peer-sourced data. When a rule is
            ambiguous, we flag it and default to the conservative interpretation to protect you.
          </p>
          <p className="mt-2">
            Our data covers all 50 states plus DC for MD and DO licenses, continuously maintained as boards
            update their requirements.
          </p>
          <a
            href="/methodology"
            className="inline-flex items-center gap-1 mt-4 text-sm font-medium hover:underline"
            style={{ color: "#0F766E" }}
          >
            Read our full methodology →
          </a>
        </div>
      )}
    </div>
  );
}

function DemoSection() {
  const [activeState, setActiveState] = useState<DemoState>("NV");
  const demo = DEMO_STATES[activeState];
  const metCount = demo.requirements.filter((r) => r.met).length;
  const totalCount = demo.requirements.length;
  const hoursEarned = Math.round(demo.totalHours * 0.85);
  const hoursLeft = demo.totalHours - hoursEarned;
  const ringPercent = hoursEarned / demo.totalHours;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="font-playfair text-3xl font-bold text-[#1E293B] mb-3">See it in action</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Here&apos;s what your compliance map looks like — live data, instant clarity.
          </p>
        </div>

        {/* State switcher pills */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {(["NV", "CA", "TX", "FL", "NY"] as DemoState[]).map((s) => (
            <button
              key={s}
              onClick={() => setActiveState(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                activeState === s
                  ? "bg-[#0F766E] text-white border-[#0F766E] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#0F766E] hover:text-[#0F766E]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative bg-white rounded-2xl border-2 border-teal-100 shadow-lg overflow-hidden">
          {/* Demo banner */}
          <div className="bg-teal-50 border-b border-teal-100 px-5 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F766E] tracking-wide uppercase">
              Demo — based on {demo.label} physician requirements
            </span>
            <span className="text-xs text-[#0D9488]">{demo.licenseType} · {activeState}</span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Top stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Hours Earned", value: `${hoursEarned}.0`, sub: "this cycle", color: "text-[#0F766E]" },
                { label: "Hours Needed", value: `${hoursLeft}.0`, sub: "to complete", color: "text-amber-600" },
                { label: "Days to Renewal", value: `${demo.daysToRenewal}`, sub: `${activeState} ${demo.licenseType.split("·")[0].trim()}`, color: "text-slate-700" },
                { label: "Mandatory Topics", value: `${metCount}/${totalCount}`, sub: "complete", color: metCount === totalCount ? "text-green-600" : "text-amber-600" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-50 rounded-2xl border border-slate-200 p-4"
                >
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Compliance card with ring */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900">{demo.label} — {demo.licenseType.split("·")[0].trim()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{demo.daysToRenewal} days to renewal</p>
                  <span className={`inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full ${metCount === totalCount ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {metCount === totalCount ? "✓ Compliant" : "⚠ Incomplete"}
                  </span>
                </div>
                {/* Ring SVG */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative" style={{ width: 80, height: 80 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90" aria-label={`${Math.round(ringPercent * 100)}% of CME hours complete`}>
                      <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke={metCount === totalCount ? "#22c55e" : "#f59e0b"}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - ringPercent)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-slate-800 leading-none">{hoursLeft}</span>
                      <span className="text-[9px] text-slate-400 leading-none mt-0.5">hrs left</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">{hoursEarned}.0 / {demo.totalHours} hrs earned</p>
              {metCount < totalCount && (
                <p className="text-xs mt-1.5 font-medium text-amber-600">⚠️ {totalCount - metCount} mandatory topic{totalCount - metCount !== 1 ? "s" : ""} pending</p>
              )}
            </div>

            {/* Requirements list */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Mandatory Requirements</h3>
              {demo.requirements.map((req) => (
                <div
                  key={req.topic}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                    !req.met ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {!req.met ? (
                      <span className="text-amber-500">⚠️</span>
                    ) : (
                      <span className="text-green-500">✅</span>
                    )}
                    <span className={!req.met ? "font-medium text-amber-900" : "text-slate-700"}>
                      {req.topic}
                      {req.note && <span className="ml-1 text-xs text-slate-400">({req.note})</span>}
                      {!req.met && (
                        <span className="ml-1 text-xs text-amber-600">— not yet completed</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{req.hrs}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        req.met ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {req.met ? "Met" : "Gap"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary line */}
            <p className="mt-5 text-center text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{demo.label}: </span>
              {demo.totalHours} hrs total · {totalCount} mandatory topics · {demo.daysToRenewal} days to renewal
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0F766E] text-white font-semibold rounded-xl hover:bg-[#0D9488] transition-colors text-base shadow-sm"
          >
            See YOUR compliance map → Sign in with Google
          </a>
          <p className="text-xs text-slate-400 mt-3">
            Free · Takes under 2 minutes · No certificate upload needed to get started
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAFAF7]">
      {/* Urgency banner */}
      <UrgencyBanner />

      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto bg-[#FAFAF7]">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#1E293B] tracking-tight">
            Clear<span className="text-[#0F766E]">CME</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/pricing" className="text-sm text-[#475569] hover:text-[#1E293B] transition-colors hidden sm:block">Pricing</a>
          <a href="/mate-act" className="text-sm text-[#475569] hover:text-[#1E293B] transition-colors hidden sm:block">DEA MATE Act</a>
          <a href="/methodology" className="text-sm text-[#475569] hover:text-[#1E293B] transition-colors hidden sm:block">Methodology</a>
          <a
            href="/login"
            className="text-sm font-medium border border-[#0F766E] text-[#0F766E] px-4 py-1.5 rounded-lg hover:bg-[#0F766E] hover:text-white transition-colors"
          >
            Create Free Account →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left: copy + CTA */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-[#0F766E] text-sm font-medium px-4 py-1.5 rounded-full mb-8">
              <span className="w-2 h-2 bg-[#0F766E] rounded-full animate-pulse" />
              All 50 states · MD and DO · Every specialty
            </div>

            <h1
              className="font-playfair text-5xl sm:text-6xl font-bold text-[#1E293B] leading-tight tracking-tight mb-6"
            >
              Know what CME
              <br />
              you <em className="text-[#0F766E] italic font-bold">actually</em> need.
            </h1>

            <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              ClearCME tracks your credits, maps state requirements, and tells you
              what&apos;s missing — before your renewal deadline.
              No spreadsheets. No guessing. And if your board ever asks for documentation, it&apos;s just another Tuesday.
            </p>

            {/* Hero CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center">
              <a
                href="/login"
                className="px-8 py-4 bg-[#0F766E] text-white font-semibold rounded-xl hover:bg-[#0D9488] transition-colors text-base shadow-sm whitespace-nowrap"
              >
                Create Free Account →
              </a>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Free · No credit card required · Covering all 50 states + DC — including Nevada, California, Texas, and Florida renewal cycles
            </p>
          </div>

          {/* Right: product preview */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <HeroProductPreview />
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm text-slate-400">
          <span title="CME certificates are professional credentials, not Protected Health Information.">
            🔒 Secure &amp; Private (Non-PHI)
          </span>
          <span className="text-[#0F766E] font-medium">✓ ACCME data verified</span>
          <span>🏥 Built by a physician</span>
          <span>⭐ All 50 states + DC</span>
        </div>
      </section>

      {/* Renewal Season Info Strip */}
      <RenewalSeasonStrip />

      {/* Problem / Value props */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="font-playfair text-3xl font-bold text-[#1E293B] text-center mb-4"
          >
            CME compliance is a mess.
          </h2>
          <p className="text-slate-500 text-center max-w-xl mx-auto mb-14">
            Every state is different. Requirements change. And you&apos;re busy
            enough without tracking opioid hours and implicit bias mandates in a
            spreadsheet.
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Upload your certificates",
                body: "PDF or image. AI extracts credits, categories, and dates automatically.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "See your compliance map",
                body: "Real-time gap analysis based on your state, license type, and specialty.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
                title: "Fill the gaps in one click",
                body: "Purchase exactly what you need — accredited courses, state-approved topics.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm border-l-4 border-l-[#0F766E]"
              >
                <div className="mb-4 w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-[#1E293B] mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section with State Switcher */}
      <DemoSection />

      {/* Methodology trust accordion */}
      <section className="py-10 px-6">
        <MethodologyAccordion />
      </section>

      {/* Social proof */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2
          className="font-playfair text-3xl font-bold text-[#1E293B] mb-4"
        >
          Built by a physician, for physicians.
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
          ClearCME was built by a board-certified physician
          who got tired of guessing whether their CME was actually compliant.
          The simplicity we wished we&apos;d had.
        </p>

        {/* Testimonial */}
        <div className="mt-12 max-w-xl mx-auto bg-slate-50 rounded-2xl p-6 text-left border border-slate-100">
          <p className="text-slate-700 text-base leading-relaxed italic">
            &ldquo;Finally — a tool that actually maps what I need for my state. I had no idea I was missing the DEA MATE Act requirement until ClearCME flagged it. Saved me hours before my renewal.&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-[#0F766E] font-bold text-sm">EM</div>
            <div>
              <p className="text-sm font-medium text-[#1E293B]">Emergency Medicine Physician</p>
              <p className="text-xs text-slate-400">Dr. M.R. — Emergency Medicine, Nevada</p>
            </div>
          </div>
        </div>
      </section>

      {/* Second CTA */}
      <section className="bg-[#0F766E] py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="font-playfair text-3xl font-bold text-white mb-4"
          >
            Start tracking your CME today.
          </h2>
          <p className="text-teal-100 mb-8">
            Free tier available. No credit card required.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0F766E] font-semibold rounded-xl hover:bg-teal-50 transition-colors text-base shadow-sm"
          >
            Create Free Account →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 bg-[#FAFAF7]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span className="font-bold text-[#1E293B] tracking-tight text-base">
            Clear<span className="text-[#0F766E]">CME</span>
          </span>
          <div className="flex flex-wrap justify-center gap-5">
            <a href="/pricing" className="hover:text-slate-700 transition-colors">Pricing</a>
            <a href="/mate-act" className="hover:text-slate-700 transition-colors">DEA MATE Act</a>
            <a href="/methodology" className="hover:text-slate-700 transition-colors">Methodology</a>
            <a href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-slate-700 transition-colors">Terms</a>
          </div>
          <p className="text-xs">
            © {new Date().getFullYear()} ClearCME. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
