// Michael approved this exact text on 2026-09-16. Do not paraphrase deadlines.
export const MATE_ACT_TEXT = "One-time DEA requirement. Eight hours of training on treating and managing patients with opioid or other substance use disorders must be completed by the date of your first DEA registration or renewal on or after June 27, 2023. It is attested once and is not repeated at later renewals. Physicians board-certified in addiction medicine or addiction psychiatry (ABMS), and those who graduated from a U.S. medical school within five years of June 27, 2023 with the required curriculum, are deemed to have met it. — Source: DEA Diversion Control Division, MATE Act FAQ (https://www.deadiversion.usdoj.gov/faq/MATE_Act_faq.html).";
export const MATE_ACT_SOURCE = "https://www.deadiversion.usdoj.gov/faq/MATE_Act_faq.html";
const CUTOFF = new Date("2023-06-27T00:00:00Z");
export interface DeaRegistration {
  registeredAt?: Date | string | null;
  firstQualifyingAt?: Date | string | null;
  // Explicitly confirmed first qualifying renewal, never the current expiration.
  firstRenewalOnOrAfterCutoff?: Date | string | null;
}
export function mateActDeadline(registration: DeaRegistration = {}) {
  const dates = [registration.registeredAt, registration.firstRenewalOnOrAfterCutoff, registration.firstQualifyingAt]
    .filter((value) => value != null).map((value) => {
      const date = new Date(value!);
      if (typeof value === "string" && (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value.slice(0, 10))) return new Date(NaN);
      return date;
    })
    .filter((date) => Number.isFinite(date.getTime()) && date >= CUTOFF)
    .sort((a, b) => a.getTime() - b.getTime());
  return { date: dates[0] ?? null, status: dates.length ? "KNOWN" as const : "UNKNOWN" as const, text: MATE_ACT_TEXT };
}

export function isStateRequirement(requirement: { description?: string | null }) {
  return !/^\s*(?:Federal\s+)?(?:DEA\s+)?MATE\s+Act\b/i.test(requirement.description ?? "");
}
