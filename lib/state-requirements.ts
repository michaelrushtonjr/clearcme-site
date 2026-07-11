export type LicenseType = "MD" | "DO";
export type RenewalType = "fixed" | "birth-based" | "variable";

export type StateCode =
  | "AK"
  | "AL"
  | "AR"
  | "AZ"
  | "CA"
  | "CO"
  | "CT"
  | "DC"
  | "DE"
  | "FL"
  | "GA"
  | "HI"
  | "IA"
  | "ID"
  | "IL"
  | "IN"
  | "KS"
  | "KY"
  | "LA"
  | "MA"
  | "MD"
  | "ME"
  | "MI"
  | "MN"
  | "MO"
  | "MS"
  | "MT"
  | "NC"
  | "ND"
  | "NE"
  | "NH"
  | "NJ"
  | "NM"
  | "NV"
  | "NY"
  | "OH"
  | "OK"
  | "OR"
  | "PA"
  | "RI"
  | "SC"
  | "SD"
  | "TN"
  | "TX"
  | "UT"
  | "VA"
  | "VT"
  | "WA"
  | "WI"
  | "WV"
  | "WY";

export interface MandatoryTopic {
  topic: string;
  hours: string;
  note?: string;
}

export interface StateRequirement {
  stateCode: StateCode;
  stateName: string;
  totalHours: number | null;
  totalHoursLabel: string;
  cycleYears: number | null;
  cycleLabel: string;
  renewalDeadline: string;
  renewalType: RenewalType;
  mandatoryTopics: MandatoryTopic[];
}

type RequirementSeed = Omit<
  StateRequirement,
  "stateCode" | "stateName" | "renewalDeadline" | "renewalType"
>;

type FixedRenewalRule = {
  kind: "fixed";
  month: number;
  day: number;
  yearPattern?: "annual" | "odd" | "even";
};

type BirthBasedRenewalRule = {
  kind: "birth-based";
  usesExactBirthday?: boolean;
};

type VariableRenewalRule = {
  kind: "variable";
};

export type RenewalRuleSchedule =
  | FixedRenewalRule
  | BirthBasedRenewalRule
  | VariableRenewalRule;

export interface RenewalRuleConfig {
  renewalDeadline: string;
  renewalType: RenewalType;
  schedule: RenewalRuleSchedule;
}

export const STATE_NAME_BY_CODE: Record<StateCode, string> = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};

export const STATE_OPTIONS = (Object.entries(STATE_NAME_BY_CODE) as [StateCode, string][])
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const fixedRenewal = (
  renewalDeadline: string,
  month: number,
  day: number,
  yearPattern: FixedRenewalRule["yearPattern"] = "annual",
): RenewalRuleConfig => ({
  renewalDeadline,
  renewalType: "fixed",
  schedule: { kind: "fixed", month, day, yearPattern },
});

const birthBasedRenewal = (
  renewalDeadline: string,
  options: Omit<BirthBasedRenewalRule, "kind"> = {},
): RenewalRuleConfig => ({
  renewalDeadline,
  renewalType: "birth-based",
  schedule: { kind: "birth-based", ...options },
});

const variableRenewal = (renewalDeadline: string): RenewalRuleConfig => ({
  renewalDeadline,
  renewalType: "variable",
  schedule: { kind: "variable" },
});

const mdRenewalRules: Record<StateCode, RenewalRuleConfig> = {
  AK: fixedRenewal("December 31 of even-numbered years", 12, 31, "even"),
  AL: fixedRenewal("December 31 annually", 12, 31),
  AR: birthBasedRenewal("During your birth month each year"),
  AZ: birthBasedRenewal("On or before your birthday, every 2 years", {
    usesExactBirthday: true,
  }),
  CA: variableRenewal("Last day of the month your license was issued, every 2 years (B&P 2423; not birth-month since 2018)"),
  CO: fixedRenewal("April 30 of odd-numbered years", 4, 30, "odd"),
  CT: variableRenewal("Annual registration date varies by physician; CME uses a 24-month lookback"),
  DC: birthBasedRenewal("Last day of your birth month, every 2 years"),
  DE: fixedRenewal("March 31 of odd-numbered years", 3, 31, "odd"),
  FL: variableRenewal("January 31 of your assigned odd- or even-year biennium"),
  GA: birthBasedRenewal("On or before your birthday, every 2 years", {
    usesExactBirthday: true,
  }),
  HI: fixedRenewal("January 31 of even-numbered years", 1, 31, "even"),
  IA: birthBasedRenewal("During your birth month, every 2 years"),
  ID: birthBasedRenewal("On or before your birthdate, every 2 years (birthdate-keyed cycles effective April 1, 2026)", {
    usesExactBirthday: true,
  }),
  IL: variableRenewal("July 31 of your renewal year, every 3 years"),
  IN: fixedRenewal("October 31 of odd-numbered years", 10, 31, "odd"),
  KS: fixedRenewal("July 31 annually", 7, 31),
  KY: fixedRenewal("March 1 annually; CME is reported on a separate 3-year cycle", 3, 1),
  LA: variableRenewal("First day of your birth month, annually (LAC 46:XLV.417)"),
  MA: variableRenewal("Every 2 years from your issuance or prior renewal date"),
  MD: variableRenewal("September 30 of your renewal year, every 2 years"),
  ME: birthBasedRenewal("Last day of your birth month, every 2 years"),
  MI: variableRenewal("Every 3 years; renewal date varies by physician and license record"),
  MN: birthBasedRenewal("During your birth month, every 3 years"),
  MO: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  MS: fixedRenewal("June 30 annually", 6, 30),
  MT: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  NC: birthBasedRenewal("On or before your birthday each year", {
    usesExactBirthday: true,
  }),
  ND: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  NE: fixedRenewal("October 1 of even-numbered years", 10, 1, "even"),
  NH: variableRenewal("June 30 of your renewal year, every 2 years"),
  NJ: fixedRenewal("June 30 of odd-numbered years", 6, 30, "odd"),
  NM: variableRenewal("July 1 of your renewal year, every 3 years"),
  NV: fixedRenewal("June 30 of odd-numbered years", 6, 30, "odd"),
  NY: variableRenewal("Every 2 years; deadline is tied to your NYSED registration cycle"),
  OH: variableRenewal("Biennial registration date varies by physician and license record"),
  OK: variableRenewal("Triennial MD renewal date varies by board cohort"),
  OR: variableRenewal("License expiration varies by physician; Oregon renewals are not on one statewide fixed date"),
  PA: fixedRenewal("December 31 of even-numbered years", 12, 31, "even"),
  RI: fixedRenewal("June 30 of even-numbered years", 6, 30, "even"),
  SC: fixedRenewal("June 30 of odd-numbered years", 6, 30, "odd"),
  SD: fixedRenewal("March 1 of odd-numbered years (standard MD/DO licenses; IMLC licenses renew annually by March 1)", 3, 1, "odd"),
  TN: birthBasedRenewal("During your birth month, every 2 years"),
  TX: birthBasedRenewal("During your birth month, every 2 years"),
  UT: fixedRenewal("January 31 of even-numbered years", 1, 31, "even"),
  VA: birthBasedRenewal("During your birth month, every 2 years"),
  VT: fixedRenewal("November 30 of even-numbered years", 11, 30, "even"),
  WA: variableRenewal("Every 4 years; renewal date varies by physician and license record"),
  WI: fixedRenewal("October 31 of odd-numbered years", 10, 31, "odd"),
  WV: variableRenewal("Biennial renewal deadline varies by physician and board"),
  WY: fixedRenewal("June 30 annually; CME is reported on a separate 3-year cycle", 6, 30),
};

const doRenewalRules: Partial<Record<StateCode, RenewalRuleConfig>> = {
  AZ: variableRenewal("December 31 of your assigned even- or odd-numbered renewal year (check your azdo.gov profile)"),
  CA: variableRenewal("Last day of the month your license was issued, every 2 years (B&P 2456.1; not birth-month since 2023)"),
  FL: fixedRenewal("March 31 of even-numbered years", 3, 31, "even"),
  HI: fixedRenewal("June 30 of even-numbered years", 6, 30, "even"),
  KS: fixedRenewal("October 31 annually", 10, 31),
  ME: variableRenewal("Maine DO renewal deadline varies by osteopathic board cohort"),
  NV: fixedRenewal("December 31 of even-numbered years (biennial under AB 56; the Dec. 31, 2026 renewal is the first even-year cycle)", 12, 31, "even"),
  OK: fixedRenewal("June 30 annually", 6, 30),
  PA: fixedRenewal("October 31 of even-numbered years", 10, 31, "even"),
  UT: fixedRenewal("May 31 of even-numbered years", 5, 31, "even"),
  WA: variableRenewal("Every 3 years; renewal date varies by osteopathic license record"),
  VT: fixedRenewal("September 30 of even-numbered years", 9, 30, "even"),
  WV: variableRenewal("On or before July 1 of your DO renewal year, every 2 years"),
};

const topic = (name: string, hours: string, note?: string): MandatoryTopic => ({
  topic: name,
  hours,
  ...(note ? { note } : {}),
});

const mateTopic = (note = "If DEA-registered") =>
  topic("DEA MATE Act / SUD training", "8 hrs one-time", note);

const mdRequirements: Record<StateCode, RequirementSeed> = {
  AK: {
    totalHours: 50,
    totalHoursLabel: "50 hours per 2-year cycle, averaging 25 hours/year (AMA Category I or board-recognized equivalent)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Pain management and opioid use/addiction", "2 hrs per cycle", "If DEA-registered"),
      mateTopic(),
    ],
  },
  AL: {
    totalHours: 25,
    totalHoursLabel: "25 AMA PRA Category 1 / AOA Category 1-A equivalent credits; no Category 2",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [
      topic("Professional boundaries", "2 hrs one-time", "Current licensees by Dec. 31, 2025; new licensees within 12 months of licensure; limited licensees in a residency or clinical fellowship and licensees with an active retirement waiver are exempt"),
      topic("Collaborative/supervisory practice CME", "Board course every 60 months", "If in a collaborative CRNP/CNM or supervisory PA arrangement; compliance date extended to Jan. 1, 2025; new arrangements must complete within 12 months (look-back extended 48 to 60 months)"),
      topic("Controlled Substance Certificate CME", "2 hrs every 2 years", "If Alabama ACSC holder"),
    ],
  },
  AR: {
    totalHours: 20,
    totalHoursLabel: "20 hours annually; at least 10 Category 1 hours in your primary area of practice",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [
      topic("Opioid/benzodiazepine prescribing", "1 hr annually", "Counts within the 20-hour annual total; not additional"),
      topic("Prescribing education", "3 hrs one-time", "If prescriber licensed after Dec. 31, 2015; due within first 2 years of licensure (ASMB Rule No. 2)"),
    ],
  },
  AZ: {
    totalHours: 40,
    totalHoursLabel: "40 hours (accepted activities include ACCME Category 1 and other board-recognized CME; no carryover)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid / controlled substance prescribing", "3 hrs per cycle", "If Schedule II prescriber with DEA"),
      mateTopic(),
    ],
  },
  CA: {
    totalHours: 50,
    totalHoursLabel: "50 hours (initial license issued for <13 months: 25 hours for first renewal)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Pain management and end-of-life care", "12 hrs one-time", "Due by second renewal / within 4 years"),
      topic("Geriatric medicine", "10 hrs per cycle", "If general internist or family physician with >25% elderly patients"),
      mateTopic(),
    ],
  },
  CO: {
    totalHours: 30,
    totalHoursLabel: "30 hours per 24-month cycle (effective for the 2027 renewal cycle)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; new CME framework begins with 2027 renewal",
    mandatoryTopics: [
      topic(
        "Substance use prevention / treatment competency",
        "2 cumulative hrs per cycle",
        "Exemptions may apply under C.R.S. 12-30-114(1)(b); qualifying training may include CE, self-study, peer review, relevant service, conferences, teaching, or presentations",
      ),
      mateTopic(),
    ],
  },
  CT: {
    totalHours: 50,
    totalHoursLabel: "50 contact hours per preceding 24 months; first license renewal exempt",
    cycleYears: 2,
    cycleLabel: "Annual renewal, 24-month CME lookback",
    mandatoryTopics: [
      topic("Infectious diseases / HIV", "1 hr first CME-required renewal, then every 6 years"),
      topic("Risk management", "1 hr first CME-required renewal, then every 6 years"),
      topic("Sexual assault", "1 hr first CME-required renewal, then every 6 years"),
      topic("Domestic violence", "1 hr first CME-required renewal, then every 6 years"),
      topic("Cultural competency", "1 hr first CME-required renewal, then every 6 years"),
      topic("Behavioral health", "1 hr first CME-required renewal, then every 6 years"),
      mateTopic(),
    ],
  },
  DC: {
    totalHours: 50,
    totalHoursLabel: "50 AMA PRA Category 1 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle ending the last day of your birth month",
    mandatoryTopics: [
      topic("LGBTQ cultural competency", "2 hrs per cycle"),
      topic("Pharmacology", "1 course per cycle"),
      topic("Public health priority topics", "5 hrs per cycle"),
      mateTopic(),
    ],
  },
  DE: {
    totalHours: 40,
    totalHoursLabel: "40 hours (March 31 odd-year renewal; first renewal prorated at 20 hrs if licensed >1 year and <2 years)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle (April 1–March 31 odd-year CME period)",
    mandatoryTopics: [
      topic("Child abuse / domestic violence recognition and reporting", "1 hr every cycle"),
      topic("Alzheimer's disease / dementias", "2 hrs for 2027+ renewals", "Applies unless not treating adults 26+ / no Delaware practice; prior-completion exemption after 2027"),
      topic("Delaware CSR applicant course", "1 hr initial course", "Separate two-part safe prescribing course; does not count as CSR renewal CE"),
      topic("Controlled substance prescribing", "2 hrs each full CSR renewal period", "For active Delaware CSR holders; practitioner-license CE can count if topic-qualified"),
      mateTopic(),
    ],
  },
  FL: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Prevention of medical errors", "2 hrs per cycle"),
      topic("Domestic violence", "2 hrs every 6 years"),
      topic("HIV/AIDS", "1 hr first renewal only"),
      topic("Human trafficking", "1 hr one-time", "s.456.0341; practices must also post the required awareness sign since Jan. 2025"),
      topic("Controlled substances", "2 hrs per cycle", "If DEA-registered and authorized to prescribe"),
      mateTopic(),
    ],
  },
  GA: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Controlled substance prescribing", "3 hrs one-time", "If active DEA registrant and prescriber"),
      topic("Professional boundaries / sexual misconduct", "2 hrs one-time"),
      topic("Pain management / palliative medicine", "20 hrs per cycle", "If not pain/palliative-certified and either practicing in a pain management clinic or opioid pain-management patients are at least 50% of patient population"),
    ],
  },
  HI: {
    totalHours: 100,
    totalHoursLabel: "100 hours (40 Category 1 + 60 Category 2, or 100 Category 1; first-renewal proration may reduce to 50 or 0)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  IA: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Child abuse identification and reporting", "2 hrs every 3 years", "If regularly providing primary care to children"),
      topic("Dependent adult abuse identification and reporting", "2 hrs every 3 years", "If regularly providing primary care to adults"),
      topic("End-of-life care", "2 hrs every 5 years", "If regularly caring for actively dying patients"),
      topic("CDC opioid prescribing guidelines", "2 hrs every 5 years", "If opioids prescribed in prior cycle"),
      mateTopic(),
    ],
  },
  ID: {
    totalHours: 40,
    totalHoursLabel: "40 hours (current board certification or residency/fellowship status may satisfy under IDAPA 24.33.01 §100.04)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  IL: {
    totalHours: 150,
    totalHoursLabel: "150 hours (minimum 60 formal CME; up to 90 informal CME)",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle; first Illinois renewal is CME-exempt",
    mandatoryTopics: [
      topic("Opioid prescribing", "1 hr every 6 years", "Tied to the Illinois controlled-substance registration (cadence relaxed from 3 to 6 years in 2023)"),
      topic("Sexual harassment prevention", "1 hr per cycle"),
      topic("Implicit bias in health care", "1 hr per cycle", "Maternal-health content added for renewals from July 1, 2026"),
      topic("Alzheimer's disease and dementia", "1 hr once, then every 6 years", "If directly treating adults 26+"),
      topic("Cultural competency", "1 hr once, then every 6 years"),
      topic("Child abuse / mandated reporter training", "Training every 6 years", "If working with children"),
    ],
  },
  IN: {
    totalHours: 0,
    totalHoursLabel: "No state CME hours required",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  KS: {
    totalHours: null,
    totalHoursLabel: "50, 100, or 150 credits depending on path",
    cycleYears: null,
    cycleLabel: "18-, 30-, or 42-month CE path",
    mandatoryTopics: [
      topic("Category III credits", "1, 2, or 3 credits", "Depends on chosen CE path"),
      mateTopic(),
    ],
  },
  KY: {
    totalHours: 60,
    totalHoursLabel: "60 hours",
    cycleYears: 3,
    cycleLabel: "3-year CME reporting cycle; license registration is annual by March 1",
    mandatoryTopics: [
      topic("KASPER / pain management / addiction", "4.5 hrs every 3 years", "If authorized to prescribe or dispense controlled substances"),
      topic("Addiction medicine", "12 hrs every 3 years", "If DEA-licensed to prescribe buprenorphine"),
      topic("Domestic violence", "3 hrs within 3 years", "If primary care physician"),
      topic("Pediatric abusive head trauma", "1 hr within 5 years", "Applies to EM, FM, pediatrics, radiology, urgent care"),
      mateTopic(),
    ],
  },
  LA: {
    totalHours: 20,
    totalHoursLabel: "20 board-approved CME hours annually (Category 1 pathways include ACCME, AAFP, ACOG, AOA, LSMS, ABMS/AOA specialty-board, or other board-recognized providers)",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [
      topic("Louisiana laws and rules", "Required before first renewal", "New licensee requirement; credit counts hour-for-hour toward annual CME"),
      topic("CDS prescribing", "3 hrs one-time", "If authorized prescriber renewing for the first time; board-approved/electronically reported course required; exception if no CDS prescribed/administered/dispensed"),
      mateTopic(),
    ],
  },
  MA: {
    totalHours: 50,
    totalHoursLabel: "50 credits",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Risk management", "10 hrs per cycle"),
      topic("Board regulations review", "2 credits per cycle"),
      topic("Opioid education and pain management", "3 hrs per cycle", "If prescribing controlled substances"),
      topic("Implicit bias in health care", "2 hrs one-time", "Required if not completed previously"),
      topic("End-of-life care", "2 hrs one-time"),
      topic("Child abuse recognition and reporting", "One-time training"),
      topic("Domestic and sexual violence", "One-time training"),
      topic("Alzheimer's disease / dementias", "1 hr one-time", "If serving adult populations and not previously completed"),
      topic("EHR proficiency", "3 credits one-time", "If not previously completed; course or demonstration pathway"),
      mateTopic(),
    ],
  },
  MD: {
    totalHours: 50,
    totalHoursLabel: "50 hours (at least 25 Category 1; remaining 25 may be Category 2)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; first renewal is CME-exempt but NPO is still required",
    mandatoryTopics: [
      topic("New Physician Orientation", "Required before first renewal", "Non-CME Maryland Board orientation requirement"),
      topic("Implicit bias + structural racism training", "One-time", "Required for the first renewal occurring on or after Apr. 1, 2026; licensees who already completed implicit-bias training for a prior renewal need only the structural-racism training"),
      topic("Controlled dangerous substances CME", "2 hrs one-time", "If Maryland CDS registrant (since 2018)"),
      mateTopic(),
    ],
  },
  ME: {
    totalHours: 40,
    totalHoursLabel: "40 Category 1 hours (first renewal prorated by month of licensure)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Controlled substance / opioid prescribing", "3 hrs per cycle", "Required each renewal; not generally prorated with first-renewal general hours"),
      topic("Maine jurisprudence exam", "Every other renewal", "Non-CME renewal requirement; no CME credit awarded"),
      mateTopic(),
    ],
  },
  MI: {
    totalHours: 150,
    totalHoursLabel: "150 hours (at least 75 Category 1)",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle; renewal date varies by physician/license record",
    mandatoryTopics: [
      topic("Medical ethics", "1 hr per cycle"),
      topic("Pain and symptom management", "3 hrs per cycle", "At least 1 hr must include controlled substance prescribing"),
      topic("Implicit bias", "3 hrs per cycle", "1 hr for each year of the license cycle"),
      topic("Human trafficking identification", "One-time training"),
      topic("Opioids / controlled-substance awareness", "Required for MI controlled-substance license renewal", "Separate controlled-substance license condition; no standalone CME hour count in the Medicine CME rule"),
      mateTopic(),
    ],
  },
  MN: {
    totalHours: 75,
    totalHoursLabel: "75 hours",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [
      topic("Fetal alcohol spectrum disorders", "Required for applicable specialties", "Family medicine, pediatrics, OB/GYN, and similar roles"),
      mateTopic(),
    ],
  },
  MO: {
    totalHours: 50,
    totalHoursLabel: "50 hours (or 40 hours with qualifying post-tests)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Health benefits of nutrition", "1 hr per cycle", "Included within the 50-hour requirement"),
      mateTopic(),
    ],
  },
  MS: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "Annual renewal, 2-year CME reporting window",
    mandatoryTopics: [
      mateTopic("If DEA-registered; satisfies Mississippi controlled-substance training requirement once completed"),
    ],
  },
  MT: {
    totalHours: 0,
    totalHoursLabel: "No state CME hours required",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  NC: {
    totalHours: 60,
    totalHoursLabel: "60 hours",
    cycleYears: 3,
    cycleLabel: "Annual renewal, 3-year rolling CME window",
    mandatoryTopics: [
      topic("Controlled substance prescribing", "3 hrs every 3 years", "If prescribing controlled substances"),
      mateTopic("MATE training also satisfies North Carolina's 3-hour prescribing rule in that period"),
    ],
  },
  ND: {
    totalHours: 40,
    totalHoursLabel: "40 hours (first renewal exempt; 20 hours if licensed >1 year but <2 full years)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Nutrition and metabolic health", "1 hr per renewal cycle"),
      topic("Abortion instructional course", "Review within prior 2 years before performing an abortion", "Scope-triggered; effective Jan. 1, 2026; medical-emergency exception"),
      mateTopic(),
    ],
  },
  NE: {
    totalHours: 50,
    totalHoursLabel: "50 hours (up to 25 general Category 1 hours may carry over; first renewal after initial licensure typically exempt)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid prescribing", "3 hrs every 2 years", "If prescribing controlled substances; includes 0.5 hr PDMP; requirement sunsets Jan. 1, 2029; topic-specific credit must be fresh each cycle"),
      mateTopic(),
    ],
  },
  NH: {
    totalHours: 100,
    totalHoursLabel: "100 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid prescribing / OUD treatment", "3 hrs every 2 years", "If required to register with NH controlled drug prescription health and safety program; cite Med 402.01(o)-(p) / Med 502"),
      mateTopic(),
    ],
  },
  NJ: {
    totalHours: 100,
    totalHoursLabel: "100 credits (at least 40 Category I; Category I/II recognized by AMA, AOA, ACCME, or comparable board-recognized bodies)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; initial accredited-GME exemption may apply with board orientation due within 24 months",
    mandatoryTopics: [
      topic("Cultural competency", "6 hrs one-time/conditional", "Required if not completed in medical school or post-secondary education; not a recurring per-cycle requirement"),
      topic("End-of-life care", "2 hrs per cycle"),
      topic("Opioid prescribing", "1 hr per cycle"),
      topic("Sexual misconduct prevention", "2 hrs per cycle", "Commences with the biennial renewal period beginning July 1, 2025"),
      topic("Implicit bias in perinatal care", "1 hr per cycle", "If providing perinatal care"),
      mateTopic(),
    ],
  },
  NM: {
    totalHours: 75,
    totalHoursLabel: "75 hours",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [
      topic("New Mexico Medical Practice Act review", "1 hr every renewal"),
      topic("Pain management and controlled substances", "5 hrs every renewal", "Within first year of licensure and each renewal if DEA + NM CS registration"),
      mateTopic(),
    ],
  },
  NV: {
    totalHours: 40,
    totalHoursLabel: "40 Category 1 hours (20 hours must be in specialty or scope of practice)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Ethics, pain management, or addiction care", "2 hrs per cycle", "Licensee's choice among the three; SBIRT credit may substitute, suicide-prevention hours may not"),
      topic("Suicide prevention and awareness", "2 hrs every 4 years", "First due within 2 years of initial licensure"),
      topic("SBIRT", "2 hrs one-time", "Within 2 years of initial licensure"),
      topic("HIV stigma / bias training", "2 hrs one-time", "If providing or supervising hospital emergency services, or practicing primary care"),
      topic("Controlled substances / opioid CE", "2 hrs per cycle", "If registered to dispense controlled substances in Nevada"),
      mateTopic(),
    ],
  },
  NY: {
    totalHours: null,
    totalHoursLabel: "No general CME hour minimum",
    cycleYears: 2,
    cycleLabel: "2-year registration cycle",
    mandatoryTopics: [
      topic("Child abuse identification and reporting", "2 hrs one-time", "Updated curriculum deadline runs through Nov. 17, 2026"),
      topic("Infection control and barrier precautions", "Initial + every 4 years"),
      topic("Pain management, palliative care, and addiction", "3 hrs every 3 years", "PHL 3309-a; if DEA-registered prescriber. One combined requirement (covers opioid prescribing/overdose prevention); NYSDOH attestation each cycle"),
      mateTopic(),
    ],
  },
  OH: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [topic("Duty to report misconduct", "1 hr every cycle")],
  },
  OK: {
    totalHours: 60,
    totalHoursLabel: "60 hours",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid prescribing / pain management", "1 hr every year", "If DEA registration authorizes controlled dangerous substances"),
      mateTopic(),
    ],
  },
  OR: {
    totalHours: 60,
    totalHoursLabel: "60 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Pain management", "1 hr every 2 years", "Also required at initial licensure"),
      topic("Cultural competency", "1 hr every year"),
      mateTopic(),
    ],
  },
  PA: {
    totalHours: 100,
    totalHoursLabel: "100 hours (retain CME records 2 years after renewal; MD registration expires Dec. 31 of even-numbered years)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Patient safety / risk management", "12 hrs per cycle"),
      topic("Child abuse recognition and reporting", "2 hrs per cycle", "Plus 3 hrs at initial licensure"),
      topic("Pain management / opioid prescribing", "2 hrs per cycle", "For PA MD prescribers/dispensers unless DEA-exempt and not prescribing under another DEA number"),
      topic("Initial opioid education", "4 hrs one-time", "Within 12 months after initial licensure/certification if authorized to prescribe or dispense"),
      topic("Organ and tissue donation / recovery", "2 hrs one-time", "Effective May 1, 2026; due within 5 years of initial licensure or of a renewal, whichever first (49 Pa. Code 16.19(b))"),
      mateTopic(),
    ],
  },
  RI: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; 2026 RIDOH guidance allows any ACCME-accredited topic area",
    mandatoryTopics: [
      topic("Alzheimer's disease / cognitive impairment", "1 hr one-time", "Since Aug. 2019"),
      mateTopic("If DEA-registered (federal requirement; RIDOH currently lists no state-specific renewal topics)"),
    ],
  },
  SC: {
    totalHours: 40,
    totalHoursLabel: "40 hours (minimum 30 specialty; includes 2 hours controlled-substance training)",
    cycleYears: 2,
    cycleLabel: "2-year CME window: July 1 of even year through June 30 of odd renewal year",
    mandatoryTopics: [
      topic("Prescribing and monitoring controlled substances", "2 hrs every renewal"),
      mateTopic(),
    ],
  },
  SD: {
    totalHours: 0,
    totalHoursLabel: "No state CME hours required",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; standard licenses renew March 1 of odd-numbered years; IMLC-pathway physicians renew annually by March 1",
    mandatoryTopics: [mateTopic()],
  },
  TN: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; for 2025+ use 24 months preceding renewal, not two calendar years",
    mandatoryTopics: [
      topic("Controlled substance prescribing", "2 hrs per cycle", "Applies to all licensees unless exempted by statute"),
      mateTopic(),
    ],
  },
  TX: {
    totalHours: 48,
    totalHoursLabel: "48 hours (at least 24 formal Category 1/1A credits; ACCME/AMA PRA, AAFP Prescribed, AOA Category 1-A, or TMA-approved)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; newly licensed physicians are exempt at first registration/renewal. CE Broker reporting mandatory for renewals on/after Sept. 1, 2026",
    mandatoryTopics: [
      topic("Medical ethics / professional responsibility", "2 hrs per cycle"),
      topic("Safe prescribing / pain management", "2 hrs front-loaded, then every 8 years", "2 hrs within first year of licensure and again at the next renewal, then 2 hrs every fourth renewal; direct patient care"),
      topic("Human trafficking prevention", "1 hr at first renewal and every third renewal after", "HHSC-approved course required"),
      topic("Life of the Mother Act emergency care CE", "One-time training", "TMB applies by specialty (OB/GYN-related, Emergency Medicine, Family Medicine); ONLY the free TMB course via MyTMB satisfies it — outside CME does not"),
      mateTopic(),
    ],
  },
  UT: {
    totalHours: 40,
    totalHoursLabel: "40 hours (34 Category 1 minimum)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; MD licenses expire January 31 of even-numbered years",
    mandatoryTopics: [
      topic("Suicide prevention training", "0.5 credit every renewal"),
      topic("Controlled substance prescribing", "3.5 hrs every renewal", "If prescribing controlled substances"),
      topic("SBIRT", "3.5 hrs one-time", "Beginning with the licensing period after Jan. 1, 2024; satisfies the controlled-substance CE requirement for that cycle"),
      mateTopic(),
    ],
  },
  VA: {
    totalHours: 30,
    totalHoursLabel: "30 Type 1 hours from accredited sponsors or profession-sanctioned organizations",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle during birth month; first biennial renewal after initial Virginia licensure is CME-exempt",
    mandatoryTopics: [
      topic("Office-based anesthesia", "Current advanced-resuscitation certification; 4 hrs anesthesia-related CE when applicable", "Scope-specific rule for physicians administering office-based anesthesia without an anesthesiologist or CRNA"),
      mateTopic("Federal overlay if DEA-registered"),
    ],
  },
  VT: {
    totalHours: 30,
    totalHoursLabel: "30 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Hospice / palliative care / pain management", "1 hr every renewal"),
      topic("Safe and effective prescribing of controlled substances", "2 hrs every renewal", "If DEA-registered"),
      mateTopic(),
    ],
  },
  WA: {
    totalHours: 200,
    totalHoursLabel: "200 hours (Category I allowed for all hours; Category II-V limits apply)",
    cycleYears: 4,
    cycleLabel: "4-year renewal cycle",
    mandatoryTopics: [
      topic("Suicide assessment, treatment, and management", "6 hrs one-time", "During first full CME reporting period"),
      topic("Health equity", "2 hrs every 4 years", "Counts toward CME"),
      topic("Opioid prescribing best practices", "At least 1 hr one-time", "If licensed to prescribe opioids; due by first full reporting period after initial licensure"),
      mateTopic(),
    ],
  },
  WI: {
    totalHours: 30,
    totalHoursLabel: "30 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid and controlled substance prescribing", "2 hrs every renewal", "Applies to physicians holding a U.S. DEA registration number; exempt if no DEA number is held at renewal"),
      mateTopic(),
    ],
  },
  WV: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Risk assessment and responsible prescribing / controlled substances", "3 hrs for 2026 renewal", "If prescribing, administering, or dispensing controlled substances in West Virginia; WVBOM says 2026 is the final renewal cycle requiring this course as a renewal prerequisite; post-2026, new prescribers/dispensers still complete the Board-approved course within 1 year of initial licensure"),
      topic("Nutrition education", "Required as part of CME", "HB 4951 effective June 12, 2026; board implementation/hour details pending"),
      mateTopic(),
    ],
  },
  WY: {
    totalHours: 60,
    totalHoursLabel: "60 hours over the 3-year CME lookback (AMA Category I/II, AOA, or Board-recognized equivalents)",
    cycleYears: 3,
    cycleLabel: "3-year CME reporting lookback; license renewal is annual by June 30",
    mandatoryTopics: [mateTopic()],
  },
};

const doOverrides: Partial<Record<StateCode, RequirementSeed>> = {
  AK: {
    totalHours: 50,
    totalHoursLabel: "50 hours per 2-year cycle, averaging 25 hours/year (AOA Category I/II or board-recognized equivalent)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Pain management and opioid use/addiction", "2 hrs per cycle", "If DEA-registered"),
      mateTopic(),
    ],
  },
  AZ: {
    totalHours: 40,
    totalHoursLabel: "40 hours (at least 24 AOA Category 1A; no more than 16 AMA Category 1)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid / controlled substance prescribing", "3 hrs per cycle", "If authorized to prescribe Schedule II drugs or dispense controlled substances; must be AOA 1A or AMA Category 1"),
      mateTopic(),
    ],
  },
  CA: {
    totalHours: 50,
    totalHoursLabel: "50 hours (20 AOA Category 1A/1B; remaining 30 may be AOA or AMA-accredited)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle tied to the osteopathic license renewal period",
    mandatoryTopics: [
      topic("Schedule II drugs / opioid addiction-risk course", "At least 1 hr per cycle"),
      topic("Pain management and end-of-life care", "12 hrs one-time", "Due by second renewal / within 4 years; pathology and radiology exempt"),
      mateTopic(),
    ],
  },
  FL: {
    totalHours: 40,
    totalHoursLabel: "40 hours (at least 20 AOA Category 1-A)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Florida laws / rules and ethics", "1 hr per cycle"),
      topic("Prevention of medical errors", "2 hrs per cycle", "DO board's five misdiagnosed conditions differ from the MD board's list; an MD-board course may not qualify"),
      topic("Controlled substances", "2 hrs per cycle", "If DEA registrant"),
      topic("HIV/AIDS", "1 hr first renewal only"),
      topic("Domestic violence", "2 hrs every 6 years"),
      topic("Human trafficking", "1 hr one-time", "s.456.0341 applies to ch. 459 licensees; awareness-sign requirement since Jan. 2025"),
      mateTopic(),
    ],
  },
  ME: {
    totalHours: 100,
    totalHoursLabel: "100 hours (at least 40 osteopathic medical education)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Controlled substance / opioid prescribing", "3 hrs per cycle", "Confirmed by Roz via Maine Joint Rule Chapter 21"),
      mateTopic(),
    ],
  },
  MI: {
    totalHours: 150,
    totalHoursLabel: "150 hours (at least 60 Category 1; at least 40 hours through AOA/MOA-approved Category 1A-style programs)",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle; renewal date varies by physician/license record",
    mandatoryTopics: [
      topic("Medical ethics", "1 hr per cycle"),
      topic("Pain and symptom management", "3 hrs per cycle", "At least 1 hr must include controlled substance prescribing"),
      topic("Implicit bias", "3 hrs per cycle", "1 hr for each year of the license cycle"),
      topic("Human trafficking identification", "One-time training"),
      topic("Opioids / controlled-substance awareness", "Required for MI controlled-substance license renewal", "Separate controlled-substance license condition; no standalone CME hour count in the Osteopathic CME rule"),
      mateTopic(),
    ],
  },
  NV: {
    totalHours: 35,
    totalHoursLabel: "35 hours annual through Dec. 31, 2026 (at least 10 hours Category 1A); 2027+ transition: 40 hours biennial with at least 20 Category 1A",
    cycleYears: 1,
    cycleLabel: "Annual renewal through Dec. 31, 2026; biennial renewal beginning with the 2027+ cycle",
    mandatoryTopics: [
      topic("Opioid / controlled substance education", "2 hrs every year through 2026; 4 hrs per biennium for 2027+", "Misuse/abuse of controlled substances, prescribing of opioids, or addiction; applies to all NV DOs under NSBOM rules"),
      topic("Ethics, pain management, addiction care, or SBIRT", "2 hrs in even-numbered years", "Separate recurring even-year NSBOM requirement; SBIRT can satisfy this bucket when taken in an even-year cycle"),
      topic("SBIRT", "2 hrs one-time", "Screening, Brief Intervention, and Referral to Treatment approach to substance use disorder; within 2 years of initial licensure"),
      topic("Suicide prevention and awareness", "Required every 4 years"),
      topic("HIV stigma / bias training", "2 hrs one-time", "If providing hospital emergency or primary care services"),
      topic("Cultural competency / DEI", "2 hrs every 2 years", "Psychiatrists only; not required for non-psychiatry NV DOs"),
      mateTopic(),
    ],
  },
  NM: {
    totalHours: 75,
    totalHoursLabel: "75 credits (at least 30 AOA Category 1-A or 1-B)",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle; DO audit may include credits earned up to 6 months before the current triennial cycle",
    mandatoryTopics: [
      topic("New Mexico Osteopathic Medical Practice Act and Board rules review", "1 credit every renewal"),
      topic("Pain management", "6 credits every renewal", "If practicing in New Mexico with a NM controlled-substance license / opioid-prescribing authority; board-approved course constraints apply"),
      mateTopic(),
    ],
  },
  OK: {
    totalHours: 16,
    totalHoursLabel: "16 hours",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle; renewal fee due on or before July 1",
    mandatoryTopics: [
      topic("Proper prescribing", "1 hr every year", "Exempt if no Oklahoma Bureau of Narcotics and DEA authority to handle controlled dangerous substances; must be board-approved seminar"),
      mateTopic(),
    ],
  },
  PA: {
    totalHours: 100,
    totalHoursLabel: "100 hours (at least 20 AOA Category 1-A)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; first-time PA licensure is CME-exempt for the following biennial renewal period",
    mandatoryTopics: [
      topic("Patient safety / risk management", "12 hrs per cycle", "Category 1 or 2"),
      topic("Child abuse recognition and reporting", "2 hrs per cycle", "Plus 3 hrs at initial licensure"),
      topic("Pain management / opioid prescribing", "2 hrs per cycle", "For PA DO prescribers/dispensers unless DEA-exempt and not prescribing under another DEA number"),
      topic("Initial opioid education", "4 hrs one-time", "Within 12 months after initial licensure/certification if authorized to prescribe or dispense"),
      topic("Organ and tissue donation / recovery", "2 hrs one-time", "Effective May 1, 2026; due within 5 years of initial licensure or of a renewal, whichever first (49 Pa. Code 25.271(c))"),
      mateTopic(),
    ],
  },
  TN: {
    totalHours: 40,
    totalHoursLabel: "40 hours (DO accepted credits: AOA 1A/2A/1B with max 20 hrs 1B; ACCME AMA PRA Category 1; AAFP Prescribed)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; for 2025+ use 24 months preceding renewal, not two calendar years",
    mandatoryTopics: [
      topic("Controlled substance prescribing", "2 hrs per cycle", "Applies to all licensees unless specialty-exempt: pain management, anesthesia, PM&R, neurology, or rheumatology"),
      mateTopic(),
    ],
  },
  UT: {
    totalHours: 40,
    totalHoursLabel: "40 hours (34 AOA or ACCME Category 1 minimum)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; DO licenses expire May 31 of even-numbered years",
    mandatoryTopics: [
      topic("Suicide prevention training", "0.5 credit every renewal"),
      topic("Controlled substance prescribing", "3.5 hrs every renewal", "If prescribing controlled substances"),
      topic("SBIRT", "3.5 hrs one-time", "Beginning with the licensing period after Jan. 1, 2024; satisfies the controlled-substance CE requirement for that cycle"),
      mateTopic(),
    ],
  },
  VT: {
    totalHours: 30,
    totalHoursLabel: "30 hours (AOA-approved CE accepted; the former 40% osteopathic sub-requirement was repealed — 26 V.S.A. 1836(d) '[Repealed]')",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; DO licenses expire September 30 of even-numbered years",
    mandatoryTopics: [
      topic("Safe and effective prescribing of controlled substances", "2 hrs every renewal", "If DEA-registered"),
      mateTopic(),
    ],
  },
  WA: {
    totalHours: 150,
    totalHoursLabel: "150 hours (at least 60 Category 1A per WA DOH; WAC 246-853-070 uses broader Category 1 wording)",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [
      topic("Suicide assessment, treatment, and management", "6 hrs one-time", "By first full CE reporting period after initial licensure"),
      topic("Health equity", "2 hrs every 4 years", "Counts toward CE"),
      topic("Opioid prescribing best practices", "At least 1 hr one-time", "If licensed to prescribe opioids; due by first full reporting period after initial licensure"),
      mateTopic(),
    ],
  },
  WV: {
    totalHours: 32,
    totalHoursLabel: "32 hours (at least 16 AOA Category 1A/1B)",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle; DO renewal due on or before July 1",
    mandatoryTopics: [
      topic("Drug diversion / best-practice prescribing", "3 hrs for 2026 renewal", "Final recurring cycle if prescribing, administering, or dispensing controlled substances in West Virginia; must be WV Board of Osteopathic Medicine-approved; post-2026 shifts to one-time/initial-license logic"),
      topic("Nutrition education", "Required as part of CME", "HB 4951 effective June 12, 2026; board implementation/hour details pending"),
      mateTopic(),
    ],
  },
};

const getRuleConfig = (
  stateCode: StateCode,
  licenseType: LicenseType,
): RenewalRuleConfig =>
  licenseType === "DO"
    ? doRenewalRules[stateCode] ?? mdRenewalRules[stateCode]
    : mdRenewalRules[stateCode];

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toInputDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const endOfMonth = (year: number, month: number) =>
  new Date(year, month, 0);

const matchesYearPattern = (
  year: number,
  yearPattern: FixedRenewalRule["yearPattern"] = "annual",
) => {
  if (yearPattern === "odd") return year % 2 === 1;
  if (yearPattern === "even") return year % 2 === 0;
  return true;
};

export function getRenewalRuleConfig(
  stateCode: StateCode,
  licenseType: LicenseType,
): RenewalRuleConfig {
  return getRuleConfig(stateCode, licenseType);
}

export function getSuggestedRenewalDate(
  stateCode: StateCode,
  licenseType: LicenseType,
  options: { birthMonth?: number; referenceDate?: Date } = {},
): {
  date: string | null;
  note?: string;
} {
  const rule = getRuleConfig(stateCode, licenseType);
  const referenceDate = startOfLocalDay(options.referenceDate ?? new Date());

  if (rule.schedule.kind === "fixed") {
    let year = referenceDate.getFullYear();

    while (true) {
      if (matchesYearPattern(year, rule.schedule.yearPattern)) {
        const candidate = new Date(year, rule.schedule.month - 1, rule.schedule.day);
        if (candidate >= referenceDate) {
          return { date: toInputDateValue(candidate) };
        }
      }

      year += 1;
    }
  }

  if (rule.schedule.kind === "birth-based") {
    if (!options.birthMonth) {
      return { date: null };
    }

    const currentYear = referenceDate.getFullYear();
    const candidateThisYear = endOfMonth(currentYear, options.birthMonth);
    const candidate =
      candidateThisYear >= referenceDate
        ? candidateThisYear
        : endOfMonth(currentYear + 1, options.birthMonth);

    return {
      date: toInputDateValue(candidate),
      note: rule.schedule.usesExactBirthday
        ? "We use the end of your birth month as a smart starting point. Edit it if your board renews on your exact birthday."
        : undefined,
    };
  }

  return { date: null };
}

const buildRequirement = (
  stateCode: StateCode,
  licenseType: LicenseType,
  seed: RequirementSeed,
): StateRequirement => {
  const renewalRule = getRuleConfig(stateCode, licenseType);

  return {
    stateCode,
    stateName: STATE_NAME_BY_CODE[stateCode],
    ...seed,
    renewalDeadline: renewalRule.renewalDeadline,
    renewalType: renewalRule.renewalType,
  };
};

export const STATE_REQUIREMENTS: Record<
  StateCode,
  Record<LicenseType, StateRequirement>
> = Object.fromEntries(
  (Object.keys(STATE_NAME_BY_CODE) as StateCode[]).map((stateCode) => [
    stateCode,
    {
      MD: buildRequirement(stateCode, "MD", mdRequirements[stateCode]),
      DO: buildRequirement(
        stateCode,
        "DO",
        doOverrides[stateCode] ?? mdRequirements[stateCode],
      ),
    },
  ]),
) as Record<StateCode, Record<LicenseType, StateRequirement>>;
