import { evaluateLicense, type LicenseInput, type OverallStatus } from "@/lib/compliance-engine";

export function complianceStatusLabel(status: OverallStatus): string {
  return { COMPLIANT: "Audit-ready", ACTION_NEEDED: "Action needed", UNKNOWN: "Needs your answer", NOT_COMPUTED: "Rules pending" }[status];
}
function view(input: LicenseInput) {
  const evaluation = evaluateLicense(input);
  const generalGapHours = Math.max(0, evaluation.generalHours.required - evaluation.generalHours.counted);
  const mandatoryGaps = evaluation.requirements.map((r) => ({ ...r, needed: r.required, isMet: r.status === "MET", isUnknown: r.status === "UNKNOWN", isNotApplicable: r.status === "NOT_APPLICABLE" }));
  return {
    evaluation, overall: evaluation.overall, statusLabel: complianceStatusLabel(evaluation.overall),
    isCompliant: evaluation.overall === "COMPLIANT", hoursEarned: evaluation.generalHours.counted,
    uncertainHours: evaluation.generalHours.uncertain, generalGapHours,
    gapHours: Math.max(generalGapHours, mandatoryGaps.reduce((sum, r) => sum + r.gap, 0)),
    mandatoryGaps, cycleStart: evaluation.cycleStart, cycleEnd: evaluation.cycleEnd,
  };
}
// Each surface imports its own adapter; tests exercise the same entrypoints as production.
export const dashboardCompliance = (input: LicenseInput) => view(input);
export const compliancePageCompliance = (input: LicenseInput) => view(input);
export const apiCompliance = (input: LicenseInput) => view(input);
export const notificationCompliance = (input: LicenseInput) => view(input);
export const auditCompliance = (input: LicenseInput) => view(input);
