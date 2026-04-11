"use client";

interface RenewalRingProps {
  hoursEarned: number;
  totalHours: number;
  daysUntilRenewal: number | null;
  effectiveHoursNeeded: number;
  isCompliant: boolean;
  hrsPerMonth: number | null;
}

export default function RenewalRing({
  hoursEarned,
  totalHours,
  daysUntilRenewal,
  effectiveHoursNeeded,
  isCompliant,
  hrsPerMonth,
}: RenewalRingProps) {
  const pct = totalHours > 0 ? Math.min(1, hoursEarned / totalHours) : 0;
  const pctInt = Math.round(pct * 100);

  const critical = daysUntilRenewal != null && daysUntilRenewal < 90;
  const ringColor =
    isCompliant || pct > 0.75
      ? "#22c55e" // green
      : critical || pct < 0.5
      ? "#ef4444" // red
      : "#f59e0b"; // amber

  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-label={`${pctInt}% of CME hours complete`}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isCompliant ? (
            <span className="text-green-600 text-lg">✓</span>
          ) : effectiveHoursNeeded > 0 ? (
            <>
              <span className="text-xs font-bold text-slate-800 leading-none">
                {effectiveHoursNeeded.toFixed(0)}
              </span>
              <span className="text-[9px] text-slate-400 leading-none mt-0.5">hrs left</span>
            </>
          ) : (
            <span className="text-xs font-bold text-slate-800">{pctInt}%</span>
          )}
        </div>
      </div>
      {/* Pace indicator */}
      {!isCompliant && hrsPerMonth != null && daysUntilRenewal != null && daysUntilRenewal > 0 && (
        <p
          className={`text-xs font-medium text-center ${
            critical ? "text-red-600" : pct >= 0.75 ? "text-green-600" : "text-amber-600"
          }`}
        >
          ⚡ {hrsPerMonth.toFixed(1)} hrs/month needed
        </p>
      )}
      {isCompliant && (
        <p className="text-xs font-medium text-green-600 text-center">On track ✓</p>
      )}
    </div>
  );
}
