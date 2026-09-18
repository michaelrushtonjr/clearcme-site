"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

import { ACQUISITION_COOKIE, ACQUISITION_TTL, acquisitionChannel, parseAcquisition, seoCluster } from "@/lib/seo-attribution";

function recordClick(event: "cta_click" | "course_click", page: string) {
  const acquisition = parseAcquisition(attributionCookie());
  const body = JSON.stringify({ event, page, channel: acquisition?.channel ?? "direct_or_unknown" });
  void fetch("/api/seo/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}
function attributionCookie() { return document.cookie.split("; ").find((part) => part.startsWith(`${ACQUISITION_COOKIE}=`))?.slice(ACQUISITION_COOKIE.length + 1); }
export function AcquisitionAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    const cluster = seoCluster(pathname);
    if (!cluster || navigator.doNotTrack === "1") return;
    try {
      if (!parseAcquisition(attributionCookie())) {
        const url = new URL(window.location.href);
        const value = { landing: pathname, cluster, channel: acquisitionChannel(document.referrer, url.origin, url.searchParams.has("utm_campaign") || url.searchParams.has("utm_source")), at: Date.now() };
        document.cookie = `${ACQUISITION_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${ACQUISITION_TTL}${location.protocol === "https:" ? "; SameSite=None; Secure" : "; SameSite=Lax"}`;
      }
    } catch { /* Measurement must never block the page. */ }
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      const url = new URL(target.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === "/login") recordClick("cta_click", pathname);
      else if (url.pathname.startsWith("/courses/")) recordClick("course_click", pathname);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);
  return <Analytics beforeSend={(event) => {
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return null;
    const url = new URL(event.url);
    if (!seoCluster(url.pathname) && !["/pricing", "/methodology", "/about/michael-rushton"].includes(url.pathname)) return null;
    // Never send login tokens, query strings, fragments or private app URLs.
    return { ...event, url: `${url.origin}${url.pathname}` };
  }} />;
}

// The authenticated route verifies and atomically records this milestone once.
export function SeoActivation({ activated }: { activated: boolean }) {
  useEffect(() => {
    if (!activated || navigator.doNotTrack === "1") return;
    void fetch("/api/seo/activation", { method: "POST" }).catch(() => {});
  }, [activated]);
  return null;
}
