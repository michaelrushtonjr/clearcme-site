import Link from "next/link";
import PacePlanner from "@/components/console/PacePlanner";
import {
  DEMO_CREDENTIALS,
  DEMO_NEXT_ACTIONS,
  DEMO_PERSONA,
} from "@/lib/demo-fixture";

export const metadata = {
  title: "Demo dashboard — ClearCME",
};

function monthsUntil(iso: string) {
  return Math.max(0, Math.round((+new Date(iso) - Date.now()) / (30.4 * 86400e3)));
}

const STATUS_UI = {
  met: { chip: "Met", cls: "chip-met", dot: "dot-met", fill: "fill-met" },
  open: { chip: "Open", cls: "chip-open", dot: "dot-open", fill: "fill-open" },
  na: { chip: "N/A", cls: "chip-muted", dot: "dot-na", fill: null },
  current: { chip: "Current", cls: "chip-muted", dot: "dot-met", fill: null },
} as const;

export default function DemoDashboard() {
  const pills = [...DEMO_CREDENTIALS].sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));

  return (
    <div>
      <div className="dash-head">
        <div>
          <p className="mono-label page-eyebrow">
            Compliance status · {DEMO_CREDENTIALS.length} credentials
          </p>
          <div className="hero-stat" style={{ marginTop: 10 }}>
            <span className="num">{DEMO_PERSONA.hoursToLog.toFixed(1)}</span>
            <span className="desc">hours of CME still to log</span>
          </div>
          <div className="deadline-pills" style={{ marginTop: 16 }}>
            {pills.map((c, i) => (
              <div key={c.id} className={`deadline-pill${i === 0 ? " urgent" : ""}`}>
                <div className="st">{c.darkTitle.split(" / ")[0].replace(" — federal", " — Federal")}</div>
                <div className="date">
                  {c.renewsLabel}
                  <span className="rel"> · {monthsUntil(c.deadline)} months</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="actions">
          <Link href="/login" className="btn-outline">
            Add certificate
          </Link>
          <Link href="/login" className="btn-filled">
            Export record
          </Link>
        </div>
      </div>

      <div className="dash-grid">
        {/* Requirement ledger */}
        <section className="card" aria-label="Requirement ledger">
          <div className="card-head">
            <h2 className="card-title">Requirement ledger</h2>
            <span className="meta">Sources checked Jul 12 2026</span>
          </div>
          {DEMO_CREDENTIALS.map((c) => (
            <div key={c.id}>
              <div className="band-row">
                <span>{c.bandTitle}</span>
                <span className="r">{c.hoursLeft.toFixed(1)} left</span>
              </div>
              {c.requirements.map((r) => {
                const s = STATUS_UI[r.status];
                const pct =
                  r.earned != null && r.needed > 0
                    ? Math.min(100, (r.earned / r.needed) * 100)
                    : r.status === "met"
                      ? 100
                      : 0;
                return (
                  <Link
                    key={r.name}
                    href="/demo/compliance"
                    className="req-row"
                    style={{ textDecoration: "none" }}
                  >
                    <span className={`dot ${s.dot}`} aria-hidden="true" />
                    <span>
                      <span className="name">{r.name}</span>
                      {r.note && (
                        <span className="note" style={{ display: "block" }}>
                          {r.note}
                        </span>
                      )}
                    </span>
                    <span className="prog" aria-hidden="true">
                      {s.fill && <span className={s.fill} style={{ width: `${pct}%` }} />}
                    </span>
                    <span className="hrs">
                      {r.earned != null && r.needed > 0
                        ? `${r.earned.toFixed(1)}/${r.needed}`
                        : "—"}
                    </span>
                    <span className={`chip ${s.cls}`}>{s.chip}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </section>

        {/* Right rail */}
        <div className="rail">
          <PacePlanner
            remainingHours={DEMO_PERSONA.hoursToLog}
            deadlines={DEMO_CREDENTIALS.map((c) => ({
              label: c.tab === "DEA" ? "the DEA renewal" : c.tab,
              date: c.deadline,
              dateLabel: c.renewsLabel,
            }))}
          />

          <section className="card next-actions" aria-label="Next actions">
            <div className="card-head">
              <h2 className="card-title">Next actions</h2>
            </div>
            {DEMO_NEXT_ACTIONS.map((a, i) => (
              <Link key={a.label} href={a.href}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="t" style={{ display: "block" }}>
                    {a.label}
                  </span>
                  <span className="s" style={{ display: "block" }}>
                    {a.detail}
                  </span>
                </span>
                <span className="go" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </section>

          <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--c1b-muted)" }}>
            {DEMO_PERSONA.hoursFiled.toFixed(1)} hours on file across {DEMO_PERSONA.certificateCount}{" "}
            certificates. Sample data — <Link href="/login" style={{ fontWeight: 600, color: "var(--c1b-green)" }}>start free</Link>{" "}
            to see your own record.
          </p>
        </div>
      </div>
    </div>
  );
}
