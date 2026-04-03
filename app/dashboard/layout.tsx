import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

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
    <div className="min-h-screen bg-slate-50">
      <DashboardNav user={session.user} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
