/**
 * Demo-mode fixture — the sample persona from the console-1b prototype
 * (design/console-1b/README.md). Served read-only on /demo; demo sessions
 * never touch real user tables. The fictional courses below exist ONLY in
 * this fixture and must never enter lib/courses.ts.
 */

export const DEMO_PERSONA = {
  name: "Waldo Rushton",
  initials: "WR",
  hoursFiled: 35.0,
  hoursToLog: 20.0,
  certificateCount: 6,
};

export interface DemoRequirement {
  name: string;
  note?: string;
  /** Mono rule cell: "per cycle", "one-time", "every 4 yrs", "conditional" */
  rule: string;
  earned: number | null; // null = attestation-only row
  needed: number;
  status: "met" | "open" | "na" | "current";
  /** Optional display override for the status cell, e.g. "On pace" */
  statusLabel?: string;
  source: string;
  verified: string;
}

export interface DemoCredential {
  id: string;
  tab: string; // tab label
  bandTitle: string;
  darkTitle: string;
  darkSubtitle: string;
  renewsLabel: string;
  deadline: string; // ISO
  hoursLeft: number;
  onTrack: boolean;
  requirements: DemoRequirement[];
  gapLabel: string | null; // Fill-what's-left amber label
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    id: "ca",
    tab: "California",
    bandTitle: "California — MD / Renews Feb 1 2028",
    darkTitle: "California — MD",
    darkSubtitle: "Renews February 1, 2028 · 50 hours every 2 years",
    renewsLabel: "Feb 1, 2028",
    deadline: "2028-02-01",
    hoursLeft: 18.0,
    onTrack: true,
    requirements: [
      {
        name: "General hours",
        note: "50 hours of accredited CME each renewal cycle",
        rule: "per cycle",
        earned: 32.0,
        needed: 50,
        status: "open",
        statusLabel: "On pace",
        source: "Medical Board of California",
        verified: "Jul 12, 2026",
      },
      {
        name: "End of life care",
        note: "Pain management and end-of-life care",
        rule: "one-time",
        earned: 12.0,
        needed: 12,
        status: "met",
        source: "Medical Board of California",
        verified: "Jul 12, 2026",
      },
      {
        name: "Substance use",
        note: "DEA MATE Act / substance use disorder training",
        rule: "one-time",
        earned: 6.0,
        needed: 8,
        status: "open",
        source: "Medical Board of California",
        verified: "Jul 12, 2026",
      },
      {
        name: "Geriatric medicine",
        note: "Applies to general internists and family physicians above 25% elderly patients",
        rule: "conditional",
        earned: null,
        needed: 0,
        status: "na",
        source: "Medical Board of California",
        verified: "Jul 12, 2026",
      },
    ],
    gapLabel: "Substance use · 2.0 hrs left",
  },
  {
    id: "ny",
    tab: "New York",
    bandTitle: "New York — MD / Renews Sep 30 2027",
    darkTitle: "New York — MD",
    darkSubtitle: "Renews September 30, 2027 · mandated topics only",
    renewsLabel: "Sep 30, 2027",
    deadline: "2027-09-30",
    hoursLeft: 2.0,
    onTrack: false,
    requirements: [
      {
        name: "Infection control",
        note: "Infection control and barrier precautions",
        rule: "every 4 yrs",
        earned: 3.0,
        needed: 3,
        status: "met",
        source: "NYSED Office of the Professions",
        verified: "Jul 12, 2026",
      },
      {
        name: "Child abuse identification",
        note: "Identifying and reporting child abuse and maltreatment",
        rule: "one-time",
        earned: 0.0,
        needed: 2,
        status: "open",
        source: "NYSED Office of the Professions",
        verified: "Jul 12, 2026",
      },
    ],
    gapLabel: "Child abuse ID · 2.0 hrs left",
  },
  {
    id: "dea",
    tab: "DEA",
    bandTitle: "Federal — DEA registration / Renews Jun 30 2028",
    darkTitle: "DEA registration — federal",
    darkSubtitle: "Renews June 30, 2028 · one-time training, attested at renewal",
    renewsLabel: "Jun 30, 2028",
    deadline: "2028-06-30",
    hoursLeft: 2.0,
    onTrack: false,
    requirements: [
      {
        name: "MATE Act training",
        note: "Eight hours on substance use disorders. The 6.0 hours you filed for California count here too.",
        rule: "one-time",
        earned: 6.0,
        needed: 8,
        status: "open",
        source: "DEA / SAMHSA MATE Act guidance",
        verified: "Jul 12, 2026",
      },
      {
        name: "Registration renewal",
        note: "Attestation is made as part of the renewal form",
        rule: "every 3 yrs",
        earned: null,
        needed: 0,
        status: "current",
        source: "DEA Diversion Control Division",
        verified: "Jul 12, 2026",
      },
    ],
    gapLabel: "MATE Act · 2.0 hrs left",
  },
];

// Fictional courses — demo only, never courses.ts (display-floor rule).
export const DEMO_COURSES: Record<
  string,
  {
    id: string;
    name: string;
    provider: string;
    accreditation: string;
    hours: number;
    priceUsd: number;
    url: string;
    fillTags: string[];
    countsInPlaces: number;
  }[]
> = {
  ca: [
    {
      id: "demo-sud-free",
      name: "Safer Opioid Prescribing & SUD Essentials",
      provider: "Pacific Coast CME",
      accreditation: "AMA PRA Category 1",
      hours: 2.0,
      priceUsd: 0,
      url: "/login",
      fillTags: ["CA Substance", "DEA MATE"],
      countsInPlaces: 2,
    },
    {
      id: "demo-sud-19",
      name: "Substance Use Disorders in Primary Care",
      provider: "Grand Rounds Series",
      accreditation: "AMA PRA Category 1",
      hours: 3.0,
      priceUsd: 19,
      url: "/login",
      fillTags: ["CA Substance", "DEA MATE"],
      countsInPlaces: 2,
    },
  ],
  ny: [
    {
      id: "demo-ca-id-free",
      name: "Child Abuse Identification & Reporting (NY-approved)",
      provider: "Pacific Coast CME",
      accreditation: "NYSED-approved provider",
      hours: 2.0,
      priceUsd: 0,
      url: "/login",
      fillTags: ["NY Child Abuse ID"],
      countsInPlaces: 1,
    },
    {
      id: "demo-ca-id-29",
      name: "Recognizing & Reporting Child Maltreatment",
      provider: "Grand Rounds Series",
      accreditation: "NYSED-approved provider",
      hours: 2.0,
      priceUsd: 29,
      url: "/login",
      fillTags: ["NY Child Abuse ID"],
      countsInPlaces: 1,
    },
  ],
  dea: [
    {
      id: "demo-sud-free",
      name: "Safer Opioid Prescribing & SUD Essentials",
      provider: "Pacific Coast CME",
      accreditation: "AMA PRA Category 1",
      hours: 2.0,
      priceUsd: 0,
      url: "/login",
      fillTags: ["CA Substance", "DEA MATE"],
      countsInPlaces: 2,
    },
    {
      id: "demo-sud-19",
      name: "Substance Use Disorders in Primary Care",
      provider: "Grand Rounds Series",
      accreditation: "AMA PRA Category 1",
      hours: 3.0,
      priceUsd: 19,
      url: "/login",
      fillTags: ["CA Substance", "DEA MATE"],
      countsInPlaces: 2,
    },
  ],
};

export const DEMO_NEXT_ACTIONS = [
  {
    label: "Log 2 hours of child abuse identification",
    detail: "New York · one-time requirement, still open",
    href: "/demo/compliance",
  },
  {
    label: "Finish the substance use requirement",
    detail: "Closes California and DEA MATE together · 6.0 of 8.0 filed",
    href: "/demo/compliance",
  },
  {
    label: "Confirm your geriatric medicine history",
    detail: "Only applies above 25% elderly patients",
    href: "/demo/compliance",
  },
];
