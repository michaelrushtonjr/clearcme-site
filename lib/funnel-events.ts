import { STATE_NAME_BY_CODE } from "@/lib/state-names";

/**
 * The nine named funnel events in PostHog, in the order a physician meets
 * them. Browser events (enroll_click, signup_started, pricing_viewed) go
 * through lib/analytics-client.ts; the rest are recorded on the server by
 * lib/analytics.ts, where the account id is known.
 *
 * No server or PostHog imports here: both sides read this file.
 */
export const FUNNEL_EVENTS = [
  "enroll_click",
  "signup_started",
  "signup_completed",
  "license_saved",
  "certificate_uploaded",
  "free_limit_reached",
  "pricing_viewed",
  "checkout_started",
  "purchase",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

const BROWSER_CLICK_EVENTS = new Set<FunnelEvent>(["enroll_click"]);

/** Where a physician clicked through to a course. */
export type EnrollSurface = "course_page" | "compliance_map" | "course_matches" | "nevada_ethics_page";

/**
 * Attributes for a link that leaves for a course. Server components cannot
 * attach click handlers, so the link carries the event in its markup and one
 * listener (components/analytics/FunnelEvents.tsx) records it.
 *
 * `state` is the license's state where the app knows it. On public pages it is
 * left out and the listener fills in the last state the visitor looked at.
 */
export function enrollClickAttrs(input: {
  topic: string;
  course: string;
  provider?: string;
  state?: string | null;
  surface: EnrollSurface;
}): Record<string, string> {
  return {
    "data-track": "enroll_click",
    "data-track-topic": input.topic,
    "data-track-course": input.course,
    ...(input.provider ? { "data-track-provider": input.provider } : {}),
    ...(input.state ? { "data-track-state": input.state.toUpperCase() } : {}),
    "data-track-surface": input.surface,
  };
}

/**
 * Reads a clicked element's data-track attributes back into an event. Takes
 * the element's `dataset` (data-track-topic arrives as `trackTopic`). Null
 * when the element declares nothing, or names an event the browser may not
 * record from markup.
 */
export function eventFromDataset(
  dataset: Record<string, string | undefined>,
): { event: FunnelEvent; props: Record<string, string> } | null {
  const event = dataset.track as FunnelEvent | undefined;
  if (!event || !BROWSER_CLICK_EVENTS.has(event)) return null;
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(dataset)) {
    if (!key.startsWith("track") || key === "track" || value == null) continue;
    const name = key.slice("track".length).replace(/[A-Z]/g, (letter, index) => `${index ? "_" : ""}${letter.toLowerCase()}`);
    props[name] = value;
  }
  return { event, props };
}

const STATE_CODE_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase().replace(/[^a-z]+/g, "-"), code]),
);

/** "PA" for /cme-requirements/pennsylvania; null for any other path. */
export function stateFromGuidePath(pathname: string): string | null {
  const slug = pathname.match(/^\/cme-requirements\/([a-z-]+)\/?$/)?.[1];
  return slug ? STATE_CODE_BY_SLUG[slug] ?? null : null;
}
