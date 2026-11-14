"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureEvent, rememberState, rememberedState } from "@/lib/analytics-client";
import { eventFromDataset, stateFromGuidePath } from "@/lib/funnel-events";

/**
 * One listener for events declared in markup (data-track, see
 * lib/funnel-events.ts). Mounted once in the root layout, so links rendered by
 * server components are covered without turning them into client components.
 */
export function FunnelEvents() {
  const pathname = usePathname();

  // A visitor reading Pennsylvania's guide who then clicks Enroll on a course
  // page is a Pennsylvania click: remember the last state guide for this tab.
  useEffect(() => {
    const state = stateFromGuidePath(pathname);
    if (state) rememberState(state);
  }, [pathname]);

  useEffect(() => {
    const record = (event: MouseEvent) => {
      // Left click, or middle click (opens the course in a new tab).
      if (event.type === "auxclick" && event.button !== 1) return;
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-track]") : null;
      if (!element) return;
      const declared = eventFromDataset(element.dataset);
      if (!declared) return;
      const properties: Record<string, string | null> = { ...declared.props, page: window.location.pathname };
      if (declared.event === "enroll_click") {
        if (properties.state) {
          properties.state_source = "license";
        } else {
          const viewed = rememberedState();
          properties.state = viewed;
          properties.state_source = viewed ? "last_state_viewed" : "unknown";
        }
      }
      captureEvent(declared.event, properties);
    };
    document.addEventListener("click", record);
    document.addEventListener("auxclick", record);
    return () => {
      document.removeEventListener("click", record);
      document.removeEventListener("auxclick", record);
    };
  }, []);

  return null;
}

/**
 * Records pricing_viewed once per page load: at once on the pricing page, and
 * on the home page when the price cards scroll into view.
 */
export function usePricingViewed(surface: "pricing_page" | "home_section", elementId?: string) {
  useEffect(() => {
    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      const checkout = new URLSearchParams(window.location.search).get("checkout")?.toLowerCase();
      captureEvent("pricing_viewed", {
        surface,
        // Arriving with a plan already chosen forwards straight to checkout.
        plan: checkout === "essential" || checkout === "pro" ? checkout : null,
      });
    };
    const element = elementId ? document.getElementById(elementId) : null;
    if (!element || !("IntersectionObserver" in window)) {
      if (!elementId) send();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          send();
          observer.disconnect();
        }
      },
      // Counts once the section is a quarter of the way up the screen, whatever its height.
      { threshold: 0, rootMargin: "0px 0px -25% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [surface, elementId]);
}
