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
    <div className="product-app">
      <DashboardSidebar user={session.user} />
      {/* Desktop: offset for sidebar; mobile: full width below top bar */}
      <div className="lg:pl-64">
        {/* Mobile bottom padding clears the tab bar (56px + safe area) plus the
            floating action button that sits above it, so neither covers content. */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-44 lg:pb-8">
          {children}
        </main>
      </div>
      <DashboardFAB />
      <MobileBottomNav />
    </div>
  );
}
