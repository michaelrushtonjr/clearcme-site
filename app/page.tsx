"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  Grid2X2,
  Map,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  STATE_OPTIONS,
  STATE_REQUIREMENTS,
  type LicenseType,
  type MandatoryTopic,
  type StateCode,
} from "@/lib/state-requirements";

const tickerItems = [
  ["CA", "renews by issue month"],
  ["NV", "MD Jun 30 odd yrs · DO Dec 31 even yrs"],
  ["TX", "renews by birth month"],
  ["FL", "assigned biennium"],
  ["NY", "every 2 yrs"],
  ["IL", "renews Jul 31"],
  ["PA", "MD Dec 31 · DO Oct 31"],
  ["OH", "renewal date varies"],
  ["WA", "license-record cycle"],
  ["OR", "renewal date varies"],
  ["DEA MATE Act", "8 hrs · one-time"],
] as const;

const featureCards = [
  {
    className: "f1",
    tag: "01",
    icon: Map,
    title: "Your CME requirements, mapped",
    body: "Every state you're licensed in - all 50 + DC, MD and DO. Auto-updated when state boards change the rules, so you don't have to.",
    extra: (
      <div className="feat-map" aria-label="Example states covered">
        {["CA", "NV", "TX", "FL", "NY", "IL", "PA", "+44 more"].map((state) => (
          <span className="st" key={state}>
            {state}
          </span>
        ))}
      </div>
    ),
  },
  {
    className: "f2",
    tag: "02",
    icon: Upload,
    title: "Hours tracked automatically",
    body: "Upload any certificate - PDF or photo. AI extracts hours, dates, topics, and provider details without manual entry.",
  },
  {
    className: "f3",
    tag: "03",
    icon: Clock3,
    title: "Gaps in real time",
    body: "Exactly what's missing, in plain English, with deadline countdowns. No spreadsheet required.",
  },
  {
    className: "f4",
    tag: "04",
    icon: Search,
    title: "The cheapest accredited courses to fill them",
    body: "Built-in links to free and inexpensive, vetted CME - matched to the exact gaps in your record. No more midnight panic-searching.",
    extra: (
      <div className="feat-cert">
        <div className="cert-row">
          <span className="l">
            <span className="doc-icon" aria-hidden="true" /> DEA MATE Act
          </span>
          <span className="h">8 hrs · free</span>
        </div>
        <div className="cert-row">
          <span className="l">
            <span className="doc-icon" aria-hidden="true" /> Pain mgmt
          </span>
          <span className="h">2 hrs · $19</span>
        </div>
      </div>
    ),
  },
  {
    className: "f5",
    tag: "05",
    icon: FileText,
    title: "Audit-ready compliance file",
    body: "Export a clean PDF for any state, anytime. If your board ever asks for documentation, it's just another Tuesday.",
  },
  {
    className: "f6",
    tag: "06",
    icon: Grid2X2,
    title: "Multi-state, one dashboard",
    body: "Two licenses? Three? See every state on a single view. No spreadsheets, no duplicate tracking.",
  },
];

const faqItems = [
  {
    q: "How does the guarantee actually work?",
    a: [
      "It's two parts.",
      "30-day money-back. If ClearCME isn't right for you, request a full refund within 30 days of paying. No questions, no email chase.",
      "The $1,000 Compliance Promise. If our dashboard ever shows your account as compliant for a state - and you turn out not to be - we'll refund your subscription and cover your late-renewal fee, up to $1,000.",
      "Your data is verified twice: once by AI extracting your certificates, and once by a human physician validating state-specific rules. We've never paid the Compliance Promise out.",
    ],
  },
  {
    q: "What if my state board updates its requirements mid-cycle?",
    a: [
      "ClearCME monitors state board requirements and re-runs your compliance check automatically. If a new mandate appears mid-cycle, you'll see the gap on your dashboard and get an email summary.",
    ],
  },
  {
    q: "Does ClearCME work for both MD and DO?",
    a: [
      "Yes. ClearCME tracks the state board requirements that apply to your license - MD or DO, plus DEA registration where relevant. Specialty board CME isn't ClearCME's focus.",
    ],
  },
  {
    q: 'What does "audit-ready" mean?',
    a: [
      "If your state board ever requests proof of compliance, you can export a single PDF showing exactly which hours satisfied which requirement, with course names, dates, and accreditation references. Tap one button. Send. Done.",
    ],
  },
  {
    q: "Is my data private?",
    a: [
      "Uploaded certificates are encrypted at rest and in transit. They contain no protected health information - only your name, course names, hours, and dates. They're never shared with state boards, employers, or specialty colleges.",
    ],
  },
  {
    q: "Can I cancel anytime?",
    a: [
      "Yes - cancel inside the app, no email or call required. We don't auto-renew without notice; you'll always get a reminder before your annual subscription renews.",
    ],
  },
];

const compareRows = {
  before: [
    "Open the state board PDF. Realize it's been updated since last cycle.",
    "Hunt through your inbox for certificates from three different platforms.",
    "Tally hours in a spreadsheet. Hope you didn't double-count.",
    'Find out you are missing pain management. Search for "cheap CME."',
    "Pay $89 for a 2-hour course you'll forget the moment it's over.",
    "Do it again next year. For your second state. From scratch.",
  ],
  with: [
    "Open ClearCME. See exactly where you stand, every state.",
    "Certificates already extracted, sorted, and counted.",
    "You need 8 hours of DEA MATE Act and 1 hour of pain management.",
    "Tap the recommended free course. Done in an afternoon.",
    "Audit-ready PDF exported and saved. Just in case.",
    "Next year? Already mapped. Just close the loop on what's new.",
  ],
};

function useLandingReveal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(".landing-v3 .reveal, .landing-v3 .stagger"));
    const rings = Array.from(document.querySelectorAll<HTMLElement>(".landing-v3 .ring"));

    if (reducedMotion || !("IntersectionObserver" in window)) {
      [...revealTargets, ...rings].forEach((el) => el.classList.add("in"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    const ringObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            ringObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 },
    );

    revealTargets.forEach((el) => revealObserver.observe(el));
    rings.forEach((el) => ringObserver.observe(el));

    return () => {
      revealObserver.disconnect();
      ringObserver.disconnect();
    };
  }, []);
}

function BrandMark() {
  return <BrandLockup href="/" size="lg" />;
}

function CtaLink({
  children,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href="/login" className={className}>
      {children}
    </Link>
  );
}

function Ticker() {
  const items = [...tickerItems, ...tickerItems];

  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {items.map(([label, text], index) => (
          <span className="ticker-item" key={`${label}-${index}`}>
            <strong>{label}</strong>
            <span>{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroDashboard() {
  return (
    <div className="stage reveal">
      <div className="card-mock dash-main">
        <div className="dash-head">
          <div className="who">
            <div className="avatar">SP</div>
            <div>
              <div className="dash-name">Sample physician</div>
              <div className="dash-role">Emergency Medicine · MD</div>
            </div>
          </div>
          <div className="meta">
            <strong>Nevada</strong> · 87 days to renewal
          </div>
        </div>

        <div className="ring-row">
          <div className="ring" aria-label="76 percent complete">
            <svg width="116" height="116" viewBox="0 0 116 116" aria-hidden="true">
              <circle cx="58" cy="58" r="50" fill="none" stroke="#ECE3CA" strokeWidth="9" />
              <circle
                className="ring-prog"
                cx="58"
                cy="58"
                r="50"
                fill="none"
                stroke="#3F5F33"
                strokeWidth="9"
                strokeLinecap="round"
              />
            </svg>
            <div className="pct">
              <span>76%</span>
              <small>complete</small>
            </div>
          </div>
          <div className="stat-stack">
            <div>
              <div className="label">Hours earned</div>
              <div className="val">
                30.5<span className="of"> / 40 hrs</span>
              </div>
            </div>
            <div>
              <div className="label">Hours remaining</div>
              <div className="val">
                9.5<span className="of"> hrs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="req-list">
          <div className="req">
            <span className="name">DEA MATE Act (one-time)</span>
            <span className="hours">0 / 8 hrs</span>
            <span className="pill miss">Missing</span>
          </div>
          <div className="req">
            <span className="name">Pain management</span>
            <span className="hours">1 / 2 hrs</span>
            <span className="pill due">In progress</span>
          </div>
          <div className="req">
            <span className="name">Medical ethics</span>
            <span className="hours">2 / 2 hrs</span>
            <span className="pill met">Met</span>
          </div>
          <div className="req">
            <span className="name">Opioid prescribing</span>
            <span className="hours">2 / 2 hrs</span>
            <span className="pill met">Met</span>
          </div>
        </div>
      </div>

      <div className="sticky-note">
        <span className="pen" aria-hidden="true">
          ↳
        </span>{" "}
        exactly what&apos;s missing,
        <br />
        in plain English.
      </div>

      <div className="floater">
        <span className="dot-anim" aria-hidden="true" />
        <span>
          <strong>Live</strong> - auto-updated when state boards change rules
        </span>
      </div>
    </div>
  );
}

function TopicRow({ topic, index }: { topic: MandatoryTopic; index: number }) {
  const pillClass = index === 0 ? "miss" : index === 1 ? "due" : "met";
  const pillText = index === 0 ? "Required" : index === 1 ? "Track" : "Mapped";

  return (
    <div className="topic">
      <span>
        {topic.topic}
        <span className="topic-hours"> · {topic.hours}</span>
      </span>
      <span className={`pill ${pillClass}`}>{pillText}</span>
    </div>
  );
}

function StatePreview() {
  const [stateCode, setStateCode] = useState<StateCode | "">("NV");
  const [licenseType, setLicenseType] = useState<LicenseType>("MD");
  const selectedRequirement = stateCode ? STATE_REQUIREMENTS[stateCode][licenseType] : null;
  const displayedTopics = useMemo(
    () => selectedRequirement?.mandatoryTopics.slice(0, 4) ?? [],
    [selectedRequirement],
  );

  return (
    <section className="state-preview-section">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-eye">Try it</span>
          <h2 className="sec-h2">
            What does <em>your</em> state actually require?
          </h2>
          <p className="sec-sub">
            Pick your state and license type to see what physicians see inside ClearCME before they sign up.
          </p>
        </div>

        <div className="state-card reveal">
          <div className="state-form">
            <label htmlFor="state">State</label>
            <select
              id="state"
              value={stateCode}
              onChange={(event) => setStateCode(event.target.value as StateCode | "")}
            >
              <option value="">Select your state...</option>
              {STATE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>

            <label htmlFor="lic">License type</label>
            <select
              id="lic"
              value={licenseType}
              onChange={(event) => setLicenseType(event.target.value as LicenseType)}
            >
              <option value="MD">MD</option>
              <option value="DO">DO</option>
            </select>
            <p className="hint">
              Preview is intentionally concise. Full accounts add personal renewal dates, first-renewal exceptions, and edge cases.
            </p>
          </div>

          <div className="state-result" aria-live="polite">
            {!selectedRequirement ? (
              <p className="empty">
                Pick a state to see cycle length, total CME hours, and the mandates physicians most often miss when renewal season closes in.
              </p>
            ) : (
              <>
                <h4>
                  {selectedRequirement.stateName} · {licenseType}
                </h4>
                <div className="sub">
                  {selectedRequirement.cycleLabel} · {selectedRequirement.renewalDeadline}
                </div>
                <div className="stat-row">
                  <div className="stat-mini">
                    <div className="k">Total hours</div>
                    <div className="v">{selectedRequirement.totalHours ?? "Varies"}</div>
                  </div>
                  <div className="stat-mini">
                    <div className="k">Mandates</div>
                    <div className="v">{selectedRequirement.mandatoryTopics.length}</div>
                  </div>
                  <div className="stat-mini">
                    <div className="k">Cycle</div>
                    <div className="v">
                      {selectedRequirement.cycleYears ? `${selectedRequirement.cycleYears} yr` : "Varies"}
                    </div>
                  </div>
                </div>
                <div className="topic-list">
                  {displayedTopics.length > 0 ? (
                    displayedTopics.map((topic, index) => (
                      <TopicRow topic={topic} index={index} key={`${topic.topic}-${topic.hours}`} />
                    ))
                  ) : (
                    <p className="empty">No recurring state mandatory topics are currently mapped for this license type.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  body?: string;
}) {
  return (
    <div className="sec-head reveal">
      {eyebrow ? <span className="sec-eye">{eyebrow}</span> : null}
      <h2 className="sec-h2">{title}</h2>
      {body ? <p className="sec-sub">{body}</p> : null}
    </div>
  );
}

function Features() {
  return (
    <section id="what-you-get">
      <div className="wrap">
        <SectionHead
          eyebrow="What's included"
          title={
            <>
              Six things, working together - <em>so you never have to think about CME again.</em>
            </>
          }
          body="Worth $300+ if you bought the pieces separately. Yours from $99 a year."
        />

        <div className="feat-grid stagger">
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <div className={`feat ${feature.className}`} key={feature.title}>
                <span className="tag">{feature.tag}</span>
                <div className="icon">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                {feature.extra}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Guarantee() {
  return (
    <section id="guarantee" className="guarantee-section">
      <div className="wrap">
        <div className="guarantee reveal">
          <div className="g-grid">
            <div>
              <div className="g-eye">The Guarantee</div>
              <h2 className="g-h">
                If we ever show you compliant when you aren&apos;t, <em>we pay.</em>
              </h2>
              <p className="g-p">
                We refund your subscription <strong>and</strong> cover your late-renewal fee - up to{" "}
                <strong>$1,000</strong>.
                <br />
                <br />
                We&apos;ve never paid this out. Your data is verified twice - once by AI, once by a human physician -
                before the dashboard ever calls you compliant.
              </p>
            </div>
            <div className="g-stamp" aria-label="$1,000 compliance promise">
              <div className="inner">
                <div className="big">$1,000</div>
                <div className="lbl">If we miss · we pay</div>
                <div className="sm">Subscription refunded + late-renewal fee covered.</div>
              </div>
            </div>
          </div>
          <div className="g-plus">
            <span className="plus-label">Plus</span>
            <span>
              <strong>30-day money-back.</strong> Try it. Not for you? Full refund within 30 days. No questions,
              no email chase.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className="comparison-section">
      <div className="wrap">
        <SectionHead
          eyebrow="The before & after"
          title={
            <>
              Same physician. Same renewal. <em>Different Tuesday.</em>
            </>
          }
        />
        <div className="compare">
          <div className="compare-card before reveal">
            <span className="label">Without ClearCME</span>
            <h3>Two weeks before renewal, 11:47 p.m.</h3>
            <div className="compare-list">
              {compareRows.before.map((row) => (
                <div className="compare-row" key={row}>
                  <span className="mark">
                    <X size={13} strokeWidth={3} />
                  </span>
                  <span className="txt">{row}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="compare-card with reveal">
            <span className="label">With ClearCME</span>
            <h3>Any Tuesday. 60 seconds.</h3>
            <div className="compare-list">
              {compareRows.with.map((row) => (
                <div className="compare-row" key={row}>
                  <span className="mark">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="txt">{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MultiState() {
  return (
    <section>
      <div className="wrap">
        <div className="multi">
          <div className="reveal">
            <span className="sec-eye">Multi-state physicians</span>
            <h2 className="sec-h2 multi-title">
              Two licenses. Three. Ten. <em>One dashboard.</em>
            </h2>
            <p className="sec-sub multi-copy">
              Every state has its own renewal date, hour count, mandatory topics, and edge cases. ClearCME tracks
              all of them at once and shows you what&apos;s due first - so you can stop reconciling spreadsheets at
              midnight.
            </p>
            <div className="multi-cta">
              <CtaLink>
                Add your states <ArrowRight size={16} />
              </CtaLink>
            </div>
          </div>
          <div className="stack-cards reveal" aria-label="Example multi-state dashboard cards">
            <div className="mini-card c1">
              <div className="flag">CA</div>
              <div className="info">
                <div className="name">California · MD</div>
                <div className="deet">Pain management due · birth-month renewal</div>
              </div>
              <div className="right">
                <div className="pct">62%</div>
                <div className="day">214 days</div>
              </div>
            </div>
            <div className="mini-card c2">
              <div className="flag">NV</div>
              <div className="info">
                <div className="name">Nevada · MD</div>
                <div className="deet">DEA MATE Act outstanding · birthday renewal</div>
              </div>
              <div className="right">
                <div className="pct">76%</div>
                <div className="day">87 days</div>
              </div>
            </div>
            <div className="mini-card c3">
              <div className="flag">TX</div>
              <div className="info">
                <div className="name">Texas · MD</div>
                <div className="deet">Ethics complete · birth-month renewal</div>
              </div>
              <div className="right">
                <div className="pct">94%</div>
                <div className="day">142 days</div>
              </div>
            </div>
            <div className="mini-card c4">
              <div className="flag">+1</div>
              <div className="info">
                <div className="name">Add another state</div>
                <div className="deet">Same dashboard, same workflow.</div>
              </div>
              <div className="right">
                <div className="pct">·</div>
                <div className="day">&nbsp;</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const planFeatures = {
    free: [
      "One state mapped",
      "Manual hour entry",
      "One best course match per gap",
      "Basic progress view",
    ],
    essential: [
      "Up to 2 state licenses",
      "AI-supported certificate extraction",
      "Full course recommendation list",
      "Sort by price, time, topic, accreditation",
      "Audit-ready PDF export",
      "Renewal and gap reminders",
      "The $1,000 Compliance Promise",
    ],
    pro: [
      "Everything in Essential",
      "Unlimited state licenses",
      "Cross-state hour reuse",
      "DEA MATE Act tracking",
      "Priority support",
    ],
  };

  return (
    <section id="pricing">
      <div className="wrap">
        <SectionHead
          eyebrow="Pricing"
          title="Less than the cost of one compliance scramble."
          body="Start free with a genuinely useful gap map and one best course match. Upgrade for AI extraction, full course choice, exports, reminders, and the $1,000 Compliance Promise."
        />
        <div className="price-grid">
          <div className="plan reveal">
            <div className="plan-name">Free</div>
            <div className="plan-price">
              <span className="h">$0</span>
              <span className="per">forever</span>
            </div>
            <p className="plan-h">See your gaps and one recommended course per topic. No credit card.</p>
            <PlanFeatureList items={planFeatures.free} />
            <CtaLink className="plan-cta">Start free</CtaLink>
          </div>
          <div className="plan featured reveal">
            <span className="ribbon">Most physicians</span>
            <div className="plan-name">Essential</div>
            <div className="plan-price">
              <span className="h">$99</span>
              <span className="per">/year</span>
            </div>
            <p className="plan-h">AI extraction, full course choice, exports, and reminders for 1-2 state licenses.</p>
            <PlanFeatureList items={planFeatures.essential} />
            <CtaLink className="plan-cta">Start Essential</CtaLink>
          </div>
          <div className="plan reveal">
            <div className="plan-name">Pro</div>
            <div className="plan-price">
              <span className="h">$199</span>
              <span className="per">/year</span>
            </div>
            <p className="plan-h">For physicians with 3+ licenses. Every state, one dashboard.</p>
            <PlanFeatureList items={planFeatures.pro} />
            <CtaLink className="plan-cta">Start Pro</CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanFeatureList({ items }: { items: string[] }) {
  return (
    <ul className="plan-feats">
      {items.map((item) => (
        <li className="plan-feat" key={item}>
          <Check size={14} strokeWidth={2.6} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function FAQ() {
  return (
    <section id="faq">
      <div className="wrap">
        <div className="sec-head reveal faq-head">
          <h2 className="sec-h2">Frequently Asked Questions</h2>
        </div>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details className="faq-item reveal" key={item.q}>
              <summary>{item.q}</summary>
              <div className="answer">
                {item.a.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section className="founder-section">
      <div className="wrap">
        <div className="founder reveal">
          <div>
            <blockquote>
              I built ClearCME because I was tired of searching for cheap CME two weeks before a renewal. Holding
              licenses in two states made it worse. Every physician has the same story - different state, same
              chaos. This exists so that never happens again.
            </blockquote>
            <div className="sig">
              <div className="av">MR</div>
              <div className="who">
                <strong>Michael Rushton, DO</strong>
                <span>Emergency Medicine · Founder, ClearCME</span>
              </div>
            </div>
          </div>
          <div className="founder-aside">
            <strong>Why a physician built it</strong>
            Because the people writing the existing tools weren&apos;t the ones being audited. ClearCME is the
            simplicity I wished I&apos;d had on Year 1.
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final reveal">
      <div className="wrap">
        <h2>
          Your CME compliance, <em>handled.</em>
        </h2>
        <p>See your gaps in 60 seconds. Free to start. The guarantee comes with every paid plan.</p>
        <div className="row">
          <CtaLink>
            Start free <ArrowRight size={16} />
          </CtaLink>
          <Link href="#pricing" className="btn btn-ghost">
            See pricing
          </Link>
        </div>
        <small>Free · No credit card · Built by a physician</small>
      </div>
    </section>
  );
}

export default function Home() {
  useLandingReveal();

  return (
    <div className="landing-v3">
      <header className="nav">
        <div className="wrap nav-row">
          <BrandMark />
          <nav className="nav-links" aria-label="Primary navigation">
            <Link href="#guarantee" className="nav-link hide-sm">
              The Guarantee
            </Link>
            <Link href="#what-you-get" className="nav-link hide-sm">
              What&apos;s included
            </Link>
            <Link href="#pricing" className="nav-link hide-sm">
              Pricing
            </Link>
            <Link href="#faq" className="nav-link hide-sm">
              FAQ
            </Link>
            <Link href="/login" className="nav-link">
              Sign in
            </Link>
            <CtaLink className="nav-cta">Start free →</CtaLink>
          </nav>
        </div>
      </header>

      <Ticker />

      <main>
        <section className="hero">
          <span className="sparkle sp1" aria-hidden="true">
            ✦
          </span>
          <span className="sparkle sp2" aria-hidden="true">
            ✦
          </span>

          <div className="wrap hero-grid">
            <div className="reveal">
              <h1 className="h1">
                Compliant for your next renewal - <span className="wave">guaranteed.</span>
              </h1>
              <p className="hero-sub">
                <strong>Under 60 seconds of setup.</strong>{" "}
                <span className="swash">Less than the cost of one missed-requirement headache.</span> ClearCME maps your
                CME requirements, tracks your hours, tells you exactly what&apos;s missing, and where to find it. Simply,
                without stress, your CME is handled.
              </p>
              <div className="hero-cta-row">
                <CtaLink>
                  See your gaps in 60 seconds <ArrowRight size={16} className="arrow" />
                </CtaLink>
                <Link href="#guarantee" className="btn btn-ghost">
                  How the guarantee works
                </Link>
              </div>
              <div className="trust-row">
                {["All 50 states + DC", "MD & DO", "Built by a physician"].map((item) => (
                  <span className="pip" key={item}>
                    <Check size={14} strokeWidth={2.4} />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <HeroDashboard />
          </div>

          <div className="wrap">
            <div className="strip reveal">
              <div className="left">
                <span className="badge">The math</span>
                <span className="num">
                  $8.25<span className="sm">/mo</span>
                </span>
                <span className="vs">vs.</span>
                <span className="num">
                  One missed CME mistake<span className="sm"> · $500+ penalties, late fees, urgent make-up CME</span>
                </span>
              </div>
              <div className="tag-r">One preventable miss can cost more than a year of ClearCME, not counting the time, stress, and cleanup.</div>
            </div>
          </div>
        </section>

        <StatePreview />
        <Features />
        <Guarantee />
        <Comparison />
        <MultiState />
        <Pricing />
        <FAQ />
        <Founder />
        <FinalCta />
      </main>

      <footer>
        <div className="wrap foot-row">
          <div className="copy">© 2026 ClearCME · All rights reserved.</div>
          <nav className="foot-links" aria-label="Footer navigation">
            <Link href="/pricing">Pricing</Link>
            <Link href="/mate-act">DEA MATE Act</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
