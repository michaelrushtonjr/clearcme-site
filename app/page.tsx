"use client";

import { useState } from "react";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","District of Columbia",
];

type WaitlistStep = "email" | "state" | "done";

function WaitlistForm({ variant = "light", source }: { variant?: "light" | "dark"; source: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [step, setStep] = useState<WaitlistStep>("email");
  const [waitlistId, setWaitlistId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to join");
      }
      const data = await res.json();
      setWaitlistId(data.id);
      setStep("state");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) {
      setStep("done");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, state }),
      });
    } catch {
      // Non-critical — just proceed
    } finally {
      setLoading(false);
      setStep("done");
    }
  };

  if (step === "done") {
    return (
      <div className={`max-w-md mx-auto text-center px-6 py-5 rounded-2xl ${variant === "dark" ? "bg-white/10" : "bg-green-50 border border-green-200"}`}>
        <div className="flex items-center justify-center gap-2 font-semibold mb-2 text-base ${variant === 'dark' ? 'text-white' : 'text-green-700'}">
          <svg className={`w-5 h-5 ${variant === "dark" ? "text-green-300" : "text-green-600"}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className={variant === "dark" ? "text-white" : "text-green-800"}>You&apos;re on the list!</span>
        </div>
        <p className={`text-sm ${variant === "dark" ? "text-blue-100" : "text-green-700"}`}>
          {state
            ? `Thanks! We'll notify you when ${state} requirements are fully verified.`
            : "We'll be in touch when ClearCME launches."}
        </p>
      </div>
    );
  }

  if (step === "state") {
    return (
      <div className="max-w-md mx-auto space-y-3">
        <div className={`flex items-center gap-2 text-sm font-medium ${variant === "dark" ? "text-green-300" : "text-green-700"}`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          You&apos;re on the list! One more thing…
        </div>
        <p className={`text-sm ${variant === "dark" ? "text-blue-100" : "text-slate-600"}`}>
          What state do you practice in? We&apos;ll let you know when your state&apos;s requirements are fully verified.
        </p>
        <form onSubmit={handleStateSubmit} className="flex flex-col sm:flex-row gap-3">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
              variant === "dark"
                ? "border-blue-400 bg-blue-500 text-white focus:ring-white"
                : "border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-transparent bg-white"
            }`}
          >
            <option value="">Select your state…</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-3 font-semibold rounded-xl transition-colors disabled:opacity-60 text-sm whitespace-nowrap ${
              variant === "dark"
                ? "bg-white text-blue-600 hover:bg-blue-50"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading ? "Saving…" : state ? "Save" : "Skip →"}
          </button>
        </form>
        {error && (
          <p className={`text-xs ${variant === "dark" ? "text-red-300" : "text-red-500"}`}>{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleEmailSubmit}
        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className={`flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
            variant === "dark"
              ? "border-blue-400 bg-blue-500 text-white placeholder:text-blue-200 focus:ring-white"
              : "border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-transparent"
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-3 font-semibold rounded-xl transition-colors disabled:opacity-60 text-sm whitespace-nowrap ${
            variant === "dark"
              ? "bg-white text-blue-600 hover:bg-blue-50"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "Joining..." : "Join the waitlist"}
        </button>
      </form>
      {error && (
        <p className={`text-xs mt-2 ${variant === "dark" ? "text-red-300" : "text-red-500"}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            Clear<span className="text-blue-600">CME</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/pricing" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Pricing</a>
          <a href="/mate-act" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">DEA MATE Act</a>
          <a
            href="#waitlist"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Get early access →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          All 50 states · MD and DO · Every specialty
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
          Know exactly what CME
          <br />
          <span className="text-blue-600">you actually need.</span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          ClearCME tracks your credits, maps state requirements, and tells you
          exactly what&apos;s missing — before your renewal deadline.
          No spreadsheets. No guessing.
        </p>

        {/* Waitlist form */}
        <div id="waitlist">
          <WaitlistForm source="hero" />
          <p className="text-xs text-slate-400 mt-3">
            Free to join · No credit card required · Growing community of physicians
          </p>
        </div>

        {/* Urgency framing — renewal season */}
        <div className="mt-4 mb-2">
          <p className="text-xs text-slate-400 text-center">
            🗓 Renewal season is coming —{" "}
            <span className="text-slate-500">Nevada physicians renew July 1</span>
            {" · "}
            <span className="text-slate-500">California physicians renew every 2 years</span>
            {" · "}
            <span className="text-slate-500">New York physicians renew every 3 years</span>
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm text-slate-400">
          <span>🔒 HIPAA-aware</span>
          <span>✓ ACCME data verified</span>
          <span>🏥 Built by a physician</span>
          <span>⭐ All 50 states + DC</span>
        </div>
      </section>

      {/* Problem / Value props */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
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
                icon: "🗂️",
                title: "Upload your certificates",
                body: "PDF or image. AI extracts credits, categories, and dates automatically.",
              },
              {
                icon: "🗺️",
                title: "See your compliance map",
                body: "Real-time gap analysis based on your state, license type, and specialty.",
              },
              {
                icon: "⚡",
                title: "Fill the gaps in one click",
                body: "Purchase exactly what you need — accredited courses, state-approved topics.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Mode — See it in action */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">See it in action</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Here&apos;s what your compliance map looks like — live data, instant clarity.
            </p>
          </div>

          <div className="relative bg-white rounded-2xl border-2 border-blue-100 shadow-lg overflow-hidden">
            {/* Demo banner */}
            <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 tracking-wide uppercase">
                Demo — based on Nevada EM physician requirements
              </span>
              <span className="text-xs text-blue-500">DO · Emergency Medicine · NV</span>
            </div>

            <div className="p-6 sm:p-8">
              {/* Top stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Hours Earned", value: "34.0", sub: "this cycle", color: "text-blue-700" },
                  { label: "Hours Needed", value: "6.0", sub: "to complete", color: "text-amber-600" },
                  { label: "Days to Renewal", value: "267", sub: "NV DO", color: "text-slate-700" },
                  { label: "Mandatory Topics", value: "4/5", sub: "complete", color: "text-amber-600" },
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
                    <p className="font-semibold text-slate-900">Nevada — DO</p>
                    <p className="text-xs text-slate-400 mt-0.5">267 days to renewal</p>
                    <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      ⚠ Incomplete
                    </span>
                  </div>
                  {/* Static ring SVG — 85% (34/40 hrs) */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative" style={{ width: 80, height: 80 }}>
                      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90" aria-label="85% of CME hours complete">
                        <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 36}`}
                          strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.85)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-800 leading-none">6</span>
                        <span className="text-[9px] text-slate-400 leading-none mt-0.5">hrs left</span>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-amber-600 text-center">⚡ 0.7 hrs/month needed</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">34.0 / 40 hrs earned</p>
                <p className="text-xs mt-1.5 font-medium text-amber-600">⚠️ 1 mandatory topic pending</p>
              </div>

              {/* Requirements list */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Mandatory Requirements</h3>
                {[
                  { topic: "Opioid Prescribing", hrs: "2 hrs", status: "complete", met: true },
                  { topic: "Implicit Bias", hrs: "2 hrs", status: "complete", met: true },
                  { topic: "Ethics", hrs: "1 hr", status: "complete", met: true },
                  { topic: "End of Life Care", hrs: "1 hr", status: "complete", met: true },
                  { topic: "DEA MATE Act", hrs: "8 hrs", status: "not completed", met: false, alert: true },
                ].map((req) => (
                  <div
                    key={req.topic}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                      req.alert
                        ? "bg-amber-50 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {req.alert ? (
                        <span className="text-amber-500">⚠️</span>
                      ) : (
                        <span className="text-green-500">✅</span>
                      )}
                      <span className={req.alert ? "font-medium text-amber-900" : "text-slate-700"}>
                        {req.topic}
                        {req.alert && (
                          <span className="ml-1 text-xs text-amber-600">— not yet completed</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{req.hrs}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          req.met
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
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
                <span className="font-semibold text-slate-700">Nevada DO: </span>
                40 hrs total · 5 mandatory topics · 267 days to renewal
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-base shadow-sm"
            >
              See YOUR compliance map → Sign in with Google
            </a>
            <p className="text-xs text-slate-400 mt-3">
              Free · Takes under 2 minutes · No certificate upload needed to get started
            </p>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Built by a physician, for physicians.
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
          ClearCME was built by a board-certified physician
          who got tired of guessing whether their CME was actually compliant.
          We know what the board wants, because we&apos;ve been there.
        </p>

        {/* Testimonial */}
        <div className="mt-12 max-w-xl mx-auto bg-slate-50 rounded-2xl p-6 text-left border border-slate-100">
          <p className="text-slate-700 text-base leading-relaxed italic">
            &ldquo;Finally — a tool that actually maps what I need for my state. I had no idea I was missing the DEA MATE Act requirement until ClearCME flagged it. Saved me hours before my renewal.&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">EM</div>
            <div>
              <p className="text-sm font-medium text-slate-900">Emergency Medicine Physician</p>
              <p className="text-xs text-slate-400">Nevada · Beta user</p>
            </div>
          </div>
        </div>
      </section>

      {/* Second CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Get early access.</h2>
          <p className="text-blue-100 mb-8">
            Be first to know when ClearCME launches. Free tier available at launch.
          </p>
          <WaitlistForm variant="dark" source="cta" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span className="font-bold text-slate-900 tracking-tight text-base">
            Clear<span className="text-blue-600">CME</span>
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
