export default function RenewalSeasonStrip() {
  const text =
    "Renewal coming? Know your gaps before the board asks.";

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
          animation: ticker-scroll 60s linear infinite;
          white-space: nowrap;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-track">
        <span className="inline-flex items-center gap-2 text-sm text-[#0F766E] px-8">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{text}</span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm text-[#0F766E] px-8" aria-hidden="true">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{text}</span>
        </span>
      </div>
    </div>
  );
}
