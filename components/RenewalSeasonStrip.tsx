export default function RenewalSeasonStrip() {
  return (
    <div className="w-full bg-[#F0FDFA] border-t border-b border-[#CCFBF1] py-3 px-6">
      <p className="text-sm sm:text-sm text-xs text-[#0F766E] leading-relaxed">
        <span className="font-semibold">🗓 Renewal season is coming —</span>{" "}
        <span className="font-normal">
          Nevada MDs renew July 1
          {" · "}
          California MDs renew Jan 31 (odd years)
          {" · "}
          California DOs renew Jan 31
          {" · "}
          Texas MDs &amp; DOs renew Aug 31
          {" · "}
          Florida MDs renew Jan 31
          {" · "}
          New York physicians renew every 2 years
          {" · "}
          Illinois MDs renew Jan 31
          {" · "}
          Pennsylvania MDs &amp; DOs renew Dec 31 (even years)
        </span>
      </p>
    </div>
  );
}
