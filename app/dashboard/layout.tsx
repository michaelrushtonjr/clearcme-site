import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";

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
      <DashboardSidebar user={session.user} />
      {/* Desktop: offset for sidebar; mobile: full width below top bar */}
      <div className="lg:pl-64">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
