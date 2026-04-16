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

  // New three-tier urgency system
  const comfortable =
    daysUntilRenewal != null &&
    daysUntilRenewal > 180 &&
    effectiveHoursNeeded < totalHours * 0.25;
  const critical =
    daysUntilRenewal != null &&
    daysUntilRenewal < 60 &&
    effectiveHoursNeeded > 0;
  const actionZone = !comfortable && !critical && !isCompliant;

  const ringColor = isCompliant
    ? "#22c55e"  // green — truly compliant
    : comfortable
    ? "#0F766E"  // teal — on track
    : critical
    ? "#ef4444"  // red — renewal at risk
    : "#f59e0b"; // amber — action zone

  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  // Pace indicator text
  let paceText: string | null = null;
  let paceColor = "text-slate-500";
  if (isCompliant) {
    paceText = "Complete ✓";
    paceColor = "text-green-600";
  } else if (comfortable) {
    paceText = "You're on track ✓";
    paceColor = "text-teal-600";
  } else if (critical) {
    paceText = "⚠️ Renewal at risk";
    paceColor = "text-red-600";
  } else if (actionZone && hrsPerMonth != null) {
    paceText = `⚡ ${hrsPerMonth.toFixed(1)} hrs/month needed`;
    paceColor = "text-amber-600";
  }

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
      {paceText && (
        <p className={`text-xs font-medium text-center ${paceColor}`}>
          {paceText}
        </p>
      )}
    </div>
  );
}
