import Link from "next/link";

export const metadata = {
  title: "Verification Methodology — ClearCME",
  description:
    "How ClearCME verifies state CME requirements against primary sources.",
};

const verificationTable = [
  {
    state: "Nevada",
    code: "NV",
    lastVerified: "April 2025",
    confidence: "✅ Verified",
    source: "https://medboard.nv.gov/",
    sourceLabel: "Nevada State Board of Medical Examiners",
  },
  {
    state: "California",
    code: "CA",
    lastVerified: "March 2025",
    confidence: "✅ Verified",
    source: "https://www.mbc.ca.gov/",
    sourceLabel: "Medical Board of California",
  },
  {
    state: "Texas",
    code: "TX",
    lastVerified: "March 2025",
    confidence: "✅ Verified",
    source: "https://www.tmb.state.tx.us/",
    sourceLabel: "Texas Medical Board",
  },
  {
    state: "Florida",
    code: "FL",
    lastVerified: "February 2025",
    confidence: "✅ Verified",
    source: "https://flhealthsource.gov/cme/",
    sourceLabel: "Florida Department of Health",
  },
  {
    state: "New York",
    code: "NY",
    lastVerified: "February 2025",
    confidence: "✅ Verified",
    source: "https://www.health.ny.gov/professionals/doctors/",
    sourceLabel: "New York State Department of Health",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF7]">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-[#1E293B] tracking-tight">
          Clear<span className="text-[#0F766E]">CME</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-[#475569] hover:text-[#1E293B] transition-colors">
            Pricing
          </Link>
          <Link href="/mate-act" className="text-sm text-[#475569] hover:text-[#1E293B] transition-colors">
            DEA MATE Act
          </Link>
          <Link href="/login" className="text-sm font-medium text-[#0F766E] hover:text-[#0D9488] transition-colors">
            Sign in →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-[#0F766E] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">
          Data Quality
        </div>
        <h1
          className="font-playfair text-4xl font-bold text-[#1E293B] leading-tight tracking-tight mb-4"
        >
          How ClearCME verifies state CME requirements
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          We hold ourselves to the same standard we expect from accredited CME providers:
          primary sources, documented verification dates, and transparent limitations.
        </p>
      </section>

      {/* Main content */}
      <section className="max-w-3xl mx-auto px-6 pb-16 space-y-10">

        {/* Primary sources */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-[#1E293B] text-xl mb-4 flex items-center gap-2">
            <span className="text-2xl">🏛️</span> Primary sources only
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Every ClearCME requirement entry is verified against primary sources:
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {[
              "Official state medical board websites",
              "State administrative codes and regulations",
              "Published board rules and licensing statutes",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#0F766E] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            We do <strong>not</strong>{" "}rely on third-party CME aggregator sites, commercial databases, or
            crowd-sourced information. If we can&apos;t verify a requirement against a primary source,
            we flag it explicitly.
          </p>
        </div>

        {/* Last verified dates */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-[#1E293B] text-xl mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span> Last verified dates &amp; source URLs
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Every requirement entry in ClearCME includes:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#0F766E] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              A &ldquo;last verified&rdquo; date — so you know when we last confirmed accuracy
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#0F766E] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              A direct source URL to the primary board page or regulation
            </li>
          </ul>
        </div>

        {/* Continuous monitoring */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-[#1E293B] text-xl mb-4 flex items-center gap-2">
            <span className="text-2xl">🔍</span> Continuous monitoring (Vera)
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Our internal QA system, <strong>Vera</strong>, checks requirements against primary sources on a
            rolling basis. High-population states (CA, TX, FL, NY, PA, IL) are reviewed more frequently.
            Vera flags any discrepancies for human review before updates go live.
          </p>
        </div>

        {/* Update frequency */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-[#1E293B] text-xl mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span> Update frequency
          </h2>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <span className="font-semibold text-[#0F766E] whitespace-nowrap">Within 30 days:</span>
              <span className="text-slate-600">Any confirmed regulatory change is updated within 30 days of confirmation.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-semibold text-[#0F766E] whitespace-nowrap">Annual:</span>
              <span className="text-slate-600">All 51 jurisdictions (50 states + DC) are fully re-verified on a 12-month cycle.</span>
            </li>
          </ul>
        </div>

        {/* Known limitations */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <h2 className="font-bold text-[#1E293B] text-xl mb-4 flex items-center gap-2">
            <span className="text-2xl">⚠️</span> Known limitations
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-3">
            We are transparent about what we can&apos;t always verify automatically:
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>
                <strong>JS-rendered pages:</strong> Some state board websites use JavaScript rendering that
                blocks automated verification. We flag these entries explicitly and perform manual verification.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>
                <strong>Emergency rule changes:</strong> Regulatory changes with short notice periods
                may not be reflected within our standard 30-day window. We prioritize these as they come in.
              </span>
            </li>
          </ul>
        </div>

        {/* Discrepancy reporting */}
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6">
          <h2 className="font-bold text-[#1E293B] text-xl mb-3 flex items-center gap-2">
            <span className="text-2xl">📬</span> Found an error?
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            If you believe a requirement is incorrect or outdated, please tell us. We take accuracy
            seriously and investigate all reports within 5 business days.
          </p>
          <a
            href="mailto:accuracy@clearcme.ai"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F766E] text-white text-sm font-semibold rounded-xl hover:bg-[#0D9488] transition-colors"
          >
            Report a discrepancy → accuracy@clearcme.ai
          </a>
        </div>

        {/* Verification status table */}
        <div>
          <h2 className="font-bold text-[#1E293B] text-xl mb-4">Verification status — sample states</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">State</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Last Verified</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Confidence</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verificationTable.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1E293B]">{row.state}</td>
                    <td className="px-4 py-3 text-slate-600">{row.lastVerified}</td>
                    <td className="px-4 py-3">
                      <span className="text-green-700 font-medium">{row.confidence}</span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={row.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0F766E] hover:underline truncate block max-w-[200px]"
                        title={row.sourceLabel}
                      >
                        {row.sourceLabel}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Full verification status for all 51 jurisdictions is available inside the app.
          </p>
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
