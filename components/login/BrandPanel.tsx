import { BrandLockup } from "@/components/BrandLockup";

// Forest-green left panel shared by /login and /login/check-email.
// Pure JSX (no hooks) so it renders from server and client components alike.

const BRAND_BULLETS = [
  "All 50 states and DC, plus DEA registration",
  "Reads your certificates and files the hours for you",
  "Free to start · every requirement verified by a physician",
];

export function BrandPanel() {
  return (
    <aside className="brand-panel">
      <BrandLockup href="/" size="md" dark />
      <div className="brand-content">
      <h1 className="brand-head">Your CME compliance, handled.</h1>
      <p className="brand-sub">
        Every state you&apos;re licensed in, every mandated topic, every deadline — checked
        against state board sources and kept current.
      </p>
      <ul className="brand-bullets">
        {BRAND_BULLETS.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <div className="preview-card" aria-hidden="true">
        <div className="preview-head">
          <span className="mono-label l">What you&apos;ll see inside</span>
          <span className="mono-label r">Live status</span>
        </div>
        <div className="preview-big">
          <span className="num">20.0</span>
          <span className="desc">hours still to log · 3 credentials</span>
        </div>
        <div className="preview-rows">
          <div className="preview-row">
            <span>California — MD</span>
            <span className="val ok">32.0 / 50 · ON PACE</span>
          </div>
          <div className="preview-row">
            <span>New York — MD</span>
            <span className="val warn">1 / 2 TOPICS</span>
          </div>
          <div className="preview-row">
            <span>DEA — federal</span>
            <span className="val warn">MATE 6.0 / 8</span>
          </div>
        </div>
      </div>
      </div>
    </aside>
  );
}
