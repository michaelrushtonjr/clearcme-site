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

/**
 * The user has told us a conditional requirement does not apply to their
 * practice (e.g. California's geriatric hours, which only bind a general
 * internist or family physician whose panel is >25% elderly).
 *
 * Stored as a sentinel in `notes` for the same reason NOT_COMPLETED_REQUIREMENT_NOTE
 * is — it needs no schema change, so it ships without a Railway migration.
 * Deliberately NOT modelled as "satisfied": a requirement that never applied is
 * not a requirement the physician met, and showing "✓ Met" for it would put a
 * claim in the audit export that the certificates don't support.
 */
export const NOT_APPLICABLE_REQUIREMENT_NOTE = "__CLEARCME_NOT_APPLICABLE__";

/**
 * A completion that was confirmed from an uploaded certificate stores the
 * certificate id behind this prefix in `notes` — same no-migration sentinel
 * pattern as the two flags above. The link lets the row say what satisfied
 * it ("Satisfied by <cert>") and undo cleanly via the normal clear action.
 */
export const SATISFIED_BY_CERT_NOTE_PREFIX = "__CLEARCME_CERT__:";

export function certificateLinkNote(certificateId: string) {
  return `${SATISFIED_BY_CERT_NOTE_PREFIX}${certificateId}`;
}

export function linkedCertificateId(notes: string | null | undefined): string | null {
  if (!notes?.startsWith(SATISFIED_BY_CERT_NOTE_PREFIX)) return null;
  return notes.slice(SATISFIED_BY_CERT_NOTE_PREFIX.length) || null;
}

interface SatisfyingCertificateCandidate {
  id: string;
  title: string | null;
  fileName: string;
  activityDate: Date | null;
  creditHours: number | null;
  specialTopics: string[];
}

/**
 * Find an uploaded certificate whose extracted topics/hours clearly satisfy
 * an attestable requirement, so the attestation can be pre-filled ("Looks
 * satisfied by <cert>") instead of asking the physician cold.
 *
 * Deliberately conservative: the topic must match and, when the requirement
 * has an hours floor, a single certificate must meet it outright. Searches
 * ALL completed certificates, not just the current cycle — a one-time
 * requirement (e.g. DEA MATE 8 hrs) is satisfied by training from any year.
 * The physician still confirms; this only surfaces the match (Michael's
 * ruling, 2026-08-08).
 */
export function findSatisfyingCertificate<C extends SatisfyingCertificateCandidate>(
  certificates: C[],
  topic: string,
  hoursRequired: number
): C | null {
  const matches = certificates.filter(
    (cert) =>
      cert.specialTopics.includes(topic) &&
      (hoursRequired <= 0 || (cert.creditHours ?? 0) >= hoursRequired)
  );
  if (matches.length === 0) return null;
  // Prefer the most recent activity — the one the physician most likely
  // remembers — breaking ties on hours.
  return matches.sort((a, b) => {
    const dateDiff = (b.activityDate?.getTime() ?? 0) - (a.activityDate?.getTime() ?? 0);
    if (dateDiff !== 0) return dateDiff;
    return (b.creditHours ?? 0) - (a.creditHours ?? 0);
  })[0];
}

export type RequirementFulfillmentStatus = "satisfied" | "due" | "unknown" | "not_applicable";

export interface RequirementFulfillment {
  status: RequirementFulfillmentStatus;
  isSatisfied: boolean;
  isUnknown: boolean;
  isRecurring: boolean;
  isAttestable: boolean;
  satisfiedUntil: Date | null;
  prompt: string | null;
  /**
   * The requirement is out of scope for this physician — excluded from gap
   * maths and from "still outstanding" counts, but never counted as met.
   */
  isNotApplicable: boolean;
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

function markedNotApplicable(completion: CompletionWithStatusLike): boolean {
  return completion?.notes === NOT_APPLICABLE_REQUIREMENT_NOTE;
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

  // The physician has told us this one is out of scope for their practice.
  // Checked before any cadence branch so it holds for conditional, one-time
  // and long-cycle rows alike.
  if (markedNotApplicable(completion)) {
    return {
      status: "not_applicable",
      isSatisfied: false,
      isUnknown: false,
      isRecurring: false,
      isAttestable: true,
      satisfiedUntil: null,
      isNotApplicable: true,
      prompt:
        "You told us this doesn't apply to your practice, so ClearCME leaves it out of your hour totals. Change your answer if your practice changes.",
    };
  }
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
      isNotApplicable: false,
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
      isNotApplicable: false,
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
        isNotApplicable: false,
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
        isNotApplicable: false,
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
        isNotApplicable: false,
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
      isNotApplicable: false,
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
        isNotApplicable: false,
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
        isNotApplicable: false,
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
      isNotApplicable: false,
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
        isNotApplicable: false,
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
        isNotApplicable: false,
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
        isNotApplicable: false,
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
      isNotApplicable: false,
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
    isNotApplicable: false,
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
