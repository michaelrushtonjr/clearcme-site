import Link from "next/link";

export interface CourseMatch {
  id: string;
  name: string;
  provider: string;
  accreditation: string; // e.g. "AMA PRA Category 1"
  hours: number;
  /** 0 = free */
  priceUsd: number;
  url: string;
  /** Requirement tags this course closes for THIS user, e.g. ["CA SUBSTANCE", "DEA MATE"] */
  fillTags: string[];
  /** Number of the user's open gaps this course counts toward (cross-credit badge when ≥ 2) */
  countsInPlaces: number;
}

/**
 * "Fill what's left" (1b compliance). Verified course matches for one open
 * gap, cheapest first. Display floor (do not weaken): the card renders
 * NOTHING unless there is at least one verified match — no empty shells.
 */
export default function FillWhatsLeft({
  gapLabel,
  matches,
}: {
  /** Amber gap label, e.g. "SUBSTANCE USE · 2.0 HRS LEFT" */
  gapLabel: string;
  matches: CourseMatch[];
}) {
  if (matches.length === 0) return null;

  const sorted = [...matches].sort((a, b) => a.priceUsd - b.priceUsd);

  return (
    <section className="card" style={{ marginTop: 20, overflow: "hidden" }} aria-label="Course matches">
      <div className="card-head" style={{ alignItems: "center" }}>
        <div>
          <h2 className="card-title">Fill what&apos;s left</h2>
          <p style={{ marginTop: 3, fontSize: 12.5, color: "var(--c1b-muted)" }}>
            Accredited courses matched to your open gap, cheapest first
          </p>
        </div>
        <span
          className="mono-label"
          style={{ color: "var(--c1b-amber-text)" }}
        >
          {gapLabel}
        </span>
      </div>

      {sorted.map((m) => (
        <div
          key={m.id}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 14,
            padding: "13px 18px",
            borderTop: "1px solid var(--c1b-border-row)",
          }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--c1b-ink)" }}>
              {m.name}
              {m.countsInPlaces >= 2 && (
                <span
                  className="chip chip-met"
                  style={{ marginLeft: 8, verticalAlign: "middle" }}
                >
                  Counts in {m.countsInPlaces} places
                </span>
              )}
            </p>
            <p style={{ marginTop: 2, fontSize: 12, color: "var(--c1b-muted)" }}>
              {m.provider} · {m.accreditation} ·
              {m.fillTags.map((tag) => (
                <span
                  key={tag}
                  className="mono-label"
                  style={{
                    marginLeft: 6,
                    background: "var(--c1b-band)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    color: "var(--c1b-ink-2)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </p>
          </div>
          <span className="hrs" style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>
            {m.hours.toFixed(1)} hrs
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--c1b-forest)",
              minWidth: 44,
              textAlign: "right",
            }}
          >
            {m.priceUsd === 0 ? "FREE" : `$${m.priceUsd}`}
          </span>
          <Link
            href={m.url}
            {...(m.url.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            className="btn-filled"
            style={{ padding: "8px 14px" }}
          >
            View course →
          </Link>
        </div>
      ))}

      <div className="card-foot">
        Matched from vetted, accredited providers only. Course completion still comes back to you as
        a certificate — upload it and the gap closes.
      </div>
    </section>
  );
}
