"use client";

import { useState } from "react";
import MateActNotice from "@/components/MateActNotice";
import { mateActDeadline } from "@/lib/mate-act";
import Link from "next/link";
import { PublicShell } from "@/components/PublicSiteShell";
import { getFreeMateCourses } from "@/lib/mate-free-courses";

function SelfCheckTool() {
  const [registeredAt, setRegisteredAt] = useState("");
  const [firstRenewal, setFirstRenewal] = useState("");
  const result = mateActDeadline({ registeredAt, firstRenewalOnOrAfterCutoff: firstRenewal });
  return <div className="public-card p-6 space-y-5">
    <h3 className="font-bold">Registration history</h3>
    <label className="block">First DEA registration date<input className="product-input" type="date" value={registeredAt} onChange={(e) => setRegisteredAt(e.target.value)} /></label>
    <label className="block">First DEA renewal on or after June 27, 2023, if known<input className="product-input" type="date" value={firstRenewal} onChange={(e) => setFirstRenewal(e.target.value)} /></label>
    <p>{result.status === "KNOWN" ? "Qualifying event recorded. Review the requirement above and your training evidence." : "Needs your answer — check your DEA registration history."}</p>
  </div>;
}

export default function MateActPage() {
  const freeMate = getFreeMateCourses();
  return (
    <PublicShell links={[{ href: "/pricing", label: "Pricing" }, { href: "/methodology", label: "Methodology" }]}>
      {/* Hero */}
      <section className="public-hero mx-auto max-w-3xl">
        <div className="public-kicker mb-6 text-[#b85631]">Federal training record</div>
        <h1 className="public-heading mb-5 text-4xl sm:text-6xl">
          Are you DEA-registered?<br />
          <span className="public-pop-accent">You may owe the DEA an 8-hour training.</span>
        </h1>
        <div className="public-subhead mx-auto max-w-2xl"><MateActNotice /></div>
      </section>

      {/* Who it applies to + What it covers */}
      <section className="max-w-4xl mx-auto px-6 pb-12">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="public-card public-card-soft p-6">
            <h2 className="font-bold text-[#1e2920] mb-3 flex items-center gap-2">
              Who it applies to
            </h2>
            <p className="text-sm text-[#3f4a40] leading-relaxed mb-3">
              Use your federal record to document training or a qualifying basis described above.
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
              What the 8 hours must cover
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

      {/* Self-check tool */}
      <section className="max-w-2xl mx-auto px-6 py-14">
        <SelfCheckTool />
      </section>

      {/* Courses that satisfy it — free first */}
      <section className="public-section-band py-14">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1e2920] mb-2 text-center">Courses that satisfy it</h2>
          <p className="text-sm text-[#3f4a40] mb-8 text-center max-w-xl mx-auto leading-relaxed">
            These 8 hours are widely sold near renewal deadlines. They do not have to be.
            Accredited providers offer training that covers the full requirement at no cost.
          </p>

          {freeMate.full.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-[#3f5f33] uppercase tracking-wide mb-3">
                Free — covers all 8 hours
              </h3>
              <div className="flex flex-col gap-4 mb-8">
                {freeMate.full.map((course) => (
                  <div key={`${course.name}|${course.url}`} className="public-card p-5">
                    <p className="font-bold text-[#1e2920] mb-1">{course.name}</p>
                    <p className="text-xs text-[#6b7568] mb-2">{course.provider}</p>
                    <p className="text-sm text-[#3f4a40] mb-3 leading-relaxed">{course.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">
                        Free
                      </span>
                      <span className="text-xs bg-[#dde8cf] text-[#3f5f33] font-medium px-2.5 py-1 rounded-full">
                        {course.credits}
                      </span>
                    </div>
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3f5f33] text-white text-sm font-semibold rounded-xl hover:bg-[#2a4123] transition-colors"
                    >
                      View course →
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

          {freeMate.partial.length > 0 && (
            <p className="text-sm text-[#3f4a40] mb-8 text-center">
              {freeMate.partial.length} more free {freeMate.partial.length === 1 ? "course" : "courses"} count toward
              the 8 hours —{" "}
              <Link href="/courses/opioid-prescribing" className="text-[#3f5f33] font-semibold hover:underline">
                see the full list
              </Link>
              .
            </p>
          )}

          <h3 className="text-sm font-bold text-[#3f4a40] uppercase tracking-wide mb-3">Paid alternative</h3>
          <div className="public-card p-6 flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#3f5f33] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1e2920] text-lg mb-1">Hippo Education: OUD Decoded</p>
              <p className="text-sm text-[#3f4a40] mb-3 leading-relaxed">
                12.25 AMA PRA Category 1 Credits™ — satisfies the DEA MATE Act 8-hour requirement and goes
                well beyond it, covering opioid use disorder diagnosis, treatment, and clinical management.
                A paid option, included here because the depth is genuinely greater than the free courses above.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">Satisfies MATE Act</span>
                <span className="text-xs bg-[#dde8cf] text-[#3f5f33] font-medium px-2.5 py-1 rounded-full">12.25 AMA PRA Cat 1</span>
                <span className="text-xs bg-slate-100 text-[#3f4a40] font-medium px-2.5 py-1 rounded-full">On-demand</span>
              </div>
              <a
                href="https://home.hippoed.com/oud-decoded"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#3f5f33] text-[#3f5f33] text-sm font-semibold rounded-xl hover:bg-[#dde8cf] transition-colors"
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
