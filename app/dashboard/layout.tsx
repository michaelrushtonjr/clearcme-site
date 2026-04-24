import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import DashboardFAB from "@/components/dashboard/DashboardFAB";

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
    <div className="min-h-screen bg-[#FAFAF7]">
      <DashboardSidebar user={session.user} />
      {/* Desktop: offset for sidebar; mobile: full width below top bar */}
      <div className="lg:pl-64">
        {/* pb-20 on mobile to clear the bottom nav bar */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
      <DashboardFAB />
      <MobileBottomNav />
    </div>
  );
}
