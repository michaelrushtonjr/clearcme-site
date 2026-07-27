import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CONDITION_DEFINITIONS,
  actionForAnswer,
  matchCondition,
  requirementConditionClause,
  type ConditionAnswer,
} from "@/lib/conditional-requirements";
import {
  NOT_APPLICABLE_REQUIREMENT_NOTE,
  NOT_COMPLETED_REQUIREMENT_NOTE,
} from "@/lib/requirement-completions";
import { formatStateName } from "@/lib/state-names";

interface MatchedRequirement {
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
const ASKABLE_CADENCES = [
  "CONDITIONAL",
  "ONE_TIME",
  "FIRST_RENEWAL_ONLY",
  "INITIAL_LICENSE_ONLY",
  "EVERY_N_YEARS",
] as const;

/**
 * Collect every conditional requirement across the user's active licences that
 * maps to a question we can ask, skipping any the user has already answered.
 */
async function collectMatches(userId: string) {
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
      mandatoryRequirements: { where: { cadence: { in: [...ASKABLE_CADENCES] } } },
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

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { byCondition } = await collectMatches(userId);

  const questions = CONDITION_DEFINITIONS.filter((definition) =>
    byCondition.has(definition.key)
  ).map((definition) => ({
    key: definition.key,
    question: definition.question,
    help: definition.help ?? null,
    requirements: byCondition.get(definition.key) ?? [],
  }));

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rawAnswers: Record<string, unknown> =
    body && typeof body.answers === "object" && body.answers !== null ? body.answers : {};

  const { byCondition } = await collectMatches(userId);

  let recorded = 0;
  for (const definition of CONDITION_DEFINITIONS) {
    const answer = rawAnswers[definition.key];
    // Anything other than an explicit yes/no — including "not sure" — is left
    // unrecorded so the Compliance Map keeps asking rather than guessing.
    if (answer !== "yes" && answer !== "no") continue;

    const matches = byCondition.get(definition.key) ?? [];
    const action = actionForAnswer(definition, answer as ConditionAnswer);

    for (const match of matches) {
      // "Doesn't apply to me" is always safe to record. "Applies to me" is only
      // recorded as still-outstanding for per-cycle requirements, where having
      // logged nothing this cycle makes that true by definition. For one-time
      // and long-cycle rows it would assert a completion history we don't have,
      // so we leave those for the Compliance Map to ask about.
      if (action === "not_completed" && match.cadence !== "CONDITIONAL") continue;
      const sentinel =
        action === "not_applicable"
          ? NOT_APPLICABLE_REQUIREMENT_NOTE
          : NOT_COMPLETED_REQUIREMENT_NOTE;

      const requirement = await prisma.mandatoryRequirement.findFirst({
        where: { id: match.requirementId },
        select: { id: true, topic: true },
      });
      if (!requirement) continue;
      await prisma.userRequirementCompletion.upsert({
        where: {
          userId_mandatoryRequirementId_physicianLicenseId: {
            userId,
            mandatoryRequirementId: match.requirementId,
            physicianLicenseId: match.licenseId,
          },
        },
        create: {
          userId,
          physicianLicenseId: match.licenseId,
          mandatoryRequirementId: match.requirementId,
          topic: requirement.topic,
          completedYear: null,
          completedAt: null,
          notes: sentinel,
        },
        update: {
          completedYear: null,
          completedAt: null,
          notes: sentinel,
          source: "SELF_ATTESTED",
        },
      });
      recorded += 1;
    }
  }

  return NextResponse.json({ ok: true, recorded });
}
