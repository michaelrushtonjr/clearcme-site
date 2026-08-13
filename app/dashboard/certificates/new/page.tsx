import Link from "next/link";
import ManualCertificateEntry from "@/components/ManualCertificateEntry";

export const metadata = {
  title: "Add CME Manually — ClearCME",
};

export default function ManualCertificatePage() {
  return (
    <div>
      <div className="dash-head">
        <div>
          <p className="mono-label page-eyebrow">CME intake</p>
          <h1 className="page-title">Add CME manually</h1>
          <p className="page-sub">
            Enter the hours yourself — no certificate scan needed, and it counts
            toward your requirements the same way.
          </p>
        </div>
        <div className="actions">
          <Link href="/dashboard/certificates" className="btn-outline">
            Back to certificates
          </Link>
        </div>
      </div>

      <div className="max-w-xl">
        <ManualCertificateEntry />
      </div>
    </div>
  );
}
