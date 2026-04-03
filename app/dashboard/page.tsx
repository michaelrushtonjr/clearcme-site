import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CreditSummaryCard from "@/components/dashboard/CreditSummaryCard";
import GapAlerts from "@/components/dashboard/GapAlerts";
import CertificateList from "@/components/dashboard/CertificateList";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Fetch data in parallel
  const [certificates, complianceStatuses, licenses] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.complianceStatus.findMany({
      where: { userId },
      orderBy: { cycleEnd: "asc" },
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
    }),
  ]);

  const totalHours = certificates.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
  const hasLicenses = licenses.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Your CME compliance dashboard
        </p>
      </div>

      {/* Setup prompt if no licenses configured */}
      {!hasLicenses && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-1">Set up your profile</h3>
          <p className="text-sm text-blue-700 mb-4">
            Add your state medical licenses to see personalized compliance requirements.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Add licenses →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total CME Hours"
          value={totalHours.toFixed(1)}
          unit="hrs"
          color="blue"
        />
        <StatCard
          label="Certificates"
          value={String(certificates.length)}
          unit="uploaded"
          color="slate"
        />
        <StatCard
          label="Active Licenses"
          value={String(licenses.length)}
          unit="states"
          color="slate"
        />
        <StatCard
          label="Compliance Status"
          value={complianceStatuses.every((s) => s.isCompliant) && complianceStatuses.length > 0 ? "✓" : complianceStatuses.length === 0 ? "—" : "⚠"}
          unit={complianceStatuses.length > 0 ? (complianceStatuses.every((s) => s.isCompliant) ? "all good" : "gaps found") : "not computed"}
          color={complianceStatuses.every((s) => s.isCompliant) && complianceStatuses.length > 0 ? "green" : "amber"}
        />
      </div>

      {/* Compliance summary cards */}
      {complianceStatuses.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Compliance by State
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {complianceStatuses.map((status) => (
              <CreditSummaryCard key={status.id} status={status} />
            ))}
          </div>
        </section>
      )}

      {/* Gap alerts */}
      {complianceStatuses.some((s) => !s.isCompliant) && (
        <GapAlerts statuses={complianceStatuses.filter((s) => !s.isCompliant)} />
      )}

      {/* Certificate list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Certificates</h2>
          <Link
            href="/dashboard/upload"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            + Upload certificate
          </Link>
        </div>
        <CertificateList certificates={certificates} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: "blue" | "slate" | "green" | "amber";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex items-end gap-1.5">
        <span className={`text-2xl font-bold ${colorMap[color].split(" ")[1]}`}>
          {value}
        </span>
        <span className="text-xs text-slate-400 mb-0.5">{unit}</span>
      </div>
    </div>
  );
}
