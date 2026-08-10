import CertificateUpload from "@/components/CertificateUpload";
import MobileCameraUpload from "@/components/MobileCameraUpload";

export const metadata = {
  title: "Upload Certificate — ClearCME",
};

const PIPELINE_STEPS = [
  {
    n: "01",
    t: "You add the file",
    s: "Photo, scan or PDF — however the provider sent it",
  },
  {
    n: "02",
    t: "We read the hours and topic",
    s: "Usually about ten seconds per certificate",
  },
  {
    n: "03",
    t: "You confirm the match",
    s: "Only then does it count toward a requirement",
  },
];

export default function UploadPage() {
  return (
    <div>
      <div className="dash-head">
        <div>
          <p className="mono-label page-eyebrow">CME intake</p>
          <h1 className="page-title">Upload</h1>
          <p className="page-sub">
            PDF, JPG or PNG · up to 10MB each. Encrypted in transit and at rest.
          </p>
        </div>
      </div>

      <div className="dash-grid">
        <div>
          {/* Mobile: camera-first upload */}
          <div className="sm:hidden">
            <MobileCameraUpload />
          </div>

          {/* Desktop: drag-and-drop + processing queue */}
          <div className="hidden sm:block">
            <CertificateUpload />
          </div>
        </div>

        <div className="rail">
          <section className="card" style={{ padding: 18 }}>
            <p className="mono-label" style={{ color: "var(--c1b-muted)" }}>
              How a certificate becomes an hour
            </p>
            <div style={{ marginTop: 6 }}>
              {PIPELINE_STEPS.map((step) => (
                <div
                  key={step.n}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "12px 0",
                    borderTop: step.n === "01" ? "none" : "1px solid var(--c1b-border-row)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--c1b-muted)",
                    }}
                  >
                    {step.n}
                  </span>
                  <span>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--c1b-ink)" }}>
                      {step.t}
                    </span>
                    <span style={{ display: "block", marginTop: 1, fontSize: 11.5, color: "var(--c1b-muted)" }}>
                      {step.s}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="card-foot" style={{ margin: "6px -18px -18px", borderRadius: "0 0 10px 10px" }}>
              Nothing counts toward a requirement until you confirm the match.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
