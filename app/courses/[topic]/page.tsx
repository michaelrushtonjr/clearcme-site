import { notFound } from "next/navigation";
import Link from "next/link";
import { COURSE_CATALOG, slugToKey, type Course } from "@/lib/courses";
import { PublicShell } from "@/components/PublicSiteShell";
import { Breadcrumbs } from "@/components/seo/Editorial";
import { relatedStatesForTopic } from "@/lib/state-guides";
import { pageMetadata } from "@/lib/seo";
import { providerStateClaims } from "@/lib/course-state-claims";

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
      {/* Order is deliberate: on a phone the first course must start inside the
          first screen, so only the title and a one-line caution sit above the
          list. The full caution, topic context and state links follow it. */}
      <div className="mx-auto max-w-3xl space-y-5 px-6 pb-12 pt-5 sm:space-y-8 sm:py-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "CME requirements", href: "/cme-requirements" }, { label: `${catalog.topicLabel} courses`, href: `/courses/${topic}` }]} />

        <header className="public-card p-5 sm:p-8">
          <div className="mb-5 hidden sm:block"><span className="public-kicker">Course library</span></div>
          <h1 className="public-heading text-2xl sm:text-5xl">{catalog.topicLabel} CME courses</h1>
          <p className="mt-3 text-sm leading-6 text-[#596650] sm:mt-5">
            {catalog.courses.length} {catalog.courses.length === 1 ? "course" : "courses"} listed. A topic match does not establish state approval:{" "}
            <a href="#before-you-enroll" className="font-semibold text-[#3f4a40] underline underline-offset-4">what to confirm before you enroll</a>.
          </p>
          {key === "SUBSTANCE_USE" && <p className="mt-2 text-sm"><Link href="/mate-act" className="font-semibold underline underline-offset-4">Understand the federal DEA MATE Act requirement →</Link></p>}
        </header>

        <div className="space-y-4" id="courses">
          {catalog.courses.map((course, idx) => {
            const enrollUrl = buildEnrollUrl(course, key);
            const exactActivityUrl = hasExactActivityUrl(course);
            const stateClaims = providerStateClaims(course, key);
            const pricePill = course.isFree ? "Free" : course.price.length <= 28 ? course.price : "See pricing";
            const priceNeedsDetail = course.price.trim() !== pricePill;
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
                      <span className="inline-flex items-center rounded-full bg-[#dde8cf] px-3 py-1 text-sm font-bold text-[#3f5f33]">{pricePill}</span>
                    ) : (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#ece4cf] px-3 py-1 text-sm font-semibold text-[#3f4a40]">{pricePill}</span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#3f4a40]">{courseSummary(course)}</p>
                {stateClaims.length > 0 && (
                  <ul className="mt-3 space-y-1.5" aria-label="State requirements named by the provider">
                    {stateClaims.map((claim) => (
                      <li key={claim.state} className="rounded-lg border border-[#bfd1ad] bg-[#eef3e6] px-3 py-2 text-sm leading-snug text-[#2a4123]">
                        <span className="font-semibold">{claim.text}</span>{" "}
                        <span className="text-[#596650]">This is the provider’s statement; confirm with your board.</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Each fact once: the provider is named above the title, the credit
                    line is not repeated beside the button, and the price row
                    appears only when it says more than the price pill does. */}
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <dl className="grid min-w-0 flex-1 gap-3 text-xs leading-relaxed text-[#6b7568]">
                    <div><dt className="font-semibold text-[#3f4a40]">Credit</dt><dd>{shortCreditLabel(course.credits)}</dd></div>
                    {priceNeedsDetail && <div><dt className="font-semibold text-[#3f4a40]">Price</dt><dd>{course.price}</dd></div>}
                  </dl>
                  <div className="flex flex-shrink-0 flex-col gap-1.5 sm:items-end">
                    <a href={enrollUrl} target="_blank" rel="noopener noreferrer" className="public-btn-primary w-full gap-1.5 px-4 py-2 sm:w-auto">
                      {exactActivityUrl ? "Enroll" : "Provider catalog"}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                    {/* Only the exception gets a caption: the button normally opens the course itself. */}
                    {!exactActivityUrl && (
                      <span className="text-xs text-[#6b7568] sm:max-w-[16rem] sm:text-right">
                        Opens the provider’s catalog, not this course’s page. Search there for the course by name.
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* The page header is sticky (about 173px tall on a phone); keep the heading clear of it. */}
        <section id="before-you-enroll" className="public-card scroll-mt-48 p-6 md:scroll-mt-32">
          <h2 className="text-xl font-bold">Before you enroll</h2>
          <p className="mt-2 text-sm leading-7 text-[#596650]">Use this library to discover activities. A topic match does not establish state approval. Confirm your board’s provider, content, credit category, completion window and reporting rules before enrolling.</p>
          <p className="mt-3 text-sm leading-6 text-[#3f4a40]"><span className="font-semibold">Topic context:</span> {catalog.requirement}</p>
        </section>
        {relatedStates.length > 0 && <section className="public-card p-6"><h2 className="text-xl font-bold">States where this topic may be relevant</h2><p className="mt-2 text-sm leading-6">Read the guide for your license type and practice before choosing a course.</p><ul className="mt-4 flex flex-wrap gap-4">{relatedStates.map((state) => <li key={state.slug}><Link className="font-semibold underline underline-offset-4" href={`/cme-requirements/${state.slug}`}>{state.name} requirements →</Link></li>)}</ul></section>}

        <p className="border-t border-[#ddd4bd] pt-6 text-xs leading-relaxed text-[#6b7568]">
          ClearCME may receive a referral commission from paid courses. Use the library to find courses, then confirm with the provider and your board that your chosen activity meets your specific requirement.
        </p>
      </div>
    </PublicShell>
  );
}
