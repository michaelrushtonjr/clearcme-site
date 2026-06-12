import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CertificateList from "@/components/CertificateList";

export const metadata = {
  title: "My Certificates — ClearCME",
};

export default async function CertificatesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [certificates, licenses] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { activityDate: "desc" },
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      select: { state: true },
    }),
  ]);

  // AMA PRA Cat 1 credits count toward every tracked state (mirrors compliance page)
  const licenseStates = [...new Set(licenses.map((l) => l.state))];
  const sharedCredits: Record<string, string[]> = {};
  if (licenseStates.length >= 2) {
    for (const cert of certificates) {
      if (cert.creditType === "AMA_PRA_1") {
        sharedCredits[cert.id] = licenseStates;
      }
    }
  }

  const totalHours = certificates.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="product-page-head flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="product-page-eye">Your record</p>
          <h1 className="product-page-title">My Certificates</h1>
          <p className="product-page-sub">
            Every certificate you&apos;ve uploaded, with AI-extracted credit details.
          </p>
        </div>
        <Link href="/dashboard/upload" className="product-btn product-btn-brand self-start">
          + Upload certificate
        </Link>
      </div>

      <CertificateList
        certs={certificates}
        totalCount={certificates.length}
        sharedCredits={sharedCredits}
      />

      {certificates.length > 0 && (
        <div className="px-5 py-4 bg-[var(--bg-2)] border border-[var(--line)] rounded-2xl flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--ink-2)]">Total hours</span>
          <span className="font-mono text-sm font-semibold text-[var(--primary)]">
            {totalHours.toFixed(1)} hrs
          </span>
        </div>
      )}
    </div>
  );
}
