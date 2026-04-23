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
  AK: variableRenewal("Biennial renewal date varies by physician and license record"),
  AL: fixedRenewal("December 31 annually", 12, 31),
  AR: birthBasedRenewal("During your birth month each year"),
  AZ: birthBasedRenewal("On or before your birthday, every 2 years", {
    usesExactBirthday: true,
  }),
  CA: birthBasedRenewal("Last day of your birth month, every 2 years"),
  CO: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  CT: variableRenewal("Annual registration date varies by physician; CME uses a 24-month lookback"),
  DC: birthBasedRenewal("Last day of your birth month, every 2 years"),
  DE: fixedRenewal("March 31 of odd-numbered years", 3, 31, "odd"),
  FL: variableRenewal("January 31 of your assigned odd- or even-year biennium"),
  GA: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  HI: fixedRenewal("January 31 of even-numbered years", 1, 31, "even"),
  IA: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  ID: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  IL: variableRenewal("July 31 of your renewal year, every 3 years"),
  IN: fixedRenewal("October 31 of odd-numbered years", 10, 31, "odd"),
  KS: fixedRenewal("July 31 annually", 7, 31),
  KY: variableRenewal("Triennial renewal date varies by physician and license record"),
  LA: variableRenewal("Annual renewal date varies by physician and license record"),
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
  ND: variableRenewal("Triennial renewal deadline varies by physician and license record"),
  NE: fixedRenewal("October 1 of even-numbered years", 10, 1, "even"),
  NH: variableRenewal("June 30 of your renewal year, every 2 years"),
  NJ: fixedRenewal("June 30 of odd-numbered years", 6, 30, "odd"),
  NM: variableRenewal("July 1 of your renewal year, every 3 years"),
  NV: birthBasedRenewal("On or before your birthday every other year", {
    usesExactBirthday: true,
  }),
  NY: variableRenewal("Every 2 years; deadline is tied to your NYSED registration cycle"),
  OH: variableRenewal("Biennial registration date varies by physician and license record"),
  OK: variableRenewal("Triennial MD renewal date varies by board cohort"),
  OR: variableRenewal("License expiration varies by physician; Oregon renewals are not on one statewide fixed date"),
  PA: variableRenewal("December 31 of your MD renewal year, every 2 years"),
  RI: fixedRenewal("June 1 of even-numbered years", 6, 1, "even"),
  SC: variableRenewal("Biennial renewal deadline varies by physician and license record"),
  SD: fixedRenewal("March 1 of odd-numbered years", 3, 1, "odd"),
  TN: birthBasedRenewal("During your birth month, every 2 years"),
  TX: birthBasedRenewal("During your birth month, every 2 years"),
  UT: fixedRenewal("January 31 of even-numbered years", 1, 31, "even"),
  VA: birthBasedRenewal("During your birth month, every 2 years"),
  VT: variableRenewal("Vermont MD renewal deadline is not confirmed in the compliance map"),
  WA: variableRenewal("Every 4 years; renewal date varies by physician and license record"),
  WI: fixedRenewal("October 31 of odd-numbered years", 10, 31, "odd"),
  WV: variableRenewal("Biennial renewal deadline varies by physician and board"),
  WY: variableRenewal("June 30 of your renewal year, every 3 years"),
};

const doRenewalRules: Partial<Record<StateCode, RenewalRuleConfig>> = {
  AZ: fixedRenewal("December 31 of odd-numbered years", 12, 31, "odd"),
  CA: variableRenewal("California DO renewal deadline varies by osteopathic board cohort"),
  FL: fixedRenewal("March 31 of even-numbered years", 3, 31, "even"),
  HI: variableRenewal("June 30 of your DO renewal year, every 2 years"),
  KS: fixedRenewal("October 31 annually", 10, 31),
  ME: variableRenewal("Maine DO renewal deadline varies by osteopathic board cohort"),
  NV: fixedRenewal("December 31 annually", 12, 31),
  OK: fixedRenewal("June 30 annually", 6, 30),
  PA: fixedRenewal("October 31 of even-numbered years", 10, 31, "even"),
  VT: fixedRenewal("September 30 of even-numbered years", 9, 30, "even"),
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
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Pain management and opioid use/addiction", "2 hrs per cycle", "If DEA-registered"),
      mateTopic(),
    ],
  },
  AL: {
    totalHours: 25,
    totalHoursLabel: "25 hours",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [
      topic("Professional boundaries", "2 hrs one-time", "Current licensees must complete by Dec. 31, 2025"),
      topic("Controlled Substance Certificate CME", "2 hrs every 2 years", "If Alabama CDS certificate holder"),
    ],
  },
  AR: {
    totalHours: 20,
    totalHoursLabel: "20 hours",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [topic("Opioid/benzodiazepine prescribing", "1 hr annually")],
  },
  AZ: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid / controlled substance prescribing", "3 hrs per cycle", "If Schedule II prescriber with DEA"),
      mateTopic(),
    ],
  },
  CA: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
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
    totalHoursLabel: "30 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Substance use disorder training", "2 hrs per cycle", "May be waived for some non-opioid prescribers"),
      mateTopic(),
    ],
  },
  CT: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "Annual renewal, 24-month CME lookback",
    mandatoryTopics: [
      topic("Infectious diseases / HIV", "1 hr every 6 years"),
      topic("Risk management", "1 hr every 6 years"),
      topic("Sexual assault", "1 hr every 6 years"),
      topic("Domestic violence", "1 hr every 6 years"),
      topic("Cultural competency", "1 hr every 6 years"),
      topic("Behavioral health", "1 hr every 6 years"),
      mateTopic(),
    ],
  },
  DC: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("LGBTQ cultural competency", "2 hrs per cycle"),
      topic("Pharmacology", "1 course per cycle"),
      topic("Public health priority topics", "5 hrs per cycle"),
      topic("Controlled substance prescribing", "3 hrs per cycle", "If DC CDS license holder"),
      mateTopic(),
    ],
  },
  DE: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Child abuse / domestic violence recognition", "1 hr every cycle"),
      topic("Alzheimer's disease / dementias", "2 hrs one-time", "First flagged for 2027 renewal"),
      topic("Controlled substance prescribing", "3 hrs within first year", "If Delaware CSR holder"),
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
      topic("Pain management / palliative medicine", "20 hrs per cycle", "If working in a pain clinic"),
    ],
  },
  HI: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
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
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  IL: {
    totalHours: 150,
    totalHoursLabel: "150 hours",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid prescribing", "1 hr per cycle"),
      topic("Sexual harassment prevention", "1 hr per cycle"),
      topic("Implicit bias in health care", "1 hr per cycle"),
      topic("Alzheimer's disease and dementia", "1 hr per cycle", "If directly treating adults 26+"),
      topic("Cultural competency", "1 hr per cycle"),
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
    cycleLabel: "3-year renewal cycle",
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
    totalHoursLabel: "20 hours",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [
      topic("CDS prescribing", "3 hrs one-time", "Before first renewal if CDS license holder"),
      mateTopic(),
    ],
  },
  MA: {
    totalHours: 100,
    totalHoursLabel: "100 credits",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Risk management", "10 hrs per cycle"),
      topic("Board regulations review", "2 credits per cycle"),
      topic("Opioid education and pain management", "3 hrs per cycle", "If prescribing controlled substances"),
      topic("Implicit bias in health care", "2 hrs per cycle"),
      topic("End-of-life care", "2 hrs one-time"),
      topic("Child abuse recognition and reporting", "One-time training"),
      topic("Domestic and sexual violence", "One-time training"),
      mateTopic(),
    ],
  },
  MD: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Implicit bias training", "Required for renewal"),
      topic("Structural racism training", "Required beginning 2026 renewals"),
      mateTopic(),
    ],
  },
  ME: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Controlled substance / opioid prescribing", "3 hrs per cycle"),
      mateTopic(),
    ],
  },
  MI: {
    totalHours: 150,
    totalHoursLabel: "150 hours",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [
      topic("Medical ethics", "1 hr per cycle"),
      topic("Pain and symptom management", "3 hrs per cycle", "At least 1 hr must cover controlled substances"),
      topic("Opioid / controlled substance awareness", "Required each cycle", "For licensed prescribers / dispensers"),
      topic("Implicit bias", "3 hrs per cycle"),
      topic("Human trafficking identification", "One-time training"),
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
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  MS: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "Annual renewal, 2-year CME reporting window",
    mandatoryTopics: [
      topic("Controlled substances prescribing", "5 hrs every 2 years", "If DEA-licensed; source marked for follow-up"),
      mateTopic(),
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
    totalHours: 60,
    totalHoursLabel: "60 hours",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  NE: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid prescribing", "3 hrs every 2 years", "Includes 0.5 hr on PDMP; if prescribing controlled substances"),
      mateTopic(),
    ],
  },
  NH: {
    totalHours: 100,
    totalHoursLabel: "100 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid prescribing / OUD treatment", "3 hrs every 2 years", "If DEA-licensed"),
      mateTopic(),
    ],
  },
  NJ: {
    totalHours: 100,
    totalHoursLabel: "100 credits",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Cultural competency", "6 hrs per cycle"),
      topic("End-of-life care", "2 hrs per cycle"),
      topic("Opioid prescribing", "1 hr per cycle"),
      topic("Sexual misconduct prevention", "2 hrs per cycle", "Applies starting with the 2027 renewal cycle"),
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
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Medical ethics", "2 hrs per cycle"),
      topic("Suicide prevention and awareness", "2 hrs every 4 years"),
      topic("Bioterrorism / WMD", "4 hrs one-time", "Within 2 years of initial licensure"),
      topic("SBIRT", "2 hrs one-time", "Within 2 years of initial licensure"),
      topic("HIV stigma / bias training", "2 hrs one-time", "If providing hospital services"),
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
      topic("Pain management, palliative care, and addiction", "3 hrs every 3 years", "If prescribing controlled substances / DEA-registered"),
      topic("Opioid prescribing and overdose prevention", "3 hrs every 3 years", "If DEA-registered"),
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
    totalHoursLabel: "100 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Patient safety / risk management", "12 hrs per cycle"),
      topic("Child abuse recognition and reporting", "2 hrs per cycle", "Plus 3 hrs at initial licensure"),
      topic("Pain management / opioid prescribing", "2 hrs per cycle", "If holding a DEA registration"),
      topic("Initial opioid education", "4 hrs one-time", "Before first prescriptive authority"),
      mateTopic(),
    ],
  },
  RI: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Alzheimer's disease / cognitive impairment", "1 hr one-time"),
      topic("Opioid prescribing topics", "8 hrs one-time", "For Schedule II opioid prescribers; enforcement status flagged in source"),
      mateTopic(),
    ],
  },
  SC: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Prescribing and monitoring controlled substances", "2 hrs every renewal"),
      mateTopic(),
    ],
  },
  SD: {
    totalHours: 0,
    totalHoursLabel: "No state CME hours required",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  TN: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Controlled substance prescribing", "2 hrs per cycle", "Applies to all licensees unless exempted by statute"),
      mateTopic(),
    ],
  },
  TX: {
    totalHours: 48,
    totalHoursLabel: "48 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Medical ethics / professional responsibility", "2 hrs per cycle"),
      topic("Safe prescribing / pain management", "2 hrs per cycle"),
      topic("Human trafficking prevention", "1 hr at first renewal and every third renewal after"),
      topic("Life of the Mother Act emergency care CE", "One-time training", "For physicians providing obstetric care"),
      mateTopic(),
    ],
  },
  UT: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Suicide prevention training", "0.5 credit every renewal"),
      topic("Controlled substance prescribing", "4 hrs every renewal", "Includes Utah tutorial; if prescribing controlled substances"),
      topic("SBIRT", "3.5 hrs one-time", "Beginning with the licensing period after Jan. 1, 2024"),
      mateTopic(),
    ],
  },
  VA: {
    totalHours: 30,
    totalHoursLabel: "30 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
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
    totalHoursLabel: "200 hours",
    cycleYears: 4,
    cycleLabel: "4-year renewal cycle",
    mandatoryTopics: [topic("Suicide assessment, treatment, and management", "6 hrs one-time", "During first full CME reporting period")],
  },
  WI: {
    totalHours: 30,
    totalHoursLabel: "30 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid and controlled substance prescribing", "2 hrs every renewal", "If authorized to prescribe"),
      mateTopic(),
    ],
  },
  WV: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Controlled substance prescribing / drug diversion", "3 hrs every cycle", "If prescribing, administering, or dispensing controlled substances in West Virginia"),
      mateTopic(),
    ],
  },
  WY: {
    totalHours: 60,
    totalHoursLabel: "60 hours",
    cycleYears: 3,
    cycleLabel: "3-year renewal cycle",
    mandatoryTopics: [
      topic("Responsible prescribing / SUD treatment", "1 hr every 2 years", "If authorized to prescribe controlled substances"),
      mateTopic(),
    ],
  },
};

const doOverrides: Partial<Record<StateCode, RequirementSeed>> = {
  AZ: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Opioid / controlled substance prescribing", "3 hrs per cycle", "If authorized to prescribe Schedule II drugs or dispense controlled substances"),
      mateTopic(),
    ],
  },
  CA: {
    totalHours: 50,
    totalHoursLabel: "50 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Schedule II addiction-risk course", "Required each cycle"),
      mateTopic(),
    ],
  },
  FL: {
    totalHours: 40,
    totalHoursLabel: "40 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Florida laws / rules and ethics", "1 hr per cycle"),
      topic("Prevention of medical errors", "2 hrs per cycle"),
      topic("Controlled substances", "2 hrs per cycle", "If DEA registrant"),
      topic("HIV/AIDS", "1 hr first renewal only"),
      topic("Domestic violence", "2 hrs every 6 years"),
      mateTopic(),
    ],
  },
  ME: {
    totalHours: 100,
    totalHoursLabel: "100 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [mateTopic()],
  },
  NV: {
    totalHours: 35,
    totalHoursLabel: "35 hours",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [
      topic("Opioid / controlled substance education", "2 hrs every year"),
      topic("Suicide prevention and awareness", "Required every 4 years"),
      topic("HIV stigma / bias training", "2 hrs one-time", "If providing hospital emergency or primary care services"),
      mateTopic(),
    ],
  },
  OK: {
    totalHours: 16,
    totalHoursLabel: "16 hours",
    cycleYears: 1,
    cycleLabel: "Annual renewal cycle",
    mandatoryTopics: [
      topic("Proper prescribing", "1 hr every year", "If DEA registrant or Oklahoma Bureau of Narcotics permit holder"),
      mateTopic(),
    ],
  },
  PA: {
    totalHours: 100,
    totalHoursLabel: "100 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Child abuse recognition and reporting", "2 hrs per cycle", "Plus 3 hrs at initial licensure"),
      mateTopic(),
    ],
  },
  VT: {
    totalHours: 30,
    totalHoursLabel: "30 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Safe and effective prescribing of controlled substances", "2 hrs every renewal", "If DEA-registered"),
      mateTopic(),
    ],
  },
  WV: {
    totalHours: 32,
    totalHoursLabel: "32 hours",
    cycleYears: 2,
    cycleLabel: "2-year renewal cycle",
    mandatoryTopics: [
      topic("Drug diversion / best-practice prescribing", "3 hrs every cycle", "If prescribing, administering, or dispensing controlled substances in West Virginia"),
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
