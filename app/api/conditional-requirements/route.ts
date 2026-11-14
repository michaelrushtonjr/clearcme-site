import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CONDITION_DEFINITIONS,
  actionForAnswer,
  deaRegistrationFromSetup,
  type ConditionAnswer,
} from "@/lib/conditional-requirements";
import { collectMatches } from "@/lib/practice-questions";
import {
  NOT_APPLICABLE_REQUIREMENT_NOTE,
  NOT_COMPLETED_REQUIREMENT_NOTE,
} from "@/lib/requirement-completions";

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

  // The DEA answer given here is the same answer the federal training record
  // asks for. Store it once so the dashboard and the Licenses page stop asking.
  // Only the registration answer is carried; training completion is never
  // inferred from it.
  const hasDeaRegistration = deaRegistrationFromSetup(rawAnswers, body?.deaRegistration);
  if (hasDeaRegistration !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { hasDeaRegistration } });
  }

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
        where: { id: match.requirementId, retiredAt: null },
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
