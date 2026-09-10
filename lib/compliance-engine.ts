import type { MandatoryRequirement, Certificate } from "@prisma/client";
import { computedComplianceBlockedMessage, isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { evaluateRequirementFulfillment, linkedCertificateId, NOT_APPLICABLE_REQUIREMENT_NOTE, NOT_COMPLETED_REQUIREMENT_NOTE } from "@/lib/requirement-completions";

export type OverallStatus = "COMPLIANT" | "ACTION_NEEDED" | "UNKNOWN" | "NOT_COMPUTED";
export type RequirementStatus = "MET" | "NOT_MET" | "UNKNOWN" | "NOT_APPLICABLE" | "EXPIRED";
export type EngineRequirement = Pick<MandatoryRequirement, "id" | "topic" | "hoursRequired" | "cadence" | "firstRenewalOnly" | "intervalYears" | "lookbackYears" | "attestationAllowed" | "description" | "notes"> & { retiredAt?: Date | null };
export type EngineCertificate = Pick<Certificate, "id" | "activityDate" | "creditHours" | "extractionStatus" | "specialTopics" | "manuallyVerified" | "title" | "topics" | "creditType" | "accreditation">;
export interface EngineCompletion {
  mandatoryRequirementId: string;
  physicianLicenseId: string | null;
  completedAt: Date | null;
  completedYear: number | null;
  notes: string | null;
}
export interface LicenseInput {
  license: { id: string; state: string; licenseType: string; renewalDate: Date | null; issueDate?: Date | null };
  rule: { totalHours: number; renewalCycle: number; acceptedCreditTypes?: string[] } | null;
  requirements: EngineRequirement[];
  certificates: EngineCertificate[];
  completions: EngineCompletion[];
  today: Date;
}
export interface RequirementEvaluation {
  requirementId: string;
  topic: string;
  status: RequirementStatus;
  earned: number;
  required: number;
  gap: number;
  isAttestable: boolean;
  satisfiedUntil: Date | null;
  prompt: string | null;
}
export interface LicenseEvaluation {
  overall: OverallStatus;
  requirements: RequirementEvaluation[];
  generalHours: { required: number; counted: number; uncertain: number };
  reasons: string[];
  cycleStart: Date;
  cycleEnd: Date;
  countedCertificateIds: string[];
}

export function evaluateLicense(input: LicenseInput): LicenseEvaluation {
  const { license, rule, certificates, completions, today } = input;
  const cycleEnd = license.renewalDate ?? today;
  const cycleStart = new Date(cycleEnd);
  cycleStart.setUTCMonth(cycleStart.getUTCMonth() - (rule?.renewalCycle ?? 0));
  const result: LicenseEvaluation = {
    overall: "NOT_COMPUTED", requirements: [], generalHours: { required: rule?.totalHours ?? 0, counted: 0, uncertain: 0 },
    reasons: [], cycleStart, cycleEnd, countedCertificateIds: [],
  };
  if (!rule || isComputedComplianceBlocked(license.state, license.licenseType)) {
    result.reasons.push(computedComplianceBlockedMessage(license.state, license.licenseType));
    return result;
  }
  const usable = (cert: EngineCertificate) => (cert.extractionStatus === "COMPLETED" || (cert.extractionStatus === "MANUAL" && cert.manuallyVerified)) && Number.isFinite(cert.creditHours) && (cert.creditHours ?? 0) > 0 && cert.activityDate !== null && cert.activityDate <= today;
  const inCycle = (cert: EngineCertificate) => !!cert.activityDate && cert.activityDate >= cycleStart && cert.activityDate <= cycleEnd && cert.activityDate <= today;
  const cycleCertificates = certificates.filter(inCycle);
  for (const cert of cycleCertificates) {
    const hours = Math.max(0, Number.isFinite(cert.creditHours) ? cert.creditHours ?? 0 : 0);
    if (usable(cert)) { result.generalHours.counted += hours; result.countedCertificateIds.push(cert.id); }
    else result.generalHours.uncertain += hours;
  }
  for (const req of input.requirements.filter((r) => !r.retiredAt)) {
    const completion = completions.find((c) => c.mandatoryRequirementId === req.id && c.physicianLicenseId === license.id)
      ?? completions.find((c) => c.mandatoryRequirementId === req.id && c.physicianLicenseId === null);
    const fulfillment = evaluateRequirementFulfillment({ requirement: req, completion, cycleEnd, licenseState: license.state, licenseIssueDate: license.issueDate, daysUntilRenewal: Math.ceil((cycleEnd.getTime() - today.getTime()) / 86400000) });
    const earned = cycleCertificates.filter((c) => usable(c) && c.specialTopics.includes(req.topic)).reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
    const completedAt = completion?.completedAt ?? (completion?.completedYear ? new Date(Date.UTC(completion.completedYear, 0, 1)) : null);
    const explicitNo = completion?.notes === NOT_COMPLETED_REQUIREMENT_NOTE;
    const linkedId = linkedCertificateId(completion?.notes);
    const linked = linkedId ? certificates.find((c) => c.id === linkedId && usable(c)) : undefined;
    const expiry = completedAt && req.lookbackYears ? new Date(completedAt) : null;
    if (expiry) expiry.setUTCFullYear(expiry.getUTCFullYear() + req.lookbackYears!);
    const expired = !!expiry && expiry < cycleEnd;
    const future = !!completedAt && completedAt > today;
    const hasEvidence = !explicitNo && !future && (!!completedAt || !!linked || (!!completion && !linkedId));
    let status: RequirementStatus;
    if (req.notes?.startsWith("UNVERIFIED-CADENCE:")) status = "UNKNOWN";
    else if (completion?.notes === NOT_APPLICABLE_REQUIREMENT_NOTE || fulfillment.status === "not_applicable") status = "NOT_APPLICABLE";
    else if (req.cadence === "CONDITIONAL" && !completion) status = "UNKNOWN";
    else if (req.hoursRequired === 0) status = expired ? "EXPIRED" : hasEvidence ? "MET" : "UNKNOWN";
    else if (earned >= req.hoursRequired) status = "MET";
    else if (expired) status = "EXPIRED";
    else if (linkedId && !linked) status = "UNKNOWN";
    else if (future) status = "UNKNOWN";
    else if (fulfillment.isSatisfied && hasEvidence) status = "MET";
    else status = fulfillment.isUnknown ? "UNKNOWN" : "NOT_MET";
    const prompt = status === "EXPIRED" ? "Completion is outside the required lookback. Confirm current training." : status === "UNKNOWN" ? "Needs your answer" : fulfillment.prompt;
    result.requirements.push({ requirementId: req.id, topic: req.topic, status, earned, required: req.hoursRequired, gap: status === "NOT_MET" || status === "EXPIRED" ? Math.max(0, req.hoursRequired - earned) : 0, isAttestable: req.hoursRequired === 0 || fulfillment.isAttestable, satisfiedUntil: expiry ?? fulfillment.satisfiedUntil, prompt });
    if (status === "UNKNOWN" || status === "EXPIRED" || status === "NOT_MET") result.reasons.push(`${req.id}: ${status}`);
  }
  const unknown = result.requirements.some((r) => r.status === "UNKNOWN") || !license.renewalDate;
  const gap = result.generalHours.counted < result.generalHours.required || result.requirements.some((r) => r.status === "NOT_MET" || r.status === "EXPIRED");
  if (!license.renewalDate) result.reasons.push("Renewal date is missing; the cycle needs your answer.");
  if (result.generalHours.counted < result.generalHours.required) result.reasons.push("General hours requirement is not met by counted certificates.");
  if (result.generalHours.uncertain > 0) result.reasons.push(`${result.generalHours.uncertain} hours pending eligibility review`);
  result.overall = unknown ? "UNKNOWN" : gap ? "ACTION_NEEDED" : "COMPLIANT";
  return result;
}
