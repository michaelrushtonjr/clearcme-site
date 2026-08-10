import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ConsoleShell from "@/components/console/ConsoleShell";

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

  return <ConsoleShell user={session.user}>{children}</ConsoleShell>;
}
