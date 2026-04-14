import Link from "next/link";

interface Gap {
  label: string;
  detail: string;
  href: string;
}

interface Props {
  gaps: Gap[];
  renewalDays: number | null;
}

export default function GapCard({ gaps, renewalDays }: Props) {
  if (gaps.length === 0) return null;

  const isUrgent = renewalDays !== null && renewalDays <= 90;
  const borderColor = isUrgent ? "border-red-200" : "border-amber-200";
  const bgColor = isUrgent ? "bg-red-50" : "bg-amber-50";

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
        {gaps.map((gap, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{gap.label}</p>
              <p className="text-xs text-slate-500">{gap.detail}</p>
            </div>
            <Link
              href={gap.href}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                isUrgent
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              Fix →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
