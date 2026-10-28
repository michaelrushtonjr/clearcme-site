"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { browserAdMeasurementBlocked, parseAdClick, type AdClick } from "@/lib/google-ads-consent";
import { seoCluster } from "@/lib/seo-attribution";

export function AdMeasurementChoice() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [click, setClick] = useState<AdClick | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const publicPage = Boolean(seoCluster(pathname)) || ["/pricing", "/privacy", "/methodology", "/about/michael-rushton"].includes(pathname);

  useEffect(() => {
    if (browserAdMeasurementBlocked()) {
      // Honor a newly enabled privacy signal for pending events as well.
      void fetch("/api/ads/measurement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: "denied" }) }).catch(() => {});
      return;
    }
    if (!publicPage) return;
    let active = true;
    // Until explicit consent, the click ID stays only in the landing page URL.
    const params = new URLSearchParams(window.location.search);
    const incoming = seoCluster(pathname) ? parseAdClick(params.has("gclid") ? { kind: "gclid", value: params.get("gclid") } : { kind: "wbraid", value: params.get("wbraid") }) : null;
    void fetch("/api/ads/measurement", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const state = await response.json();
      if (!active || !state.enabled) return;
      setEnabled(true);
      setClick(incoming);
      setOpen(Boolean(incoming) && !state.choice);
      if (incoming && state.choice === "granted" && !browserAdMeasurementBlocked()) {
        // A later paid landing updates attribution only after earlier opt-in.
        await fetch("/api/ads/measurement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: "granted", click: incoming, page: pathname }) });
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [pathname, publicPage]);

  async function choose(choice: "granted" | "denied") {
    setSaving(true); setError(false);
    try {
      const response = await fetch("/api/ads/measurement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, ...(choice === "granted" && click ? { click, page: pathname } : {}) }),
      });
      if (!response.ok) throw new Error();
      setOpen(false);
    } catch { setError(true); }
    finally { setSaving(false); }
  }

  if (!enabled || !publicPage || browserAdMeasurementBlocked()) return null;
  return <aside aria-label="Advertising measurement" className="fixed bottom-4 left-4 z-50 max-w-sm rounded-xl border border-[#c9d1c4] bg-[#f7f8f3] p-4 text-sm text-[#1e2920] shadow-lg">
    {open ? <>
      <h2 className="font-semibold">Allow ad measurement?</h2>
      <p className="mt-2">With your permission, we store a Google ad-click identifier for up to 30 days. If you create an account, we send Google that identifier, the registration time and a random event ID. We exclude your name, email, license and CME details. This does not enable personalized ads.</p>
      <a className="mt-2 inline-block underline" href="https://clearcme.ai/privacy">Privacy policy</a>
      <div className="mt-3 flex gap-3">
        <button type="button" className="rounded border border-[#65795c] px-3 py-2" disabled={saving} onClick={() => void choose("denied")}>Decline</button>
        <button type="button" className="rounded border border-[#65795c] px-3 py-2" disabled={saving} onClick={() => void choose("granted")}>Allow</button>
      </div>
      {error && <p role="alert" className="mt-2">Your choice could not be saved. Please try again.</p>}
    </> : <button type="button" onClick={() => setOpen(true)}>Ad measurement settings</button>}
  </aside>;
}
