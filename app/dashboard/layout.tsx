import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ConsoleShell from "@/components/console/ConsoleShell";
import { AnalyticsIdentify } from "@/components/analytics/AnalyticsIdentify";

export const metadata = {
  title: "Dashboard — ClearCME",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <AnalyticsIdentify userId={session.user.id} email={session.user.email} name={session.user.name} />
      <ConsoleShell user={session.user}>{children}</ConsoleShell>
    </>
  );
}
