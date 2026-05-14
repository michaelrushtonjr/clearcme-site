import { notFound } from "next/navigation";
import Link from "next/link";
import { COURSE_CATALOG, slugToKey, type Course } from "@/lib/courses";
import { PublicShell } from "@/components/PublicSiteShell";

export async function generateStaticParams() {
  return Object.keys(COURSE_CATALOG).map((key) => ({
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
  if (!catalog) return { title: "Course Not Found — ClearCME" };
  return {
    title: `${catalog.topicLabel} CME Courses — ClearCME`,
    description: `Find accredited CME courses for ${catalog.topicLabel}. Requirement: ${catalog.requirement}.`,
  };
}

function buildEnrollUrl(course: Course, topicKey: string): string {
  const base = course.url;
  const sep = base.includes("?") ? "&" : "?";
  const campaign = topicKey.toLowerCase();
  return `${base}${sep}utm_source=clearcme&utm_medium=compliance_gap&utm_campaign=${campaign}`;
}

export default async function CourseDiscoveryPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const key = slugToKey(topic);
  const catalog = COURSE_CATALOG[key];

  if (!catalog) notFound();

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <Link href="/dashboard/compliance" className="public-quiet-link inline-flex items-center gap-1.5 text-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to my compliance map
        </Link>

        <header className="public-card p-6 sm:p-8">
          <div className="public-kicker mb-5">Course match</div>
          <h1 className="public-heading text-3xl sm:text-5xl">{catalog.topicLabel}</h1>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#ddd4bd] bg-[#ece4cf]/55 px-3 py-1.5">
            <svg className="h-4 w-4 text-[#3f5f33]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-[#3f4a40]">Requirement: {catalog.requirement}</span>
          </div>
        </header>

        <div className="space-y-4">
          {catalog.courses.map((course, idx) => {
            const enrollUrl = buildEnrollUrl(course, key);
            return (
              <article key={idx} className="public-card p-6 transition-all hover:-translate-y-0.5 hover:border-[#bfd1ad]">
                <div className="flex items-start justify-between gap-4">
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
                      {course.isFree && (
                        <span className="inline-flex items-center rounded-full border border-[#bfd1ad] bg-[#dde8cf] px-2 py-0.5 text-xs font-semibold text-[#3f5f33]">
                          Free
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-[#1e2920]">{course.name}</h2>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {course.isFree ? (
                      <span className="inline-flex items-center rounded-full bg-[#dde8cf] px-3 py-1 text-sm font-bold text-[#3f5f33]">Free</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#ece4cf] px-3 py-1 text-sm font-semibold text-[#3f4a40]">{course.price}</span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#3f4a40]">{course.description}</p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-[#6b7568]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="text-xs font-medium text-[#6b7568]">{course.credits}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <a href={enrollUrl} target="_blank" rel="noopener noreferrer" className="public-btn-primary gap-1.5 px-4 py-2">
                      Enroll
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                    <span className="text-xs text-[#6b7568]">We show only courses relevant to your missing requirements</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="border-t border-[#ddd4bd] pt-6 text-xs leading-relaxed text-[#6b7568]">
          ClearCME may receive a referral commission from paid courses. Free
          courses are listed because they satisfy your requirement, not for
          compensation.
        </p>
      </div>
    </PublicShell>
  );
}
