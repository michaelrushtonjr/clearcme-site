import { notFound } from "next/navigation";
import Link from "next/link";
import { COURSE_CATALOG, slugToKey, type Course } from "@/lib/courses";
import { PublicShell } from "@/components/PublicSiteShell";
import { Breadcrumbs } from "@/components/seo/Editorial";
import { relatedStatesForTopic } from "@/lib/state-guides";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export async function generateStaticParams() {
  return Object.keys(COURSE_CATALOG).filter((key) => COURSE_CATALOG[key].courses.length > 0).map((key) => ({
    topic: key.toLowerCase().replace(/_/g, "-"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const key = slugToKey(topic);
  const catalog = COURSE_CATALOG[key];
  if (!catalog?.courses.length) return { title: "Course Not Found — ClearCME", robots: { index: false } };
  return pageMetadata(`${catalog.topicLabel} CME Courses — ClearCME`, `Explore ${catalog.topicLabel} CME courses, compare provider information and review related state requirements before enrolling.`, `/courses/${topic}`);
}

function buildEnrollUrl(course: Course, topicKey: string): string {
  const base = course.url;
  if (!hasExactActivityUrl(course)) return course.providerUrl;
  const sep = base.includes("?") ? "&" : "?";
  const campaign = topicKey.toLowerCase();
  return `${base}${sep}utm_source=clearcme&utm_medium=compliance_gap&utm_campaign=${campaign}`;
}

function hasExactActivityUrl(course: Course): boolean {
  return (
    /^https?:\/\/\S+$/i.test(course.url) &&
    !course.url.includes("(") &&
    !course.url.includes("navigate") &&
    !course.url.includes("/topic/")
  );
}

function courseSummary(course: Course): string {
  const firstSentence = course.description.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 155 && !/satisf|fulfil|meets? |approved for|state.?mandat|compliant/i.test(firstSentence)) return firstSentence;

  if (course.name.toLowerCase().includes("buprenorphine")) {
    return "On-demand opioid CME focused on buprenorphine treatment and OUD care.";
  }
  if (course.name.toLowerCase().includes("opioid")) {
    return "On-demand opioid CME. Verify the activity’s acceptance for your specific requirement.";
  }
  return "Review the provider’s accreditation, topic content and current acceptance before enrolling.";
}

function shortCreditLabel(credits: string): string {
  const hours = credits.match(/\d+(?:\.\d+)?\s*(?:hours?|hrs?)/i)?.[0];
  const creditClass = credits.includes("AMA PRA")
    ? "AMA PRA Category 1"
    : credits.split("/")[0]?.trim();
  return [hours, creditClass].filter(Boolean).join(" · ");
}

export default async function CourseDiscoveryPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const key = slugToKey(topic);
  const catalog = COURSE_CATALOG[key];
  const relatedStates = relatedStatesForTopic(topic);

  if (!catalog?.courses.length || topic !== key.toLowerCase().replace(/_/g, "-")) notFound();

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "CME requirements", href: "/cme-requirements" }, { label: `${catalog.topicLabel} courses`, href: `/courses/${topic}` }]} />

        <header className="public-card p-6 sm:p-8">
          <div className="public-kicker mb-5">Course library</div>
          <h1 className="public-heading text-3xl sm:text-5xl">{catalog.topicLabel} CME courses</h1>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#ddd4bd] bg-[#ece4cf]/55 px-3 py-1.5">
            <svg className="h-4 w-4 text-[#3f5f33]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-[#3f4a40]">Topic context: {catalog.requirement}</span>
          </div>
        </header>

        <p className="text-sm leading-7 text-[#596650]">Use this library to discover activities. A topic match does not establish state approval. Confirm your board’s provider, content, credit category, completion window and reporting rules before enrolling.</p>
        {relatedStates.length > 0 && <section className="public-card p-6"><h2 className="text-xl font-bold">States where this topic may be relevant</h2><p className="mt-2 text-sm leading-6">Read the guide for your license type and practice before choosing a course.</p><ul className="mt-4 flex flex-wrap gap-4">{relatedStates.map((state) => <li key={state.slug}><Link className="font-semibold underline underline-offset-4" href={`/cme-requirements/${state.slug}`}>{state.name} requirements →</Link></li>)}</ul></section>}
        {key === "SUBSTANCE_USE" && <Link href="/mate-act" className="inline-block font-semibold underline">Understand the federal DEA MATE Act requirement →</Link>}
        <div className="space-y-4">
          {catalog.courses.map((course, idx) => {
            const enrollUrl = buildEnrollUrl(course, key);
            const exactActivityUrl = hasExactActivityUrl(course);
            return (
              <article key={idx} className="public-card p-6 transition-all hover:-translate-y-0.5 hover:border-[#bfd1ad]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <a href={course.providerUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-wide text-[#6b7568] transition-colors hover:text-[#3f5f33]">
                        {course.provider}
                      </a>
                      {course.isHippo && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d0ec] bg-[#f0edf8] px-2 py-0.5 text-xs font-medium text-[#725f9e]">
                          via Hippo
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-[#1e2920]">{course.name}</h2>
                  </div>
                  <div className="flex-shrink-0 text-left sm:text-right">
                    {course.isFree ? (
                      <span className="inline-flex items-center rounded-full bg-[#dde8cf] px-3 py-1 text-sm font-bold text-[#3f5f33]">Free</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#ece4cf] px-3 py-1 text-sm font-semibold text-[#3f4a40]">{course.price}</span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#3f4a40]">{courseSummary(course)}</p>
                <dl className="mt-3 grid gap-1.5 text-xs text-[#6b7568] sm:grid-cols-3">
                  <div><dt className="font-semibold text-[#3f4a40]">From</dt><dd>{course.provider}</dd></div>
                  <div><dt className="font-semibold text-[#3f4a40]">Price</dt><dd>{course.price}</dd></div>
                  <div><dt className="font-semibold text-[#3f4a40]">Credit</dt><dd>{shortCreditLabel(course.credits)}</dd></div>
                </dl>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-[#6b7568]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="text-xs font-medium text-[#6b7568]">{shortCreditLabel(course.credits)}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:items-end">
                    <a href={enrollUrl} target="_blank" rel="noopener noreferrer" className="public-btn-primary w-full gap-1.5 px-4 py-2 sm:w-auto">
                      {exactActivityUrl ? "Enroll" : "Provider catalog"}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                    <span className="text-xs text-[#6b7568]">
                      {exactActivityUrl ? "Exact activity link" : "Exact link pending verification"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="border-t border-[#ddd4bd] pt-6 text-xs leading-relaxed text-[#6b7568]">
          ClearCME may receive a referral commission from paid courses. Course listings are for discovery. A state-specific acceptance claim requires a verified activity-to-requirement mapping; check with the provider and your board.
        </p>
      </div>
    </PublicShell>
  );
}
