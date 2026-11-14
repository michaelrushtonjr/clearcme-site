import { prisma } from "@/lib/prisma";
import { matchCondition, requirementConditionClause } from "@/lib/conditional-requirements";
import { formatStateName } from "@/lib/state-names";

/**
 * Server side of the setup "practice questions" screen: which conditional
 * requirements turn into a question for this physician, and — before any
 * license is saved — which state / license-type choices will lead to that
 * screen at all, so setup can state its number of steps truthfully.
 */

export interface MatchedRequirement {
  requirementId: string;
  licenseId: string;
  state: string;
  stateName: string;
  licenseType: string;
  name: string;
  clause: string;
  hours: number;
  /** Requirement cadence — decides what an "applies to me" answer may assert */
  cadence: string;
}

/**
 * Cadences whose applicability a practice question can settle.
 *
 * CONDITIONAL is the obvious case, but the widest-reaching example is the
 * federal DEA MATE Act row, which sits in all 51 jurisdictions as a ONE_TIME
 * requirement gated on "If DEA-registered". Leaving it out meant every
 * physician without a DEA registration carried a permanent unresolved 8-hour
 * card. NC and NE gate their EVERY_N_YEARS controlled-substance hours the same
 * way.
 */
export const ASKABLE_CADENCES = [
  "CONDITIONAL",
  "ONE_TIME",
  "FIRST_RENEWAL_ONLY",
  "INITIAL_LICENSE_ONLY",
  "EVERY_N_YEARS",
] as const;

/**
 * Collect every conditional requirement across the user's active licenses that
 * maps to a question we can ask, skipping any the user has already answered.
 */
export async function collectMatches(userId: string) {
  const licenses = await prisma.physicianLicense.findMany({
    where: { userId, isActive: true },
    select: { id: true, state: true, licenseType: true },
  });
  if (licenses.length === 0) return { licenses, byCondition: new Map<string, MatchedRequirement[]>() };

  const rules = await prisma.complianceRule.findMany({
    where: {
      OR: licenses.map((license) => ({
        state: license.state,
        licenseType: license.licenseType,
      })),
    },
    include: {
      mandatoryRequirements: { where: { retiredAt: null, cadence: { in: [...ASKABLE_CADENCES] } } },
    },
  });

  const existing = await prisma.userRequirementCompletion.findMany({
    where: { userId },
    select: { mandatoryRequirementId: true, physicianLicenseId: true },
  });
  const answered = new Set(
    existing.map((row) => `${row.mandatoryRequirementId}:${row.physicianLicenseId ?? "global"}`)
  );

  const byCondition = new Map<string, MatchedRequirement[]>();
  for (const license of licenses) {
    const rule = rules.find(
      (r) => r.state === license.state && r.licenseType === license.licenseType
    );
    if (!rule) continue;
    for (const requirement of rule.mandatoryRequirements) {
      if (answered.has(`${requirement.id}:${license.id}`)) continue;
      if (answered.has(`${requirement.id}:global`)) continue;
      const definition = matchCondition(requirement.notes);
      if (!definition) continue;
      const list = byCondition.get(definition.key) ?? [];
      list.push({
        requirementId: requirement.id,
        licenseId: license.id,
        state: license.state,
        stateName: formatStateName(license.state),
        licenseType: license.licenseType,
        name: requirement.description ?? "Mandatory topic",
        clause: requirementConditionClause(requirement.notes) ?? "",
        hours: requirement.hoursRequired,
        cadence: requirement.cadence,
      });
      byCondition.set(definition.key, list);
    }
  }
  return { licenses, byCondition };
}

/** "NV:MD" — the key setup uses for a state / license-type choice. */
export function licensePairKey(state: string, licenseType: string): string {
  return `${state}:${licenseType}`;
}

export interface PracticeQuestionOutlook {
  /** Every state / license-type pair whose rules raise a practice question for a newly added license. */
  questionPairs: string[];
  /** The licenses this user already holds raise a question they have not answered. */
  hasOpenQuestions: boolean;
}

/**
 * What setup needs to know up front to count its screens: the practice
 * questions screen follows the license steps exactly when a chosen license
 * (or one the user already holds) carries a requirement that maps to a
 * question. Uses the same rows and the same matcher as collectMatches, so the
 * count shown before saving agrees with the questions asked after it.
 */
export async function practiceQuestionOutlook(userId: string): Promise<PracticeQuestionOutlook> {
  const [rules, globalAnswers, { byCondition }] = await Promise.all([
    prisma.complianceRule.findMany({
      select: {
        state: true,
        licenseType: true,
        mandatoryRequirements: {
          where: { retiredAt: null, cadence: { in: [...ASKABLE_CADENCES] } },
          select: { id: true, notes: true },
        },
      },
    }),
    // A new license has no license-scoped answers yet; only answers recorded
    // for every license can silence a question on it.
    prisma.userRequirementCompletion.findMany({
      where: { userId, physicianLicenseId: null },
      select: { mandatoryRequirementId: true },
    }),
    collectMatches(userId),
  ]);
  const answeredEverywhere = new Set(globalAnswers.map((row) => row.mandatoryRequirementId));

  const questionPairs = rules
    .filter((rule) =>
      rule.mandatoryRequirements.some(
        (requirement) => !answeredEverywhere.has(requirement.id) && matchCondition(requirement.notes) !== null
      )
    )
    .map((rule) => licensePairKey(rule.state, rule.licenseType));

  return { questionPairs, hasOpenQuestions: byCondition.size > 0 };
}
