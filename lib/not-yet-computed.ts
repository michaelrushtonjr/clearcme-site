import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";

/**
 * Wording for states whose rules are listed but not computed in an account
 * (the engine returns NOT_COMPUTED for them — today that is Kansas). Which
 * states those are is decided in lib/compliance-rule-availability.ts, the
 * same check the account uses; this file only supplies the labels, so a
 * picker can never promise numbers the account will not show.
 *
 * No server imports: used by client components.
 */
export const NOT_YET_COMPUTED = "not yet computed";

const LICENSE_TYPES = ["MD", "DO"] as const;

/** True when an account would not compute this state. Without a license type: true only if no type is computed. */
export function isNotYetComputed(stateCode: string, licenseType?: string): boolean {
  if (!stateCode) return false;
  return licenseType
    ? isComputedComplianceBlocked(stateCode, licenseType)
    : LICENSE_TYPES.every((type) => isComputedComplianceBlocked(stateCode, type));
}

/** "Kansas (not yet computed)" in a state picker; the plain name everywhere else. */
export function stateOptionLabel(stateName: string, stateCode: string, licenseType?: string): string {
  return isNotYetComputed(stateCode, licenseType) ? `${stateName} (${NOT_YET_COMPUTED})` : stateName;
}

const REASONS: Record<string, string> = {
  KS: "Kansas lets you choose an 18-, 30- or 42-month lookback for your continuing education, and ClearCME does not track those paths yet.",
};

/** One or two plain sentences on why, and what an account still does. Null when the state is computed. */
export function notYetComputedNote(stateName: string, stateCode: string, licenseType?: string): string | null {
  if (!isNotYetComputed(stateCode, licenseType)) return null;
  const reason = REASONS[stateCode] ?? `ClearCME does not compute hours or gaps for ${stateName} yet.`;
  return `${reason} You can add a ${stateName} license and keep your certificates here, but your account will not show hours or gaps for it.`;
}
