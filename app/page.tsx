"use client";

import { useState } from "react";

function WaitlistForm({ variant = "light", source }: { variant?: "light" | "dark"; source: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        className={`flex items-center justify-center gap-3 font-medium px-6 py-4 rounded-xl max-w-md mx-auto ${
          variant === "dark" ? "text-white" : "bg-green-50 text-green-700"
        }`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        You&apos;re on the list. We&apos;ll be in touch.
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
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
        <a
          href="#waitlist"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Get early access →
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Built for emergency medicine physicians — and every specialty
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

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-slate-400">
          <span>🔒 HIPAA-aware</span>
          <span>✓ ACCME data verified</span>
          <span>🏥 Built by an EM physician</span>
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

      {/* Social proof */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Built by a physician, for physicians.
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
          ClearCME was built by a board-certified emergency medicine physician
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
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-slate-900 tracking-tight">
            Clear<span className="text-blue-600">CME</span>
          </span>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} ClearCME. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
