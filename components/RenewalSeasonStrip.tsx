export default function RenewalSeasonStrip() {
  const text =
    "🗓 Renewal season is coming — Nevada MDs renew July 1 · California MDs renew Jan 31 (odd years) · California DOs renew Jan 31 · Texas MDs & DOs renew Aug 31 · Florida MDs renew Jan 31 · New York physicians renew every 2 years · Illinois MDs renew Jan 31 · Pennsylvania MDs & DOs renew Dec 31 (even years)";

  return (
    <div
      className="w-full bg-[#F0FDFA] border-t border-b border-[#CCFBF1] py-2 overflow-hidden"
      aria-label="Renewal season information"
    >
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker-scroll 40s linear infinite;
          white-space: nowrap;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-track">
        <span className="text-sm text-[#0F766E] px-8">{text}</span>
        <span className="text-sm text-[#0F766E] px-8" aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
