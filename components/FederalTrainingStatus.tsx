import Link from "next/link";
import type { RequirementEvaluation } from "@/lib/compliance-engine";

export default function FederalTrainingStatus({ requirement }: { requirement: RequirementEvaluation }) {
  const label = { MET: "Met", NOT_MET: "Action needed", UNKNOWN: "Needs your answer", NOT_APPLICABLE: "Not applicable", EXPIRED: "Action needed" }[requirement.status];
  return <div className="req-row" data-requirement="MATE_ACT">
    <span><strong>DEA MATE Act</strong><span className="note" style={{ display: "block" }}>One federal record, shared across all licenses</span></span>
    <span>{label}</span>
    <Link href="/dashboard/profile#federal-training">Review federal training →</Link>
  </div>;
}
