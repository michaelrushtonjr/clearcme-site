const KS_VARIABLE_PATH_MESSAGE =
  "Kansas uses selectable 18-, 30-, or 42-month CE lookback paths. ClearCME is holding computed compliance for Kansas until variable-path tracking is implemented; please review Kansas requirements manually.";

export function isComputedComplianceBlocked(state: string, licenseType: string): boolean {
  return state === "KS" && (licenseType === "MD" || licenseType === "DO");
}

export function computedComplianceBlockedMessage(state: string, licenseType: string): string {
  if (isComputedComplianceBlocked(state, licenseType)) {
    return KS_VARIABLE_PATH_MESSAGE;
  }

  return `Compliance rules for ${state} ${licenseType} not yet loaded.`;
}
