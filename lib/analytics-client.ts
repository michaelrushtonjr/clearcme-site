import posthog from "posthog-js";
import type { FunnelEvent } from "@/lib/funnel-events";

type Properties = Record<string, string | number | boolean | null | undefined>;

/**
 * Records a named funnel event from the browser. PostHog is started in
 * instrumentation-client.ts only when NEXT_PUBLIC_POSTHOG_KEY is set
 * (Production), so on local and preview builds this does nothing. It never
 * throws: nothing a visitor does may depend on measurement.
 *
 * `instant` sends without waiting for the next batch, for clicks that leave
 * the page straight away (a sign-in button).
 */
export function captureEvent(event: FunnelEvent, properties: Properties = {}, options: { instant?: boolean } = {}) {
  try {
    if (!posthog.__loaded) return;
    posthog.capture(event, properties, options.instant ? { send_instantly: true } : undefined);
  } catch {
    // Measurement must never break the page.
  }
}

const STATE_KEY = "clearcme_state_viewed";
const KNOWN_BROWSER_KEY = "clearcme_known_browser";

/** The last state this visitor looked at (a state guide, or the home-page picker), for this tab. */
export function rememberState(stateCode: string) {
  try {
    if (/^[A-Z]{2}$/.test(stateCode)) window.sessionStorage.setItem(STATE_KEY, stateCode);
  } catch {
    // Storage can be unavailable (private mode); the event just goes without a state.
  }
}

export function rememberedState(): string | null {
  try {
    return window.sessionStorage.getItem(STATE_KEY);
  } catch {
    return null;
  }
}

/** Marks a browser that has been signed in, so a later sign-in is not counted as a new signup starting. */
export function markKnownBrowser() {
  try {
    window.localStorage.setItem(KNOWN_BROWSER_KEY, "1");
  } catch {
    // See rememberState.
  }
}

export function isKnownBrowser(): boolean {
  try {
    return window.localStorage.getItem(KNOWN_BROWSER_KEY) === "1";
  } catch {
    return false;
  }
}
