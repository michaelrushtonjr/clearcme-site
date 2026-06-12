/**
 * Date helpers for date-only fields (renewalDate, activityDate, issueDate).
 *
 * These values are stored at UTC midnight. Formatting or diffing them in the
 * runtime's local timezone shifts them a day west of UTC (server renders say
 * "Dec 31" while client renders say "Dec 30"), and time-of-day math makes
 * day-counts disagree between pages. Every surface should use these helpers
 * so the same stored date yields the same label and the same countdown.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days from today (UTC) until the given date-only value.
 * Stable for the entire day — no time-of-day flutter, no ceil/floor skew.
 * Returns null when no date is set; negative when the date has passed.
 */
export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((target - today) / DAY_MS);
}

/**
 * Format a date-only value without timezone drift.
 * Defaults to "December 31, 2026"; pass options to override.
 */
export function formatDateUTC(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }
): string {
  return new Date(date).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}
