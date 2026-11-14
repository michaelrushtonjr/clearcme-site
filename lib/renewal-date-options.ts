import { getRenewalRuleConfig, type LicenseType, type StateCode } from "@/lib/state-requirements";

/**
 * Renewal dates a physician can pick from instead of typing.
 *
 * Some boards assign each physician to one of a small, known set of renewal
 * dates. The rule file marks those "variable", because ClearCME cannot tell
 * which group a physician is in, so setup used to show a blank date field.
 * The date is still one of two — offering both as buttons is quicker and
 * avoids a mistyped year.
 *
 * Each entry is tied to the exact renewal wording in
 * lib/state-requirements.ts. If that wording changes, the entry switches
 * itself off rather than offering dates the rule no longer supports; nothing
 * here is a second source of truth for a renewal date.
 */
interface AssignedDateRule {
  /** renewalDeadline text this entry was written against */
  wording: string;
  month: number;
  day: number;
  /** How many upcoming occurrences cover every group (2 = odd-year and even-year groups). */
  groups: number;
}

const ASSIGNED_DATE_RULES: Record<string, AssignedDateRule> = {
  // Florida MD: January 31, in either the odd-year or the even-year group.
  "FL:MD": { wording: "January 31 of your assigned odd- or even-year biennium", month: 1, day: 31, groups: 2 },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface RenewalDateOption {
  /** yyyy-mm-dd, the value a date input takes */
  date: string;
  /** "Jan 31, 2027" */
  label: string;
}

/**
 * The next possible renewal dates for a state and license type whose board
 * assigns one of a known set, soonest first. Empty for every other state, and
 * empty if the rule file's wording no longer matches.
 */
export function assignedRenewalDateOptions(
  state: string,
  licenseType: string,
  referenceDate: Date = new Date()
): RenewalDateOption[] {
  const rule = ASSIGNED_DATE_RULES[`${state}:${licenseType}`];
  if (!rule) return [];
  const config = getRenewalRuleConfig(state as StateCode, licenseType as LicenseType);
  if (config.renewalType !== "variable" || config.renewalDeadline !== rule.wording) return [];

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const options: RenewalDateOption[] = [];
  for (let year = today.getFullYear(); options.length < rule.groups; year += 1) {
    if (new Date(year, rule.month - 1, rule.day) < today) continue;
    const mm = String(rule.month).padStart(2, "0");
    const dd = String(rule.day).padStart(2, "0");
    options.push({ date: `${year}-${mm}-${dd}`, label: `${MONTHS[rule.month - 1]} ${rule.day}, ${year}` });
  }
  return options;
}
