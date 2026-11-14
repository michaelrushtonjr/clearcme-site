import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";

/**
 * Which states an account can compute compliance for, for every place a
 * physician picks a state (setup, the home-page picker).
 *
 * A thin, client-safe wrapper over the engine's own gate
 * (lib/compliance-rule-availability.ts), so a picker can never promise a state
 * the account will then show as "Rules pending". Add a state there, not here.
 */

export const NOT_YET_COMPUTED_LABEL = "not yet computed";

const LICENSE_TYPES = ["MD", "DO"] as const;

/**
 * True when accounts get computed compliance for this state and license type.
 * Without a license type (the state is picked first), a state counts as
 * computed if either license type is.
 */
export function isStateComputed(state: string, licenseType?: string | null): boolean {
  if (licenseType) return !isComputedComplianceBlocked(state, licenseType);
  return LICENSE_TYPES.some((type) => !isComputedComplianceBlocked(state, type));
}

/** "Kansas (not yet computed)" for a state picker; the plain name otherwise. */
export function stateOptionLabel(name: string, state: string, licenseType?: string | null): string {
  return isStateComputed(state, licenseType) ? name : `${name} (${NOT_YET_COMPUTED_LABEL})`;
}

// Plain-language version of the reason the engine gives for holding a state
// (KS_VARIABLE_PATH_MESSAGE in lib/compliance-rule-availability.ts). Keep the
// two in step when that message changes.
const NOT_COMPUTED_REASON: Record<string, string> = {
  KS: "Kansas lets each physician choose an 18-, 30- or 42-month CME lookback period, and ClearCME does not track that choice yet.",
};

/**
 * What to tell a physician who picks a state that is not computed yet: why,
 * what the account still does for them, and what it does not do. Null for a
 * computed state. Every "you still get" item works today for a license whose
 * rules are held: the license and renewal date save, renewal reminders send,
 * certificates store, and the federal DEA record is separate from state rules.
 */
export function notComputedNotice(
  stateName: string,
  state: string,
  licenseType?: string | null
): { title: string; reason: string | null; included: string; notIncluded: string } | null {
  if (isStateComputed(state, licenseType)) return null;
  return {
    title: `${stateName} is ${NOT_YET_COMPUTED_LABEL}.`,
    reason: NOT_COMPUTED_REASON[state] ?? null,
    included:
      "You can still save your license and renewal date, get renewal reminders, store your certificates and keep your federal DEA training record.",
    notIncluded: `ClearCME will not yet count your hours against ${stateName}'s requirements, list what is missing, or show a compliance status for ${stateName}. Check ${stateName}'s requirements with the board.`,
  };
}
