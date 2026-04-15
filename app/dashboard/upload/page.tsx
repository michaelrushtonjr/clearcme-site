import CertificateUpload from "@/components/CertificateUpload";

export const metadata = {
  title: "Upload Certificate — ClearCME",
};

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Certificate</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Upload your CME certificates — AI will extract credit info automatically.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Your certificate is encrypted in transit and at rest · AI extraction takes ~10 seconds
        </p>
      </div>

      <CertificateUpload />

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">What we accept</h3>
        <ul className="space-y-2 text-sm text-slate-500">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
            PDF certificates (most providers)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
            JPG and PNG images of certificates
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
            Max file size: 10MB per certificate
          </li>
        </ul>
        <p className="text-xs text-slate-400 mt-3">
          AI extraction is in beta — always verify extracted data before relying on it for compliance.
        </p>
      </div>
    </div>
  );
}
