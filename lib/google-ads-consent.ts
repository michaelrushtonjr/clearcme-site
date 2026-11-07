// Shared, bounded inputs only. No names, URLs, UTM values or account data.
export const ADS_COOKIE = "clearcme_ads_measurement";
export const ADS_TTL = 30 * 24 * 60 * 60;
export type AdClick = { kind: "gclid" | "wbraid"; value: string };

export function parseAdClick(value: unknown): AdClick | null {
  if (!value || typeof value !== "object") return null;
  const click = value as Record<string, unknown>;
  if ((click.kind !== "gclid" && click.kind !== "wbraid") || typeof click.value !== "string" || !/^[A-Za-z0-9_-]{10,512}$/.test(click.value)) return null;
  return { kind: click.kind as AdClick["kind"], value: click.value };
}

export function adMeasurementBlocked(headers: Pick<Headers, "get">): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1" || /ClearCMEApp/.test(headers.get("user-agent") ?? "");
}

export function browserAdMeasurementBlocked(): boolean {
  return navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || /ClearCMEApp/.test(navigator.userAgent);
}
