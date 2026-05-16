import type { MandatoryRequirement, UserRequirementCompletion } from "@prisma/client";

type RequirementLike = Pick<
  MandatoryRequirement,
  "cadence" | "firstRenewalOnly" | "intervalYears" | "lookbackYears" | "topic" | "description" | "notes"
>;

type CompletionLike = Pick<UserRequirementCompletion, "completedAt" | "completedYear"> | null | undefined;
type CompletionWithStatusLike =
  | (Pick<UserRequirementCompletion, "completedAt" | "completedYear" | "notes">)
  | null
  | undefined;

export const NOT_COMPLETED_REQUIREMENT_NOTE = "__CLEARCME_NOT_COMPLETED__";

export type RequirementFulfillmentStatus = "satisfied" | "due" | "unknown" | "not_applicable";

export interface RequirementFulfillment {
  status: RequirementFulfillmentStatus;
  isSatisfied: boolean;
  isUnknown: boolean;
  isRecurring: boolean;
  isAttestable: boolean;
  satisfiedUntil: Date | null;
  prompt: string | null;
}

function completionDate(completion: CompletionLike): Date | null {
  if (!completion) return null;
  if (completion.completedAt) return completion.completedAt;
  if (completion.completedYear) return new Date(Date.UTC(completion.completedYear, 0, 1));
  return null;
}

function explicitlyNotCompleted(completion: CompletionWithStatusLike): boolean {
  return completion?.notes === NOT_COMPLETED_REQUIREMENT_NOTE;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function isHistorySensitiveRequirement(req: RequirementLike) {
  return (
    req.cadence === "ONE_TIME" ||
    req.cadence === "FIRST_RENEWAL_ONLY" ||
    req.cadence === "INITIAL_LICENSE_ONLY" ||
    req.cadence === "EVERY_N_YEARS" ||
    req.firstRenewalOnly
  );
}

export function evaluateRequirementFulfillment({
  requirement,
  completion,
  cycleEnd,
  licenseState,
  licenseIssueDate,
  daysUntilRenewal,
}: {
  requirement: RequirementLike;
  completion: CompletionWithStatusLike;
  cycleEnd: Date;
  licenseState?: string;
  licenseIssueDate?: Date | null;
  daysUntilRenewal?: number | null;
}): RequirementFulfillment {
  const cadence = requirement.firstRenewalOnly && requirement.cadence === "EVERY_RENEWAL"
    ? "ONE_TIME"
    : requirement.cadence;
  const completedOn = completionDate(completion);
  const isExplicitlyNotCompleted = explicitlyNotCompleted(completion);
  const isNearRenewal = daysUntilRenewal !== null && daysUntilRenewal !== undefined && daysUntilRenewal <= 90;
  const isWestVirginiaFinalCsCycle =
    licenseState === "WV" &&
    requirement.topic === "OPIOID_PRESCRIBING" &&
    cycleEnd <= new Date("2026-06-30T23:59:59.999Z");
  const isNevadaDoEvenYearEthicsBucket =
    licenseState === "NV" &&
    requirement.topic === "ETHICS" &&
    `${requirement.description ?? ""} ${requirement.notes ?? ""}`.toLowerCase().includes("even");

  if (isNevadaDoEvenYearEthicsBucket && cycleEnd.getFullYear() % 2 !== 0) {
    return {
      status: "not_applicable",
      isSatisfied: true,
      isUnknown: false,
      isRecurring: true,
      isAttestable: false,
      satisfiedUntil: null,
      prompt: "Nevada DO ethics/pain/addiction/SBIRT CME is only due in even-numbered renewal years.",
    };
  }

  if (isWestVirginiaFinalCsCycle) {
    return {
      status: "due",
      isSatisfied: false,
      isUnknown: false,
      isRecurring: false,
      isAttestable: false,
      satisfiedUntil: null,
      prompt: "West Virginia's 2026 controlled-substance renewal cycle remains a hard requirement before the post-2026 one-time transition.",
    };
  }

  const likelyFirstRenewal = licenseIssueDate
    ? cycleEnd <= addYears(licenseIssueDate, 2)
    : false;

  if (cadence === "ONE_TIME" || cadence === "FIRST_RENEWAL_ONLY" || cadence === "INITIAL_LICENSE_ONLY") {
    if (isExplicitlyNotCompleted) {
      return {
        status: "due",
        isSatisfied: false,
        isUnknown: false,
        isRecurring: false,
        isAttestable: true,
        satisfiedUntil: null,
        prompt: "Marked as not completed yet. ClearCME will keep this as an actionable requirement until you upload or attest completion.",
      };
    }
    if (completedOn || completion) {
      return {
        status: "satisfied",
        isSatisfied: true,
        isUnknown: false,
        isRecurring: false,
        isAttestable: true,
        satisfiedUntil: null,
        prompt: null,
      };
    }
    if (likelyFirstRenewal || isNearRenewal) {
      return {
        status: "due",
        isSatisfied: false,
        isUnknown: false,
        isRecurring: false,
        isAttestable: true,
        satisfiedUntil: null,
        prompt: likelyFirstRenewal
          ? "This appears to be an early renewal window. Confirm completion or treat as due."
          : "Renewal is close. Confirm completion history now or treat this as due.",
      };
    }
    return {
      status: "unknown",
      isSatisfied: false,
      isUnknown: true,
      isRecurring: false,
      isAttestable: true,
      satisfiedUntil: null,
      prompt: "Have you already completed this one-time requirement? Attestations guide recommendations only; keep your original CME documentation.",
    };
  }

  if (cadence === "CONDITIONAL") {
    if (isExplicitlyNotCompleted) {
      return {
        status: "due",
        isSatisfied: false,
        isUnknown: false,
        isRecurring: false,
        isAttestable: true,
        satisfiedUntil: null,
        prompt: "Marked as applicable and not completed yet. ClearCME will track this as an actionable requirement.",
      };
    }
    if (completedOn || completion) {
      return {
        status: "satisfied",
        isSatisfied: true,
        isUnknown: false,
        isRecurring: false,
        isAttestable: true,
        satisfiedUntil: null,
        prompt: null,
      };
    }
    return {
      status: "unknown",
      isSatisfied: false,
      isUnknown: true,
      isRecurring: false,
      isAttestable: true,
      satisfiedUntil: null,
      prompt: "This requirement may depend on your practice or board implementation details. Confirm applicability and keep source documentation.",
    };
  }

  if (cadence === "EVERY_N_YEARS") {
    const intervalYears = requirement.intervalYears ?? requirement.lookbackYears;
    if (isExplicitlyNotCompleted) {
      return {
        status: "due",
        isSatisfied: false,
        isUnknown: false,
        isRecurring: true,
        isAttestable: true,
        satisfiedUntil: null,
        prompt: intervalYears
          ? `Marked as not completed within the last ${intervalYears} years. ClearCME will keep this as an actionable requirement.`
          : "Marked as not completed. ClearCME will keep this as an actionable requirement.",
      };
    }
    if (completedOn && intervalYears) {
      const satisfiedUntil = addYears(completedOn, intervalYears);
      const isSatisfied = satisfiedUntil >= cycleEnd;
      return {
        status: isSatisfied ? "satisfied" : "due",
        isSatisfied,
        isUnknown: false,
        isRecurring: true,
        isAttestable: true,
        satisfiedUntil,
        prompt: isSatisfied ? null : `This is due again if you have not completed it within the last ${intervalYears} years.`,
      };
    }
    if (isNearRenewal) {
      return {
        status: "due",
        isSatisfied: false,
        isUnknown: false,
        isRecurring: true,
        isAttestable: true,
        satisfiedUntil: null,
        prompt: intervalYears
          ? `Renewal is close. Confirm you completed this within the last ${intervalYears} years or treat it as due.`
          : "Renewal is close. Confirm completion history now or treat this as due.",
      };
    }
    return {
      status: "unknown",
      isSatisfied: false,
      isUnknown: true,
      isRecurring: true,
      isAttestable: true,
      satisfiedUntil: null,
      prompt: intervalYears
        ? `When did you last complete this ${intervalYears}-year requirement? Attestations guide recommendations only; keep your original CME documentation.`
        : "When did you last complete this recurring requirement? Attestations guide recommendations only; keep your original CME documentation.",
    };
  }

  return {
    status: "due",
    isSatisfied: false,
    isUnknown: false,
    isRecurring: false,
    isAttestable: false,
    satisfiedUntil: null,
    prompt: null,
  };
}

export function cadenceLabel(requirement: RequirementLike) {
  const cadence = requirement.firstRenewalOnly && requirement.cadence === "EVERY_RENEWAL"
    ? "ONE_TIME"
    : requirement.cadence;
  if (cadence === "ONE_TIME") return "One-time";
  if (cadence === "FIRST_RENEWAL_ONLY") return "First renewal only";
  if (cadence === "INITIAL_LICENSE_ONLY") return "Initial license only";
  if (cadence === "EVERY_N_YEARS") {
    const years = requirement.intervalYears ?? requirement.lookbackYears;
    return years ? `Every ${years} years` : "Recurring long-cycle";
  }
  if (cadence === "CONDITIONAL") return "Conditional";
  return "Every renewal";
}
