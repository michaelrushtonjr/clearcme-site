"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MateActNotice from "@/components/MateActNotice";

type Basis = "EIGHT_HOUR_TRAINING" | "BOARD_CERT_ADDICTION" | "GRADUATED_AFTER_2023" | "OTHER";
export default function FederalTrainingForm({ record, registered, firstQualifyingAt }: {
  record: { basis: Basis; completedAt: string | null; notes: string | null } | null;
  registered: boolean | null;
  firstQualifyingAt: string | null;
}) {
  const router = useRouter();
  const [basis, setBasis] = useState<Basis>(record?.basis ?? "EIGHT_HOUR_TRAINING");
  const [date, setDate] = useState(record?.completedAt?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [hasDea, setHasDea] = useState(registered === null ? "" : registered ? "yes" : "no");
  const [completed, setCompleted] = useState(!!record);
  const [firstEvent, setFirstEvent] = useState(firstQualifyingAt?.slice(0, 10) ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  return <section id="federal-training" className="card" style={{ padding: 20, marginBottom: 24 }}>
    <h2 className="card-title">Federal training record</h2>
    <MateActNotice />
    <form onSubmit={async (event) => {
      event.preventDefault(); setSaving(true); setMessage("");
      try {
        const response = await fetch("/api/dea-certificate", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          deaFirstQualifyingAt: firstEvent || null,
          hasDeaRegistration: hasDea === "" ? null : hasDea === "yes",
          trainingRecord: { completed, basis, completedAt: date || null, notes: notes || null },
        }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to save training record");
        setMessage("Federal training record saved for all licenses."); router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save"); }
      finally { setSaving(false); }
    }}>
      <label className="product-label">Do you have a DEA registration?
        <select className="product-input" value={hasDea} onChange={(e) => setHasDea(e.target.value)}>
          <option value="">Not answered</option><option value="yes">Yes</option><option value="no">No</option>
        </select>
      </label>
      <label className="product-label">First DEA registration or renewal on or after June 27, 2023, if known<input className="product-input" type="date" min="2023-06-27" value={firstEvent} onChange={(e) => setFirstEvent(e.target.value)} /></label>
      <label className="product-label">Completion basis
        <select className="product-input" value={basis} onChange={(e) => setBasis(e.target.value as Basis)}>
          <option value="EIGHT_HOUR_TRAINING">Eight hours of qualifying training</option>
          <option value="BOARD_CERT_ADDICTION">Qualifying addiction board certification</option>
          <option value="GRADUATED_AFTER_2023">Qualifying U.S. medical school curriculum</option>
          <option value="OTHER">Other — describe in notes</option>
        </select>
      </label>
      <label className="product-label">Completion date, if known<input className="product-input" type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="product-label">Notes<textarea className="product-input" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <label><input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} /> I attest that I meet this requirement using the basis selected above.</label>
      <p><button className="product-btn product-btn-brand" disabled={saving}>{saving ? "Saving…" : "Save federal record"}</button></p>
      {message && <p role="status">{message}</p>}
    </form>
  </section>;
}
