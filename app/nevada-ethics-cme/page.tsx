import Link from "next/link";
import { PublicShell } from "@/components/PublicSiteShell";
import { Breadcrumbs } from "@/components/seo/Editorial";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Nevada Ethics CME: Free & Low-Cost Course Options | ClearCME",
  "Compare ethics CME options with verified provider prices and hours. Read Nevada MD and DO renewal rules, then organize your certificates in ClearCME.",
  "/nevada-ethics-cme",
);

// Provider facts and Nevada rules independently checked 2026-10-14.
// See docs/marketing/nevada-ethics-source-review.md before changing claims.
const courses = [
  {
    id: "stanford-ai-ethics",
    provider: "Stanford Medicine",
    title: "Ethics of AI in Clinical Practice",
    format: "Recorded discussion",
    price: "Free",
    priceNote: "Provider lists free registration; no paid membership requirement is listed.",
    hours: "0.75",
    expires: "May 22, 2028",
    description: "Ethical decisions about AI in mental health care, including its effects on patients and clinical judgment. Psychiatry and behavioral sciences focus.",
    url: "https://stanford.cloud-cme.com/course/courseoverview?EID=53606&P=0",
    cta: "View Stanford activity",
  },
  {
    id: "aanem-ethics-xvi",
    provider: "AANEM",
    title: "Ethics Vignette XVI: Patient Experience",
    format: "PDF activity",
    price: "$25",
    priceNote: "Nonmember price. Listed as free for AANEM members.",
    hours: "1.00",
    expires: "May 1, 2027",
    description: "Respectful care, consent and patients’ choices in electrodiagnostic testing. Written primarily for technologists and also identified by the provider as relevant to physicians.",
    url: "https://education.aanem.org/Listing/Ethics-Vignette-XVI-Bad-Patient-Experience-vs-Good-Patient-Experience-1098",
    cta: "View AANEM activity",
  },
  {
    id: "corewell-treatment-objection",
    provider: "Corewell Health Southeast Michigan",
    title: "Treatment Over Objection",
    format: "On-demand activity",
    price: "$30",
    priceNote: "Non-Corewell provider price. Free for Corewell providers using internal sign-in.",
    hours: "1.00",
    expires: "April 23, 2029",
    description: "Decision-making capacity and how patients can participate in treatment decisions. The provider explicitly identifies this activity as medical ethics.",
    url: "https://corewellhealtheast.cloud-cme.com/course/courseoverview?EID=95569&P=0",
    cta: "View Corewell activity",
  },
];

export default function NevadaEthicsPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Nevada requirements", href: "/cme-requirements/nevada" },
          { label: "Ethics CME options", href: "/nevada-ethics-cme" },
        ]} />

        <header className="max-w-3xl py-9 sm:py-12">
          <p className="public-kicker mb-5">Nevada physicians · Ethics &amp; bioethics</p>
          <h1 className="public-heading text-4xl sm:text-6xl">Find ethics CME. Keep the record.</h1>
          <p className="public-subhead mt-6">Compare one free activity and two options at $25 and $30. Check the rule for your Nevada license, take the course with its provider, then keep your certificate in ClearCME.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className="public-btn-primary" href="#courses">Compare course options ↓</a>
            <Link className="public-btn-secondary" href="/login" data-seo-cta="nevada-start">Track one state free →</Link>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#656c60]">No ClearCME account needed to browse. Provider prices, hours and dates checked October 14, 2026.</p>
        </header>

        <section aria-labelledby="license-heading" className="mb-12">
          <h2 id="license-heading" className="public-heading mb-5 text-3xl">Start with your license type</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="public-card p-6 sm:p-7">
              <p className="public-kicker mb-3">Nevada MD</p>
              <h3 className="text-xl font-semibold">Next ordinary renewal: June 30, 2027</h3>
              <p className="mt-4 leading-7">The board’s current chart requires at least 2 hours of CME in ethics, pain management or addiction care each biennium. Other topic and specialty requirements also apply.</p>
              <p className="mt-4 text-sm leading-6"><a className="underline underline-offset-4" href="https://medboard.nv.gov/uploadedFiles/mednvgov/content/Licensees/CME_Requirements_MDs_PAs_AAs.pdf">Board’s 2025–2027 CME chart ↗</a><br /><a className="underline underline-offset-4" href="https://www.leg.state.nv.us/NRS/NRS-630.html#NRS630Sec267">Renewal: NRS 630.267(1) ↗</a></p>
            </div>
            <div className="public-card p-6 sm:p-7">
              <p className="public-kicker mb-3">Nevada DO</p>
              <h3 className="text-xl font-semibold">Next ordinary renewal: December 31, 2026</h3>
              <p className="mt-4 leading-7">The biennial 2-hour topic requirement allows ethics, pain management, addiction care or SBIRT. Ethics is one option within that requirement; it does not cover all the CME you need.</p>
              <p className="mt-4 text-sm leading-6"><a className="underline underline-offset-4" href="https://www.leg.state.nv.us/NRS/NRS-633.html#NRS633Sec471">Renewal and topic rule: NRS 633.471(1), (7) ↗</a></p>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-[#4b5349]">These are ordinary renewal dates; special license types and individual circumstances can differ. Review your board notice and the <Link className="font-semibold underline underline-offset-4" href="/cme-requirements/nevada">full Nevada guide</Link>, including the DO 2026 transition, permitted substitutions and other required topics.</p>
        </section>

        <section id="courses" aria-labelledby="courses-heading" className="scroll-mt-48 md:scroll-mt-32">
          <p className="public-kicker mb-3">Provider-verified details</p>
          <h2 id="courses-heading" className="public-heading text-3xl sm:text-4xl">Three ethics CME options to compare</h2>
          <p className="mt-4 max-w-3xl leading-7">Each provider lists AMA PRA Category 1™ designation. These are ethics-related course options, not a Nevada board-approved bundle. Confirm the activity’s fit for your license, topic and completion window before enrolling.</p>
          <div className="mt-7 space-y-5">
            {courses.map((course) => (
              <section key={course.id} className="public-card grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_200px]" aria-labelledby={`${course.id}-heading`}>
                <div>
                  <p className="public-kicker mb-3">{course.provider}</p>
                  <h3 id={`${course.id}-heading`} className="public-heading text-2xl sm:text-3xl">{course.title}</h3>
                  <p className="mt-4 leading-7">{course.description}</p>
                  <p className="mt-3 text-sm leading-6 text-[#656c60]">{course.format} · Expires {course.expires}</p>
                  <p className="mt-3 text-sm leading-6">{course.priceNote}</p>
                </div>
                <div className="flex flex-col items-start border-t border-[#101613]/10 pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <p className="public-heading text-3xl">{course.price}</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{course.hours} hours of CME</p>
                  <p className="mt-1 text-sm text-[#656c60]">AMA PRA Category 1™</p>
                  <a className="public-btn-secondary mt-5" href={course.url} target="_blank" rel="noopener noreferrer" data-seo-course={course.id}>{course.cta} ↗</a>
                </div>
              </section>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-[#4b5349]">The free Stanford activity provides 0.75 hours, not a complete 2-hour option. Prices shown are the providers’ advertised registration prices; check current terms and any taxes at enrollment. Provider accounts may be needed to complete an activity and obtain a certificate. Claim only the hours you complete.</p>
        </section>

        <section className="public-card my-12 p-6 sm:p-8" aria-labelledby="record-heading">
          <p className="public-kicker mb-3">After the course</p>
          <h2 id="record-heading" className="public-heading text-3xl sm:text-4xl">Keep the certificate with your license.</h2>
          <p className="mt-4 max-w-3xl leading-7">Save your completion certificate, review the recorded hours and topic, and keep your Nevada renewal date alongside it. ClearCME’s free plan supports one state.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="public-btn-primary" href="/login" data-seo-cta="nevada-save-certificate">Start with one state free →</Link>
            <Link className="public-btn-secondary" href="/demo" data-seo-cta="nevada-demo">See a sample dashboard →</Link>
          </div>
          <p className="mt-4 text-sm leading-6"><Link href="/pricing" className="underline underline-offset-4">See upload limits and paid plans</Link>. Two states: $99/year. More than two: $199/year.</p>
        </section>

        <section className="max-w-3xl space-y-4 text-sm leading-6 text-[#4b5349]" aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-lg font-semibold">What we checked</h2>
          <p>We read each provider’s activity page for its price, hours, designation and expiration date, and checked the Nevada sources linked above on October 14, 2026. Course descriptions establish topic relevance; they do not establish individual Nevada board acceptance.</p>
          <p>ClearCME does not yet fully account for Nevada’s reduced first-cycle MD totals, MD specialty-hour minimums or the DO 2026 transition. Use your original records and board guidance to resolve those scenarios. ClearCME does not submit your renewal or replace official reporting.</p>
          <p>Read our <Link href="/methodology" className="underline underline-offset-4">verification methodology</Link> or <Link href="/support" className="underline underline-offset-4">report a course or requirement that looks wrong</Link>. Built by <Link href="/about/michael-rushton" className="underline underline-offset-4">Michael Rushton, DO</Link>.</p>
        </section>
      </article>
    </PublicShell>
  );
}
