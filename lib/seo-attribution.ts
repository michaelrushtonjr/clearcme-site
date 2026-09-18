// Only public, fixed paths and coarse channels may enter acquisition telemetry.
export const ACQUISITION_COOKIE = "clearcme_acquisition";
export const ACQUISITION_TTL = 30 * 24 * 60 * 60;
export type SeoCluster = "state_requirements" | "course_topics" | "mate_act" | "national_guides" | "product_category";
export type Acquisition = { landing: string; cluster: SeoCluster; channel: "organic_search" | "referral" | "campaign" | "direct_or_unknown"; at: number };
const states = new Set(["california", "texas", "florida", "new-york", "nevada"]);
const guides = new Set(["multi-state-cme-requirements", "how-to-track-cme-credits", "cme-audit-checklist", "cme-requirements-vs-license-renewal", "free-cme-for-mandatory-requirements"]);
const topics = new Set(["substance-use", "opioid-prescribing", "ethics", "implicit-bias", "patient-safety", "suicide-prevention", "domestic-violence", "human-trafficking", "end-of-life-care", "alzheimers-dementia", "child-abuse", "nutrition", "general-category-1"]);
export function seoCluster(path: string): SeoCluster | null {
  if (path === "/cme-requirements" || states.has(path.replace(/^\/cme-requirements\//, "")) && path.startsWith("/cme-requirements/")) return "state_requirements";
  if (path.startsWith("/courses/") && topics.has(path.slice(9))) return "course_topics";
  if (path === "/mate-act") return "mate_act";
  if (path.startsWith("/guides/") && guides.has(path.slice(8))) return "national_guides";
  if (path === "/" || path === "/physician-cme-tracker") return "product_category";
  return null;
}
export function parseAcquisition(raw: string | undefined, now = Date.now()): Acquisition | null {
  if (!raw || raw.length > 600) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw));
    if (typeof value.landing !== "string" || seoCluster(value.landing) !== value.cluster || !seoCluster(value.landing)) return null;
    if (!["organic_search", "referral", "campaign", "direct_or_unknown"].includes(value.channel)) return null;
    if (!Number.isFinite(value.at) || value.at > now || now - value.at > ACQUISITION_TTL * 1000) return null;
    return { landing: value.landing, cluster: value.cluster, channel: value.channel, at: value.at };
  } catch { return null; }
}
export function acquisitionChannel(referrer: string, current: string, hasCampaign: boolean): Acquisition["channel"] {
  if (hasCampaign) return "campaign";
  try {
    const host = new URL(referrer).hostname;
    if (host === new URL(current).hostname) return "direct_or_unknown";
    if (/(^|\.)(google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})|bing\.com|duckduckgo\.com|search\.yahoo\.com|search\.brave\.com|ecosia\.org)$/.test(host)) return "organic_search";
    return "referral";
  } catch { return "direct_or_unknown"; }
}
