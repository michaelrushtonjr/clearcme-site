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
      };
    case "extraction":
      return reason === "attempts"
        ? {
            title: "Free includes 10 certificate scans, and you've used them.",
            body: "You can still add CME manually, as much as you like. Essential scans unlimited certificates — upload a stack and it pulls the hours, dates, and credit type out of each one.",
            rate: "Founding rate: $99/year.",
            href: "/pricing?checkout=essential",
          }
        : {
            title: "You've used your 3 free certificate extractions.",
            body: "You can still add CME manually, as much as you like. Essential reads certificates for you — upload a stack and it pulls the hours, dates, and credit type out of each one.",
            rate: "Founding rate: $99/year.",
            href: "/pricing?checkout=essential",
          };
    case "licenses":
      return limit === 2
        ? {
            title: "Essential covers two state licenses.",
            body: "Pro tracks as many as you hold.",
            href: "/pricing?checkout=pro",
          }
        : {
            title: "Free covers one state license.",
            body: "Essential tracks two — the common case for physicians licensed across a border. Pro covers as many as you hold.",
            href: "/pricing",
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
      <div className="mt-2 flex items-center gap-4">
        <Link
          href={copy.href}
          className="app-hide inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-2)]"
        >
          See plans →
        </Link>
        {/* The extraction copy promises manual entry — link it, don't just say it. */}
        {feature === "extraction" && (
          <Link
            href="/dashboard/certificates/new"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-2)]"
          >
            Add manually →
          </Link>
        )}
      </div>
    </div>
  );
}
