"use client";

import Link from "next/link";
import { useState } from "react";
import FillWhatsLeft from "@/components/console/FillWhatsLeft";
import { DEMO_COURSES, DEMO_CREDENTIALS, DEMO_PERSONA } from "@/lib/demo-fixture";

function daysUntil(iso: string) {
  return Math.max(0, Math.round((+new Date(iso) - Date.now()) / 86400e3));
}

const STATUS_UI = {
  met: { chip: "Met", cls: "chip-met", dot: "dot-met", fill: "fill-met" },
  open: { chip: "Open", cls: "chip-open", dot: "dot-open", fill: "fill-open" },
  na: { chip: "N/A", cls: "chip-muted", dot: "dot-na", fill: null },
  current: { chip: "Current", cls: "chip-muted", dot: "dot-met", fill: null },
} as const;

export default function DemoComplianceClient() {
  const [active, setActive] = useState(0);
  const cred = DEMO_CREDENTIALS[active];
  const next = [...DEMO_CREDENTIALS].sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))[0];

  return (
    <div>
      <div className="dash-head">
        <div>
          <p className="mono-label page-eyebrow">Full record</p>
          <h1 className="page-title">Compliance detail</h1>
          <p className="page-sub">Every requirement, cross-checked against state board sources.</p>
        </div>
        <div className="actions">
          <Link href="/login" className="btn-outline">
            Audit ZIP
          </Link>
          <Link href="/login" className="btn-filled">
            Compliance report
          </Link>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 22 }}>
        <div className="stat-card">
          <p className="k">Hours filed</p>
          <p className="v">{DEMO_PERSONA.hoursFiled.toFixed(1)}</p>
          <p className="s">across {DEMO_PERSONA.certificateCount} certificates</p>
        </div>
        <div className="stat-card">
          <p className="k">Still to log</p>
          <p className="v amber">{DEMO_PERSONA.hoursToLog.toFixed(1)}</p>
          <p className="s">across 3 credentials</p>
        </div>
        <div className="stat-card">
          <p className="k">Topics met</p>
          <p className="v">2/5</p>
          <p className="s">1 not applicable</p>
        </div>
        <div className="stat-card">
          <p className="k">Next deadline</p>
          <p className="v">{daysUntil(next.deadline)}d</p>
          <p className="s">
            {next.tab} · {next.renewsLabel}
          </p>
        </div>
      </div>

      <div className="cred-tabs" role="tablist" aria-label="Credentials" style={{ marginTop: 22 }}>
        {DEMO_CREDENTIALS.map((c, i) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={i === active}
            className={i === active ? "active" : undefined}
            onClick={() => setActive(i)}
          >
            {c.tab}
          </button>
        ))}
      </div>

      <section className="card" style={{ overflow: "hidden", marginTop: 18 }}>
        <div className="dark-band">
          <div>
            <h2 className="t">{cred.darkTitle}</h2>
            <p className="s">{cred.darkSubtitle}</p>
            <p className="src">Sources checked Jul 12 2026</p>
          </div>
          <span className={`chip ${cred.onTrack ? "chip-ondark-ok" : "chip-ondark-warn"}`}>
            {cred.onTrack ? "On track" : "Action needed"}
          </span>
        </div>

        <div className="band-row" aria-hidden="true">
          <span>Requirement</span>
          <span className="r">Progress · Status</span>
        </div>

        {cred.requirements.map((r) => {
          const s = STATUS_UI[r.status];
          const pct =
            r.earned != null && r.needed > 0
              ? Math.min(100, (r.earned / r.needed) * 100)
              : r.status === "met"
                ? 100
                : 0;
          return (
            <div key={r.name} className="req-row" style={{ cursor: "default" }}>
              <span className={`dot ${s.dot}`} aria-hidden="true" />
              <span>
                <span className="name">{r.name}</span>
                <span className="note" style={{ display: "block" }}>
                  {r.note ? `${r.note} · ` : ""}
                  <span className="mono-label" style={{ fontSize: 11, letterSpacing: ".08em" }}>
                    Source: {r.source} · verified {r.verified}
                  </span>
                </span>
              </span>
              <span className="prog" aria-hidden="true">
                {s.fill && <span className={s.fill} style={{ width: `${pct}%` }} />}
              </span>
              <span className="hrs">
                {r.earned != null && r.needed > 0 ? `${r.earned.toFixed(1)}/${r.needed}` : "—"}
              </span>
              <span className={`chip ${s.cls}`}>{s.chip}</span>
            </div>
          );
        })}
      </section>

      {cred.gapLabel && (
        <FillWhatsLeft gapLabel={cred.gapLabel} matches={DEMO_COURSES[cred.id] ?? []} />
      )}
    </div>
  );
}
