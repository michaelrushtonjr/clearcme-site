import { notFound } from "next/navigation";
import Link from "next/link";
import { COURSE_CATALOG, slugToKey, type Course } from "@/lib/courses";

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Back link */}
        <Link
          href="/dashboard/compliance"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to my compliance map
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {catalog.topicLabel}
          </h1>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-blue-700">
              Requirement: {catalog.requirement}
            </span>
          </div>
        </div>

        {/* Course cards */}
        <div className="space-y-4">
          {catalog.courses.map((course, idx) => {
            const enrollUrl = buildEnrollUrl(course, key);
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                {/* Card top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Provider + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <a
                        href={course.providerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-slate-500 hover:text-blue-600 uppercase tracking-wide transition-colors"
                      >
                        {course.provider}
                      </a>
                      {course.isHippo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-100 rounded-full text-xs font-medium text-purple-700">
                          🦛 via Hippo
                        </span>
                      )}
                      {course.isFree && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700">
                          Free
                        </span>
                      )}
                    </div>
                    {/* Course name */}
                    <h2 className="text-base font-bold text-slate-900">
                      {course.name}
                    </h2>
                  </div>
                  {/* Price pill */}
                  <div className="flex-shrink-0 text-right">
                    {course.isFree ? (
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 rounded-xl text-sm font-bold text-green-700">
                        Free
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700">
                        {course.price}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {course.description}
                </p>

                {/* Credits + CTA */}
                <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    <span className="text-xs text-slate-500 font-medium">
                      {course.credits}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <a
                      href={enrollUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      Enroll
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </a>
                    <span className="text-xs text-slate-400">We show only courses relevant to your missing requirements</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclosure footer */}
        <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-200 pt-6">
          ClearCME may receive a referral commission from paid courses. Free
          courses are listed because they satisfy your requirement, not for
          compensation.
        </p>
      </div>
    </div>
  );
}
