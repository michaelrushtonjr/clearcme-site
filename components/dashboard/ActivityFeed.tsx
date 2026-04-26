/**
 * ActivityFeed
 *
 * "What's changed since you were last here" section on the dashboard.
 * Justifies the user returning — every visit shows something different.
 *
 * Item types:
 *   rule   — a state board rule changed
 *   course — new accredited course matches a user gap
 *   cert   — user uploaded / extracted a certificate
 *   alert  — deadline / cycle / milestone event
 */

import Link from "next/link";
import { ArrowRight, BookOpen, FileText, ShieldCheck, Clock } from "lucide-react";
import clsx from "clsx";

export type ActivityItemType = "rule" | "course" | "cert" | "alert";

export interface ActivityItem {
  id: string;
  type: ActivityItemType;
  title: React.ReactNode;
  source?: string;
  link?: { href: string; label: string };
  stamp: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  limit?: number;
  viewAllHref?: string;
  managePrefsHref?: string;
}

const ICON_MAP: Record<
  ActivityItemType,
  { icon: React.ElementType; bg: string; fg: string }
> = {
  rule:   { icon: ShieldCheck, bg: "bg-brand-tealTint",    fg: "text-brand-teal"    },
  course: { icon: BookOpen,    bg: "bg-brand-emeraldTint", fg: "text-brand-emerald" },
  cert:   { icon: FileText,    bg: "bg-brand-paperSoft",   fg: "text-slate-500"     },
  alert:  { icon: Clock,       bg: "bg-brand-amberTint",   fg: "text-brand-amber"   },
};

export function ActivityFeed({
  items,
  limit = 4,
  viewAllHref = "/dashboard/activity",
  managePrefsHref = "/dashboard/settings#notifications",
}: ActivityFeedProps) {
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className="rounded-card border border-brand-rule bg-brand-paper p-6 text-center text-sm text-slate-500">
        Nothing new since you were last here. We&apos;ll surface anything that affects your states or topics as it lands.
      </div>
    );
  }

  return (
    <section aria-labelledby="activity-feed-title">
      <header className="flex items-baseline justify-between mb-3.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Since you were last here
          </p>
          <h2
            id="activity-feed-title"
            className="font-display text-[22px] font-semibold tracking-tight text-brand-navy"
          >
            What&apos;s changed
          </h2>
        </div>
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-brand-teal hover:text-brand-tealDeep inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <ol className="rounded-card border border-brand-rule bg-brand-paper overflow-hidden divide-y divide-brand-ruleSoft">
        {visible.map((item) => {
          const { icon: Icon, bg, fg } = ICON_MAP[item.type];
          return (
            <li
              key={item.id}
              className="grid grid-cols-[32px_1fr_auto] gap-4 items-start px-5 py-4"
            >
              <div
                className={clsx(
                  "w-8 h-8 rounded-full grid place-items-center shrink-0",
                  bg,
                  fg
                )}
                aria-hidden
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>

              <div className="min-w-0">
                <div className="text-sm text-brand-navy leading-snug">
                  {item.title}
                </div>
                {(item.source || item.link) && (
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    {item.source && <span>{item.source}</span>}
                    {item.source && item.link && (
                      <span className="text-slate-300">·</span>
                    )}
                    {item.link && (
                      <Link
                        href={item.link.href}
                        className="text-brand-teal font-semibold hover:text-brand-tealDeep"
                      >
                        {item.link.label}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <time className="text-[11px] text-slate-400 whitespace-nowrap pt-0.5 tabular-nums">
                {item.stamp}
              </time>
            </li>
          );
        })}

        <li className="px-5 py-3 bg-brand-paperSoft text-center text-xs text-slate-500">
          We surface only changes that affect{" "}
          <em className="text-brand-navy not-italic font-medium">you</em> — your
          states, your topics, your providers.{" "}
          <Link
            href={managePrefsHref}
            className="text-brand-teal font-semibold hover:text-brand-tealDeep"
          >
            Manage what you see
          </Link>
        </li>
      </ol>
    </section>
  );
}
