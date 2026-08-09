import { auth } from "@/auth";
import SetupWizard from "./SetupWizard";

export const metadata = {
  title: "Setup — ClearCME",
};

export default async function SetupPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return <SetupWizard userId={userId} />;
}
