import { auth } from "@/auth";
import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings — ClearCME",
};

function isRequirementApplicableToLicense(
  requirement: { topic: string; description: string | null; notes: string | null },
  license: { state: string; licenseType: string; specialty: string | null; practiceArea: string | null },
  user: { specialty: string | null; practiceArea: string | null } | null,
) {
  const text = `${requirement.description ?? ""} ${requirement.notes ?? ""}`.toLowerCase();
  const isNvDoPsychiatryCulturalCompetency =
    license.state === "NV" &&
    license.licenseType === "DO" &&
    requirement.topic === "CULTURAL_COMPETENCY" &&
    text.includes("psychiat");

  if (!isNvDoPsychiatryCulturalCompetency) return true;

  const specialty = license.specialty ?? user?.specialty ?? "";
  const practiceArea = license.practiceArea ?? user?.practiceArea ?? "";
  return `${specialty} ${practiceArea}`.toLowerCase().includes("psychiat");
}

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [user, licenses, subscription, requirementCompletions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, specialty: true, practiceArea: true },
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        tier: true,
        status: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
    prisma.userRequirementCompletion.findMany({
      where: { userId },
    }),
  ]);

  const licenseRequirements = await Promise.all(
    licenses.map(async (license) => {
      const rule = isComputedComplianceBlocked(license.state, license.licenseType)
        ? null
        : await prisma.complianceRule.findUnique({
            where: {
              state_licenseType: { state: license.state, licenseType: license.licenseType },
            },
            include: { mandatoryRequirements: true },
          });
      return {
        licenseId: license.id,
        state: license.state,
        licenseType: license.licenseType,
        requirements: (rule?.mandatoryRequirements ?? []).filter((req) =>
          (req.firstRenewalOnly || req.cadence !== "EVERY_RENEWAL") &&
          isRequirementApplicableToLicense(req, license, user)
        ),
      };
    })
  );

  const sessionEmail = session?.user?.email ?? null;
  return (
    <SettingsClient
      user={user ?? { id: userId, name: null, email: sessionEmail, image: null, specialty: null, practiceArea: null }}
      licenses={licenses}
      subscription={subscription}
      licenseRequirements={licenseRequirements}
      requirementCompletions={requirementCompletions}
    />
  );
}
