"use client";

import { useState } from "react";

interface Course {
  id: string;
  title: string;
  provider: string;
  hours: number;
  accreditation: string;
  price: number | null; // null = free
  format: string;
  url: string;
}

interface GapCourseRecommendationsProps {
  topic: string;
  topicLabel: string;
  requiredHours: number;
  courses: Course[];
  onClose?: () => void;
}

type FilterKey = "free" | "short" | "cat1" | "live";

const FILTER_LABELS: Record<FilterKey, string> = {
  free: "Free only",
  short: "< 4 hrs",
  cat1: "AMA Cat. 1",
  live: "Live",
};

function CourseCard({ course, onSelect }: { course: Course; onSelect: (c: Course) => void }) {
  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm leading-snug">{course.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{course.provider}</p>
        </div>
        {course.price === null || course.price === 0 ? (
          <span className="flex-shrink-0 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">FREE</span>
        ) : (
          <span className="flex-shrink-0 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">${course.price}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
        <span className="bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">{course.hours} hrs</span>
        <span className="bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">{course.accreditation}</span>
        <span className="bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">{course.format}</span>
      </div>
      <button
        onClick={() => onSelect(course)}
        className="w-full py-2.5 bg-[#0F766E] text-white text-sm font-semibold rounded-xl hover:bg-[#0D9488] transition-colors"
      >
        Get this course →
      </button>
    </div>
  );
}

export default function GapCourseRecommendations({
  topic,
  topicLabel,
  requiredHours,
  courses,
  onClose,
}: GapCourseRecommendationsProps) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [plannedCourse, setPlannedCourse] = useState<Course | null>(null);
  const [markedPlanned, setMarkedPlanned] = useState(false);

  const toggleFilter = (f: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const filtered = courses
    .filter((c) => {
      if (activeFilters.has("free") && c.price !== null && c.price !== 0) return false;
      if (activeFilters.has("short") && c.hours >= 4) return false;
      if (activeFilters.has("cat1") && !c.accreditation.toLowerCase().includes("cat")) return false;
      if (activeFilters.has("live") && c.format.toLowerCase() !== "live") return false;
      return true;
    })
    .sort((a, b) => {
      // Free first, then by hours asc
      const aFree = a.price === null || a.price === 0 ? 0 : 1;
      const bFree = b.price === null || b.price === 0 ? 0 : 1;
      return aFree - bFree || a.hours - b.hours;
    })
    .slice(0, 3);

  const handleSelect = (course: Course) => {
    setPlannedCourse(course);
  };

  const confirmPlanned = () => {
    if (plannedCourse) {
      window.open(plannedCourse.url, "_blank");
    }
    setMarkedPlanned(true);
    setPlannedCourse(null);
  };

  const skipPlanned = () => {
    if (plannedCourse) {
      window.open(plannedCourse.url, "_blank");
    }
    setPlannedCourse(null);
  };

  // "Mark as planned" prompt
  if (plannedCourse && !markedPlanned) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 text-center space-y-3">
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-sm">Mark as planned?</p>
          <p className="text-xs text-slate-500">
            We&apos;ll remind you to upload your certificate after completing{" "}
            <span className="font-medium">{plannedCourse.title}</span>.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmPlanned}
              className="flex-1 py-2.5 bg-[#0F766E] text-white text-sm font-semibold rounded-xl hover:bg-[#0D9488] transition-colors"
            >
              Yes, mark as planned
            </button>
            <button
              onClick={skipPlanned}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (markedPlanned) {
    return (
      <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 text-center space-y-2">
        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-5 h-5 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-slate-800 text-sm">Marked as planned</p>
        <p className="text-xs text-slate-500">We&apos;ll remind you to upload your certificate when you&apos;re done.</p>
        {onClose && (
          <button onClick={onClose} className="text-xs text-[#0F766E] font-medium mt-2 hover:underline">
            Back to compliance map
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">{topicLabel}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{requiredHours} hours required · 3 courses found</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter chips — above the fold */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as FilterKey[]).map((f) => (
          <button
            key={f}
            onClick={() => toggleFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeFilters.has(f)
                ? "bg-[#0F766E] text-white border-[#0F766E]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Course cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-500">
          No courses match your filters.{" "}
          <button onClick={() => setActiveFilters(new Set())} className="text-[#0F766E] font-medium hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
