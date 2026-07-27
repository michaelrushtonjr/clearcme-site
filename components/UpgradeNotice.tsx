import Link from "next/link";

export type FencedFeature = "export" | "extraction" | "licenses";

interface UpgradeNoticeProps {
  feature: FencedFeature;
  /** For "licenses": the limit the user hit (1 = Free, 2 = Essential). */
  limit?: number;
}

interface NoticeCopy {
  title: string;
  body: string;
  rate?: string;
  href: string;
}

function noticeCopy(feature: FencedFeature, limit?: number): NoticeCopy {
  switch (feature) {
    case "export":
      return {
        title: "Audit-ready export is part of Essential.",
        body: "Your compliance map and course matches stay free. Export packages everything into a single file your board or employer will accept — that's the part Essential handles.",
        rate: "Founding rate: $99/year, locked for as long as your subscription stays active.",
        href: "/pricing?checkout=essential",
      };
    case "extraction":
      return {
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

/** Renders a blocked-by-tier state as an upgrade prompt, never a raw error. */
export default function UpgradeNotice({ feature, limit }: UpgradeNoticeProps) {
  const copy = noticeCopy(feature, limit);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 text-left">
      <p className="text-sm font-semibold text-[var(--ink)]">{copy.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">{copy.body}</p>
      {copy.rate && <p className="mt-1 text-xs italic text-[var(--ink-3)]">{copy.rate}</p>}
      <Link
        href={copy.href}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-2)]"
      >
        See plans →
      </Link>
    </div>
  );
}
