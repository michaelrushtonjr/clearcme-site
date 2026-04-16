import Link from "next/link";

interface Gap {
  label: string;
  detail: string;
  href: string;
}

interface Props {
  gaps: Gap[];
  renewalDays: number | null;
  allGapsCount?: number;
}

export default function GapCard({ gaps, renewalDays, allGapsCount }: Props) {
  if (gaps.length === 0) return null;

  const isUrgent = renewalDays !== null && renewalDays <= 90;
  const borderColor = isUrgent ? "border-red-200" : "border-amber-200";
  const bgColor = isUrgent ? "bg-red-50" : "bg-amber-50";

  // Show max 3 items; compute overflow
  const MAX_VISIBLE = 3;
  const visibleGaps = gaps.slice(0, MAX_VISIBLE);
  const totalCount = allGapsCount ?? gaps.length;
  const overflowCount = totalCount - MAX_VISIBLE;

  // Check if all gaps share the same renewal deadline
  const allSameDeadline =
    overflowCount > 0 &&
    gaps.every((g) => g.detail === gaps[0].detail) &&
    gaps[0].detail.includes("days to renewal") === false &&
    gaps[0].detail !== "Mandatory topic requirement";

  return (
    <div className={`${bgColor} ${borderColor} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isUrgent ? "bg-red-500" : "bg-amber-500"} animate-pulse`} />
          <h3 className={`font-semibold text-sm ${isUrgent ? "text-red-900" : "text-amber-900"}`}>
            What still needs attention
          </h3>
        </div>
        {renewalDays !== null && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          }`}>
            {renewalDays <= 0 ? "Renewal overdue" : `${renewalDays} days to renewal`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {visibleGaps.map((gap, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{gap.label}</p>
              <p className="text-xs text-slate-500">{gap.detail}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <Link
                href={gap.href}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  isUrgent
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-amber-600 text-white hover:bg-amber-700"
                }`}
              >
                Fix →
              </Link>
              <span className="text-xs text-slate-400">We show only courses relevant to your missing requirements</span>
            </div>
          </div>
        ))}
      </div>

      {/* Overflow count */}
      {overflowCount > 0 && (
        <p className="text-sm text-slate-500 italic text-center mt-3">
          {allSameDeadline
            ? `+ ${overflowCount} more item${overflowCount === 1 ? "" : "s"} due ${gaps[0].detail}`
            : `+ ${overflowCount} more item${overflowCount === 1 ? "" : "s"}`}
        </p>
      )}
    </div>
  );
}
