import CertificateUpload from "@/components/CertificateUpload";
import MobileCameraUpload from "@/components/MobileCameraUpload";

export const metadata = {
  title: "Upload Certificate — ClearCME",
};

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="product-page-head">
        <p className="product-page-eye">CME intake</p>
        <h1 className="product-page-title">Upload Certificate</h1>
        <p className="product-page-sub">
          Upload your CME certificates — AI will extract credit info automatically.
        </p>
        <p className="text-xs text-[var(--ink-3)] mt-1">
          Your certificate is encrypted in transit and at rest · AI extraction takes ~10 seconds
        </p>
      </div>

      {/* Mobile: camera-first upload */}
      <div className="sm:hidden">
        <MobileCameraUpload />
      </div>

      {/* Desktop: drag-and-drop */}
      <div className="hidden sm:block">
        <CertificateUpload />
      </div>

      <div className="product-callout-warm p-5">
        <h3 className="font-display text-lg font-semibold text-[var(--ink)] mb-3">What we accept</h3>
        <ul className="space-y-2 text-sm text-[var(--ink-2)]">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full flex-shrink-0" />
            PDF certificates (most providers)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full flex-shrink-0" />
            JPG and PNG images of certificates
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full flex-shrink-0" />
            Max file size: 10MB per certificate
          </li>
        </ul>
        <p className="text-xs text-[var(--ink-3)] mt-3">
          AI extraction is in beta — always verify extracted data before relying on it for compliance.
        </p>
      </div>
    </div>
  );
}
