"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/PublicSiteShell";

function SelfCheckTool() {
  const [deaDate, setDeaDate] = useState("");
  const [result, setResult] = useState<null | {
    applies: boolean;
    status: string;
    detail: string;
    color: string;
  }>(null);

  const MATE_EFFECTIVE = new Date("2023-06-27");

  const handleCheck = () => {
    if (!deaDate) return;
    const date = new Date(deaDate);

    if (date >= MATE_EFFECTIVE) {
      setResult({
        applies: true,
        status: "Required — and already due",
        detail:
          "You registered or renewed your DEA on or after June 27, 2023. The 8-hour MATE Act training was required at time of registration/renewal. Complete it as soon as possible.",
        color: "red",
      });
    } else {
      setResult({
        applies: true,
        status: "Required at your NEXT DEA renewal",
        detail:
          "You registered before June 27, 2023. The 8-hour training is required when you next renew your DEA registration. DEA registrations expire every 3 years — check your DEA.gov account for your renewal date.",
        color: "amber",
      });
    }
  };

  const colorMap = {
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      title: "text-red-900",
      text: "text-red-800",
      badge: "bg-red-100 text-red-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      title: "text-amber-900",
      text: "text-amber-800",
      badge: "bg-amber-100 text-amber-700",
    },
  };

  return (
    <div className="public-card p-6 space-y-5">
      <div>
        <h3 className="font-bold text-[#1e2920] text-lg mb-1">Quick self-check</h3>
        <p className="text-sm text-[#6b7568]">
          When did you last register or renew your DEA?
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="date"
          value={deaDate}
          onChange={(e) => {
            setDeaDate(e.target.value);
            setResult(null);
          }}
          max={new Date().toISOString().split("T")[0]}
          className="flex-1 px-4 py-3 rounded-xl border border-[#ddd4bd] text-sm focus:outline-none focus:ring-2 focus:ring-[#3f5f33] focus:border-transparent"
        />
        <button
          onClick={handleCheck}
          disabled={!deaDate}
          className="px-6 py-3 bg-[#3f5f33] text-white text-sm font-semibold rounded-xl hover:bg-[#2a4123] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Check my status
        </button>
      </div>

      {result && (
        <div
          className={`rounded-xl border p-4 ${colorMap[result.color as "red" | "amber"].bg} ${colorMap[result.color as "red" | "amber"].border}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{result.color === "red" ? "⚠️" : "📅"}</span>
            <div>
              <p className={`font-semibold text-sm mb-1 ${colorMap[result.color as "red" | "amber"].title}`}>
                {result.status}
              </p>
              <p className={`text-sm leading-relaxed ${colorMap[result.color as "red" | "amber"].text}`}>
                {result.detail}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-[#6b7568]">
        Not sure of your DEA date?{" "}
        <a
          href="https://www.deadiversion.usdoj.gov/drugreg/registration.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3f5f33] hover:underline"
        >
          Check DEA Diversion Control →
        </a>
      </p>
    </div>
  );
}

export default function MateActPage() {
  return (
    <PublicShell links={[{ href: "/pricing", label: "Pricing" }, { href: "/methodology", label: "Methodology" }]}>
      {/* Hero */}
      <section className="public-hero mx-auto max-w-3xl">
        <div className="public-kicker mb-6 text-[#b85631]">DEA Requirement · Effective June 27, 2023</div>
        <h1 className="public-heading mb-5 text-4xl sm:text-6xl">
          Are you DEA-registered?<br />
          <span className="public-pop-accent">You may owe the DEA an 8-hour training.</span>
        </h1>
        <p className="public-subhead mx-auto max-w-2xl">
          The DEA MATE Act (effective June 27, 2023) requires all DEA-registered practitioners to complete
          8 hours of training on treating patients with opioid or substance use disorders — one time.
        </p>
      </section>

      {/* Who it applies to + What it covers */}
      <section className="max-w-4xl mx-auto px-6 pb-12">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="public-card public-card-soft p-6">
            <h2 className="font-bold text-[#1e2920] mb-3 flex items-center gap-2">
              <span className="text-xl">👥</span> Who it applies to
            </h2>
            <p className="text-sm text-[#3f4a40] leading-relaxed mb-3">
              Every practitioner with a DEA registration number. No exceptions.
            </p>
            <ul className="space-y-1.5 text-sm text-[#3f4a40]">
              {["Physicians (MD, DO)", "Physician Assistants (PA)", "Nurse Practitioners (NP)", "Dentists"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="public-card public-card-soft p-6">
            <h2 className="font-bold text-[#1e2920] mb-3 flex items-center gap-2">
              <span className="text-xl">📋</span> What the 8 hours must cover
            </h2>
            <ul className="space-y-1.5 text-sm text-[#3f4a40]">
              {[
                "FDA-approved medications for SUD treatment",
                "Clinical management of opioid use disorder",
                "Overdose prevention",
                "Treating patients with opioid or substance use disorders",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#3f5f33] rounded-full flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Three scenarios */}
      <section className="public-section-band py-14">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1e2920] mb-8 text-center">Are you compliant?</h2>
          <div className="space-y-4">
            {[
              {
                num: "1",
                color: "amber",
                title: "DEA registered before June 2023 and haven't renewed since",
                detail: "The training is required at your NEXT DEA renewal. DEA registrations expire every 3 years.",
                badge: "Required at next renewal",
              },
              {
                num: "2",
                color: "red",
                title: "DEA registered or renewed on/after June 27, 2023",
                detail: "The training was required at the time of your registration or renewal. If you haven't completed it, do so now.",
                badge: "Required now",
              },
              {
                num: "3",
                color: "green",
                title: "Completed 8 hours of qualifying SUD/opioid training",
                detail: "You are compliant. Training that counts: any ACCME/AOA-accredited course covering SUD, OUD, or opioid prescribing that totals ≥8 hours.",
                badge: "Compliant ✓",
              },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex gap-4 p-5 rounded-2xl border ${
                  s.color === "green"
                    ? "bg-green-50 border-green-200"
                    : s.color === "red"
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    s.color === "green"
                      ? "bg-green-200 text-green-800"
                      : s.color === "red"
                      ? "bg-red-200 text-red-800"
                      : "bg-amber-200 text-amber-800"
                  }`}
                >
                  {s.num}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p
                      className={`font-semibold text-sm ${
                        s.color === "green"
                          ? "text-green-900"
                          : s.color === "red"
                          ? "text-red-900"
                          : "text-amber-900"
                      }`}
                    >
                      {s.title}
                    </p>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        s.color === "green"
                          ? "bg-green-100 text-green-700"
                          : s.color === "red"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1.5 leading-relaxed ${
                      s.color === "green"
                        ? "text-green-800"
                        : s.color === "red"
                        ? "text-red-800"
                        : "text-amber-800"
                    }`}
                  >
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-check tool */}
      <section className="max-w-2xl mx-auto px-6 py-14">
        <SelfCheckTool />
      </section>

      {/* Recommended course */}
      <section className="public-section-band py-14">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1e2920] mb-6 text-center">Recommended course</h2>
          <div className="public-card p-6 flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#3f5f33] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1e2920] text-lg mb-1">Hippo Education: OUD Decoded</p>
              <p className="text-sm text-[#3f4a40] mb-3 leading-relaxed">
                12.25 AMA PRA Category 1 Credits™ — satisfies the DEA MATE Act 8-hour requirement.
                Covers opioid use disorder diagnosis, treatment, and clinical management.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">✓ Satisfies MATE Act</span>
                <span className="text-xs bg-[#dde8cf] text-[#3f5f33] font-medium px-2.5 py-1 rounded-full">12.25 AMA PRA Cat 1</span>
                <span className="text-xs bg-slate-100 text-[#3f4a40] font-medium px-2.5 py-1 rounded-full">On-demand</span>
              </div>
              <a
                href="https://home.hippoed.com/oud-decoded"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3f5f33] text-white text-sm font-semibold rounded-xl hover:bg-[#2a4123] transition-colors"
              >
                View OUD Decoded →
              </a>
            </div>
          </div>
          <p className="text-xs text-[#6b7568] mt-3 text-center">
            ClearCME does not receive compensation from Hippo Education. This is an independent recommendation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-[#1e2920] mb-3">
          Track your DEA MATE Act status in ClearCME
        </h2>
        <p className="text-[#6b7568] mb-8">
          ClearCME tracks your DEA MATE Act compliance alongside all your state CME requirements.
          Free. No credit card required.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#3f5f33] text-white font-semibold rounded-xl hover:bg-[#2a4123] transition-colors text-base shadow-sm"
        >
          Sign in free →
        </Link>
      </section>

    </PublicShell>
  );
}
