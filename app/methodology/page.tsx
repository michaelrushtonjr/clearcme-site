import { PublicShell } from "@/components/PublicSiteShell";

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

const checkItems = [
  "Official state medical board websites",
  "State administrative codes and regulations",
  "Published board rules and licensing statutes",
];

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#3f5f33]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function MethodologyPage() {
  return (
    <PublicShell links={[{ href: "/pricing", label: "Pricing" }, { href: "/mate-act", label: "DEA MATE Act" }]}> 
      <section className="public-hero mx-auto max-w-3xl text-left sm:text-center">
        <div className="public-kicker mb-6">Data Quality</div>
        <h1 className="public-heading mb-5 text-4xl sm:text-5xl">
          How ClearCME verifies state CME requirements
        </h1>
        <p className="public-subhead mx-auto max-w-2xl">
          We hold ourselves to the same standard we expect from accredited CME providers:
          primary sources, documented verification dates, and transparent limitations.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-6 pb-16">
        <div className="public-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#1e2920]">
            <span className="text-2xl">🏛️</span> Primary sources only
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-[#3f4a40]">
            Every ClearCME requirement entry is verified against primary sources:
          </p>
          <ul className="space-y-2 text-sm text-[#3f4a40]">
            {checkItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckIcon />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-[#6b7568]">
            We do <strong>not</strong> rely on third-party CME aggregator sites, commercial databases, or
            crowd-sourced information. If we can&apos;t verify a requirement against a primary source,
            we flag it explicitly.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="public-card public-card-soft p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1e2920]">
              <span className="text-2xl">📅</span> Last verified dates &amp; source URLs
            </h2>
            <ul className="space-y-2 text-sm text-[#3f4a40]">
              <li className="flex items-start gap-2"><CheckIcon />A “last verified” date — so you know when we last confirmed accuracy</li>
              <li className="flex items-start gap-2"><CheckIcon />A direct source URL to the primary board page or regulation</li>
            </ul>
          </div>

          <div className="public-card public-card-soft p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1e2920]">
              <span className="text-2xl">🔍</span> Continuous monitoring (Vera)
            </h2>
            <p className="text-sm leading-relaxed text-[#3f4a40]">
              Our internal QA system, <strong>Vera</strong>, checks requirements against primary sources on a
              rolling basis. High-population states (CA, TX, FL, NY, PA, IL) are reviewed more frequently.
              Vera flags any discrepancies for human review before updates go live.
            </p>
          </div>
        </div>

        <div className="public-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#1e2920]">
            <span className="text-2xl">⚡</span> Update frequency
          </h2>
          <ul className="space-y-3 text-sm text-[#3f4a40]">
            <li className="flex items-start gap-3">
              <span className="whitespace-nowrap font-semibold text-[#3f5f33]">Within 30 days:</span>
              <span>Any confirmed regulatory change is updated within 30 days of confirmation.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="whitespace-nowrap font-semibold text-[#3f5f33]">Annual:</span>
              <span>All 51 jurisdictions (50 states + DC) are fully re-verified on a 12-month cycle.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-[22px] border border-[#e9d29a] bg-[#fbf1dc]/70 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#1e2920]">
            <span className="text-2xl">⚠️</span> Known limitations
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-[#3f4a40]">
            We are transparent about what we can&apos;t always verify automatically:
          </p>
          <ul className="space-y-2 text-sm text-[#3f4a40]">
            <li><strong>JS-rendered pages:</strong> Some state board websites use JavaScript rendering that blocks automated verification. We flag these entries explicitly and perform manual verification.</li>
            <li><strong>Emergency rule changes:</strong> Regulatory changes with short notice periods may not be reflected within our standard 30-day window. We prioritize these as they come in.</li>
          </ul>
        </div>

        <div className="rounded-[22px] border border-[#bfd1ad] bg-[#dde8cf]/70 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-[#1e2920]">
            <span className="text-2xl">📬</span> Found an error?
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-[#3f4a40]">
            If you believe a requirement is incorrect or outdated, please tell us. We take accuracy
            seriously and investigate all reports within 5 business days.
          </p>
          <a href="mailto:accuracy@clearcme.ai" className="public-btn-primary">
            Report a discrepancy → accuracy@clearcme.ai
          </a>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-[#1e2920]">Verification status — sample states</h2>
          <div className="overflow-x-auto rounded-[22px] border border-[#ddd4bd] bg-[#fffdf6]/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ddd4bd] bg-[#ece4cf]/60">
                  <th className="px-4 py-3 text-left font-semibold text-[#3f4a40]">State</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3f4a40]">Last Verified</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3f4a40]">Confidence</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3f4a40]">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece3ca]">
                {verificationTable.map((row) => (
                  <tr key={row.code} className="transition-colors hover:bg-[#ece4cf]/40">
                    <td className="px-4 py-3 font-medium text-[#1e2920]">{row.state}</td>
                    <td className="px-4 py-3 text-[#3f4a40]">{row.lastVerified}</td>
                    <td className="px-4 py-3"><span className="font-medium text-[#3f5f33]">{row.confidence}</span></td>
                    <td className="px-4 py-3">
                      <a href={row.source} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] truncate text-[#3f5f33] hover:underline" title={row.sourceLabel}>
                        {row.sourceLabel}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[#6b7568]">Full verification status for all 51 jurisdictions is available inside the app.</p>
        </div>
      </section>
    </PublicShell>
  );
}
