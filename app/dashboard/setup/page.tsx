import { auth } from "@/auth";
import { practiceQuestionOutlook } from "@/lib/practice-questions";
import SetupWizard from "./SetupWizard";

export const metadata = {
  title: "Setup — ClearCME",
};

export default async function SetupPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Lets the wizard say "Step 1 of 5" when the practice-questions screen will
  // follow the four license screens. If this lookup fails, setup still works;
  // it just shows step numbers without a total.
  const outlook = await practiceQuestionOutlook(userId).catch(() => null);

  return (
    <SetupWizard
      userId={userId}
      practiceQuestionPairs={outlook?.questionPairs ?? null}
      hasOpenPracticeQuestions={outlook?.hasOpenQuestions ?? false}
    />
  );
}
