import Link from "next/link";
import type { RequirementEvaluation } from "@/lib/compliance-engine";

// Renders as one ledger row (same 5-column .req-row grid as the state rows):
// dot · name + note · progress · hours · chip. Links to the federal record form.
const STYLE = {
  MET: { chip: "Met", cls: "chip-met", dot: "dot-met", fill: "fill-met", pct: 100, note: "One-time federal requirement · attested" },
  NOT_MET: { chip: "Open", cls: "chip-open", dot: "dot-open", fill: "fill-open", pct: 0, note: "One-time federal requirement · needs your record" },
  EXPIRED: { chip: "Open", cls: "chip-open", dot: "dot-open", fill: "fill-open", pct: 0, note: "One-time federal requirement · needs your record" },
  UNKNOWN: { chip: "Review", cls: "chip-muted", dot: "dot-na", fill: "fill-open", pct: 0, note: "Needs your answer · shared across all licenses" },
  NOT_APPLICABLE: { chip: "N/A", cls: "chip-muted", dot: "dot-na", fill: null, pct: 0, note: "Not DEA-registered · shared across all licenses" },
} as const;

export default function FederalTrainingStatus({ requirement }: { requirement: RequirementEvaluation }) {
  const s = STYLE[requirement.status];
  return (
    <Link href="/dashboard/profile#federal-training" className="req-row" style={{ textDecoration: "none" }} data-requirement="MATE_ACT">
      <span className={`dot ${s.dot}`} aria-hidden="true" />
      <span>
        <span className="name">DEA MATE Act</span>
        <span className="note" style={{ display: "block" }}>{s.note}</span>
      </span>
      <span className="prog" aria-hidden="true">
        {s.fill && <span className={s.fill} style={{ width: `${s.pct}%` }} />}
      </span>
      <span className="hrs">{requirement.status === "MET" ? "met" : `${requirement.required} hrs`}</span>
      <span className={`chip ${s.cls}`}>{s.chip}</span>
    </Link>
  );
}
