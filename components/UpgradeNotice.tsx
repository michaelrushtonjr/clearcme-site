import Link from "next/link";

export type FencedFeature = "export" | "extraction" | "licenses";

interface UpgradeNoticeProps {
  feature: FencedFeature;
  /** For "licenses": the limit the user hit (1 = Free, 2 = Essential). */
  limit?: number;
  /** For "extraction": "slots" = 3 trial extractions spent, "attempts" = 10-scan backstop. */
  reason?: "slots" | "attempts";
}

interface NoticeCopy {
  title: string;
  body: string;
  rate?: string;
  href: string;
  /** Button label. Says what the button does: a checkout link names the plan, the pricing page says "See plans". */
  cta: string;
}

function noticeCopy(
  feature: FencedFeature,
  limit?: number,
  reason?: "slots" | "attempts"
): NoticeCopy {
  switch (feature) {
    case "export":
      return {
        title: "Audit-ready export is part of Essential.",
        body: "Your compliance map and course matches stay free. Export packages everything into a single file your board or employer will accept — that's the part Essential handles.",
        rate: "Founding rate: $99/year, locked for as long as your subscription stays active.",
        href: "/pricing?checkout=essential",
        cta: "Upgrade to Essential",
      };
    case "extraction":
      return reason === "attempts"
        ? {
            title: "Free includes 10 certificate scans, and you've used them.",
            body: "You can still add CME manually, as much as you like. Essential scans unlimited certificates — upload a stack and it pulls the hours, dates, and credit type out of each one.",
            rate: "Founding rate: $99/year.",
            href: "/pricing?checkout=essential",
            cta: "Upgrade to Essential",
          }
        : {
            title: "You've used your 3 free certificate extractions.",
            body: "You can still add CME manually, as much as you like. Essential reads certificates for you — upload a stack and it pulls the hours, dates, and credit type out of each one.",
            rate: "Founding rate: $99/year.",
            href: "/pricing?checkout=essential",
            cta: "Upgrade to Essential",
          };
    case "licenses":
      return limit === 2
        ? {
            title: "Essential covers two state licenses.",
            body: "Pro tracks as many as you hold.",
            href: "/pricing?checkout=pro",
            cta: "Upgrade to Pro",
          }
        : {
            title: "Free covers one state license.",
            body: "Essential tracks two — the common case for physicians licensed across a border. Pro covers as many as you hold.",
            href: "/pricing",
            cta: "See plans",
          };
  }
}

/** In-app copy: states the limit, never names a plan, price, or place to buy (App Store 3.1.1). */
function appNoticeCopy(feature: FencedFeature): { title: string; body: string } {
  switch (feature) {
    case "export":
      return {
        title: "Export isn't included in your current plan.",
        body: "Your compliance map and course matches are fully available here.",
      };
    case "extraction":
      return {
        title: "You've used the certificate scans included in your current plan.",
        body: "You can still add CME manually, as much as you like.",
      };
    case "licenses":
      return {
        title: "You've reached the number of state licenses included in your current plan.",
        body: "Your existing licenses keep tracking as usual.",
      };
  }
}

/** Renders a blocked-by-tier state as an upgrade prompt, never a raw error. */
export default function UpgradeNotice({ feature, limit, reason }: UpgradeNoticeProps) {
  const copy = noticeCopy(feature, limit, reason);
  const appCopy = appNoticeCopy(feature);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 text-left">
      <div className="app-hide">
        <p className="text-sm font-semibold text-[var(--ink)]">{copy.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">{copy.body}</p>
        {copy.rate && <p className="mt-1 text-xs italic text-[var(--ink-3)]">{copy.rate}</p>}
      </div>
      <div className="app-only">
        <p className="text-sm font-semibold text-[var(--ink)]">{appCopy.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">{appCopy.body}</p>
      </div>
      {/* Real buttons, full width on a phone. The plan button is hidden in the
          iPhone app (no purchase links there); "Add manually" stays, and a row
          with nothing left in it is hidden there too. */}
      <div className={`mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center${feature === "extraction" ? "" : " app-hide"}`}>
        <Link href={copy.href} className="app-hide product-btn product-btn-brand text-sm">
          {copy.cta}
        </Link>
        {/* The extraction copy promises manual entry — link it, don't just say it. */}
        {feature === "extraction" && (
          <Link href="/dashboard/certificates/new" className="product-btn product-btn-secondary text-sm">
            Add manually
          </Link>
        )}
      </div>
    </div>
  );
}
