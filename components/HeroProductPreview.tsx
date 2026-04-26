// components/HeroProductPreview.tsx
// 3-panel product preview card for the landing page hero section
export default function HeroProductPreview() {
  return (
    <div className="w-full max-w-sm mx-auto lg:mx-0">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F766E] px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          </div>
          <span className="text-white/80 text-xs font-medium ml-1">ClearCME Dashboard</span>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Panel 1: CME total with progress ring */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#0F766E" strokeWidth="3"
                  strokeDasharray="70 30"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#0F766E]">70%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Your CME total</p>
              <p className="text-lg font-bold text-slate-800">28 / 40 hrs</p>
              <p className="text-[10px] text-slate-400">12 hours remaining</p>
            </div>
          </div>

          {/* Panel 2: DEA MATE gap */}
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700 truncate">DEA MATE Act</p>
              <p className="text-[10px] text-red-500">0 / 8 hrs · Required by law</p>
            </div>
            <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5 flex-shrink-0">Missing</span>
          </div>

          {/* Panel 3: Renewal countdown */}
          <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0F766E] truncate">Nevada renewal</p>
              <p className="text-[10px] text-teal-600">July 1, 2026</p>
            </div>
            <span className="text-[10px] font-bold text-white bg-[#0F766E] rounded-full px-2 py-0.5 flex-shrink-0">78 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
