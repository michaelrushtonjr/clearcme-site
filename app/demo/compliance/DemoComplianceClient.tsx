"use client";

import Link from "next/link";
import { useState } from "react";
import FillWhatsLeft from "@/components/console/FillWhatsLeft";
import RequirementTable, { type RequirementRow } from "@/components/console/RequirementTable";
import { DEMO_COURSES, DEMO_CREDENTIALS, DEMO_PERSONA } from "@/lib/demo-fixture";

function daysUntil(iso: string) {
  return Math.max(0, Math.round((+new Date(iso) - Date.now()) / 86400e3));
}

const STATUS_UI = {
  met: { label: "Met", tone: "met", bar: "met" },
  open: { label: "Open", tone: "open", bar: "open" },
  na: { label: "N/A", tone: "muted", bar: "none" },
  current: { label: "Current", tone: "muted", bar: "none" },
} as const;

export default function DemoComplianceClient() {
  const [active, setActive] = useState(0);
  const cred = DEMO_CREDENTIALS[active];
  const next = [...DEMO_CREDENTIALS].sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))[0];

  // Same ordering rule as the real page: actionable rows first, settled
  // (met / current / n-a) below a divider.
  const isSettled = (status: string) =>
    status === "met" || status === "na" || status === "current";
  const ordered = [...cred.requirements].sort(
    (a, b) => Number(isSettled(a.status)) - Number(isSettled(b.status))
  );

  const rows: RequirementRow[] = ordered.map((r) => {
    const s = STATUS_UI[r.status];
    const pct =
      r.earned != null && r.needed > 0
        ? Math.min(100, (r.earned / r.needed) * 100)
        : r.status === "met"
          ? 100
          : 0;
    return {
      key: `${cred.id}-${r.name}`,
      name: r.name,
      note: r.note,
      srcLine: `Source: ${r.source} · verified ${r.verified}`,
      rule: r.rule,
      hrsLabel: r.earned != null && r.needed > 0 ? `${r.earned.toFixed(1)} / ${r.needed}` : "n/a",
      pct,
      barTone: r.earned != null && r.needed > 0 ? s.bar : "none",
      status: r.statusLabel ?? s.label,
      statusTone: s.tone,
    };
  });
  const firstSettled = rows.find((row, i) => isSettled(ordered[i].status));
  if (firstSettled) firstSettled.dividerBefore = "Complete · no action needed";

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
          <div className="head">
            <h2 className="t">{cred.darkTitle}</h2>
            <span className="vdiv" aria-hidden="true" />
            <p className="s">{cred.darkSubtitle}</p>
          </div>
          <div className="right">
            <p className="src">Sources checked Jul 12 2026</p>
            <span className={`chip ${cred.onTrack ? "chip-ondark-ok" : "chip-ondark-warn"}`}>
              {cred.onTrack ? "On track" : "Action needed"}
            </span>
          </div>
        </div>

        <RequirementTable rows={rows} />
      </section>

      {cred.gapLabel && (
        <FillWhatsLeft gapLabel={cred.gapLabel} matches={DEMO_COURSES[cred.id] ?? []} />
      )}
    </div>
  );
}
