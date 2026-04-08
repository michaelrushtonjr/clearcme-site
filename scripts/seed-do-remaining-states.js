#!/usr/bin/env node
/**
 * Seed DO compliance rules + mandatory requirements for all remaining US states + DC
 * Already seeded: NV, CA, TX, FL, NY, IL, PA, OH, GA, WA
 */

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:zMXlJQjBWHbgASCiRJmfwJDzxYzzkQLW@maglev.proxy.rlwy.net:59552/railway';

// States already seeded - skip
const ALREADY_SEEDED = new Set(['NV', 'CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'WA']);

// DO compliance rules for remaining states
// renewalCycle in months
const DO_RULES = [
  // Alaska
  {
    state: 'AK', renewalCycle: 24, totalHours: 50,
    notes: 'All 50 hours must be AMA PRA Category 1 or AOA Category 1/2. DEA holders: 2hr pain/opioid mandatory.',
    sourceUrl: 'https://commerce.alaska.gov/web/cbpl/ProfessionalLicensing/StateMedicalBoard.aspx',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 2, description: 'Pain management and opioid use/addiction training', firstRenewalOnly: false, notes: 'Required per cycle for DEA-registered practitioners only' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Alabama - Annual renewal
  {
    state: 'AL', renewalCycle: 12, totalHours: 25,
    notes: 'Annual cycle. All 25 hours must be AMA PRA Category 1 or AOA Category 1-A. Professional Boundaries 2hr one-time (by Dec 31, 2025).',
    sourceUrl: 'https://albme.gov/resources/licensees/continuing-medical-education/licensure-cme-requirement/',
    mandatories: [
      { topic: 'OTHER_MANDATORY', hoursRequired: 2, description: 'Navigating Professional Boundaries in Medicine (PBI Education free course)', firstRenewalOnly: true, notes: 'One-time requirement. Current licensees: complete by Dec 31, 2025. New licensees: within 12 months of licensure.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Arkansas - Annual, birth month cycle
  {
    state: 'AR', renewalCycle: 12, totalHours: 20,
    notes: 'Annual cycle tied to birth month. 50% (10 hrs) must be AMA PRA Category 1 in primary specialty. Monthly random audits.',
    sourceUrl: 'https://armedicalboard.adh.arkansas.gov/faq.aspx?type=1',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 1, description: 'Opioid and benzodiazepine prescribing (per Regulation 17)', firstRenewalOnly: false, notes: 'Required annually for all MD/DO licensees' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Arizona
  {
    state: 'AZ', renewalCycle: 24, totalHours: 40,
    notes: 'A.R.S. §32-1430. No mandatory CME topic areas. Self-attested at renewal. No mandatory opioid CME for MDs/DOs (unlike many states).',
    sourceUrl: 'https://azmd.gov',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Colorado
  {
    state: 'CO', renewalCycle: 24, totalHours: 30,
    notes: 'New requirement per HB24-1153 (effective 2024; first compliance cycle 2027). All 30 hours AMA PRA Category 1. Exemption from SUD requirement if no opioid prescribing or equivalent board certification training.',
    sourceUrl: 'https://www.leg.colorado.gov/bills/hb24-1153',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 2, description: 'Substance use disorder training (per HB24-1153)', firstRenewalOnly: false, notes: 'Per cycle. Exempt if physician holds board certification requiring equivalent SUD training or attests they do not prescribe opioids.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Connecticut
  {
    state: 'CT', renewalCycle: 24, totalHours: 50,
    notes: 'Connecticut General Statutes §20-10b. Broad accreditation accepted. Mandatory topics required at first renewal and every 6 years thereafter (every 3rd renewal cycle).',
    sourceUrl: 'https://portal.ct.gov/en/dph/practitioner-licensing--investigations/physician/continuing-medical-education',
    mandatories: [
      { topic: 'INFECTION_CONTROL', hoursRequired: 1, description: 'Infectious diseases including HIV/AIDS', firstRenewalOnly: false, notes: 'Required at first renewal and every 6 years thereafter (every 3rd renewal cycle)' },
      { topic: 'PATIENT_SAFETY', hoursRequired: 1, description: 'Risk management including controlled substance prescribing and pain management', firstRenewalOnly: false, notes: 'Required at first renewal and every 6 years thereafter (every 3rd renewal cycle)' },
      { topic: 'OTHER_MANDATORY', hoursRequired: 1, description: 'Sexual assault education', firstRenewalOnly: false, notes: 'Required at first renewal and every 6 years thereafter (every 3rd renewal cycle)' },
      { topic: 'DOMESTIC_VIOLENCE', hoursRequired: 1, description: 'Domestic violence recognition and response', firstRenewalOnly: false, notes: 'Required at first renewal and every 6 years thereafter (every 3rd renewal cycle)' },
      { topic: 'CULTURAL_COMPETENCY', hoursRequired: 1, description: 'Cultural competency in patient care', firstRenewalOnly: false, notes: 'Required at first renewal and every 6 years thereafter (every 3rd renewal cycle)' },
      { topic: 'SUICIDE_PREVENTION', hoursRequired: 2, description: 'Behavioral health including mental health conditions common to veterans/families (PTSD, suicide risk, depression, grief screening, suicide prevention)', firstRenewalOnly: false, notes: 'Required at first renewal and every 6 years thereafter. Minimum 2 hours on veterans mental health counts toward 1-hour behavioral health requirement and 50-hour total.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // District of Columbia
  {
    state: 'DC', renewalCycle: 24, totalHours: 50,
    notes: 'All 50 hours must be AMA PRA Category 1. Birth-month-aligned renewal cycles effective June 16, 2024. LGBTQ cultural competency 2hrs required. Public health priority topics 5hrs per DC DOH annual designation. CDS license holders: 3hr controlled substance prescribing.',
    sourceUrl: 'https://dchealth.dc.gov/bomed',
    mandatories: [
      { topic: 'CULTURAL_COMPETENCY', hoursRequired: 2, description: 'LGBTQ cultural competency: addressing needs of patients who identify as LGBTQ', firstRenewalOnly: false, notes: 'Required every cycle. One of the most specifically mandated LGBTQ requirements nationally.' },
      { topic: 'OTHER_MANDATORY', hoursRequired: 5, description: 'DC DOH designated public health priority topics (per annual Public Notice): includes opioid prescribing, nutrition, abuse/neglect/DV/trafficking, sexual health/HIV, ethics, emergency preparedness, identifying impairment, vaccinations, implicit bias/cultural competence', firstRenewalOnly: false, notes: 'Required every cycle. Topic list updated annually by DC DOH Director; verify current Public Notice each fall.' },
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Best practices for prescribing controlled substances (DC CDS license holders)', firstRenewalOnly: false, notes: 'Required per cycle for physicians holding a DC Controlled Dangerous Substance (CDS) license' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders including FDA-approved SUD medications', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Delaware
  {
    state: 'DE', renewalCycle: 24, totalHours: 40,
    notes: 'All 40 hours must be AMA PRA Category 1 or AOA-approved equivalent. No mandatory topic areas. $1,000 fine for non-compliance; 60-day grace period then suspension.',
    sourceUrl: 'https://delpros.delaware.gov',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Hawaii
  {
    state: 'HI', renewalCycle: 24, totalHours: 40,
    notes: 'All 40 hours must be AMA PRA Category 1 (MDs) or AOA Category 1-A (DOs). No mandatory topic areas. Random audit in October of odd-numbered years.',
    sourceUrl: 'https://cca.hawaii.gov/pvl/boards/medical',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Iowa
  {
    state: 'IA', renewalCycle: 24, totalHours: 40,
    notes: 'All 40 hours Category 1. Up to 20 hours may carry over from prior cycle. ABMS/AOA board certification during cycle = 50 Category 1 credits (satisfies requirement). Monthly random audits with 4-year lookback.',
    sourceUrl: 'https://dial.iowa.gov/licenses/health-professions/physicians/continuing-education-physicians',
    mandatories: [
      { topic: 'CHILD_ABUSE', hoursRequired: 2, description: 'Identifying and reporting child abuse (mandatory reporters)', firstRenewalOnly: false, notes: 'Required for mandatory reporters. EM physicians are mandatory reporters.' },
      { topic: 'ELDER_ABUSE', hoursRequired: 2, description: 'Identifying and reporting dependent adult abuse (mandatory reporters)', firstRenewalOnly: false, notes: 'Required for mandatory reporters. EM physicians are mandatory reporters.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Idaho
  {
    state: 'ID', renewalCycle: 24, totalHours: 40,
    notes: 'All 40 hours AMA PRA Category 1. No mandatory topic areas. ABMS certification may satisfy CME requirement (verify with board). IMLC participant.',
    sourceUrl: 'https://dopl.idaho.gov/bom',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Indiana - NO CME requirement for license
  {
    state: 'IN', renewalCycle: 24, totalHours: 0,
    notes: 'Indiana has NO CME requirement for general physician license renewal. Renewal deadline: October 31 of odd-numbered years. Opioid CME required for Controlled Substance Registration (CSR) holders effective July 1, 2025.',
    sourceUrl: 'https://in.gov/pla',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 2, description: 'Opioid prescribing and abuse prevention (for Controlled Substance Registration holders)', firstRenewalOnly: false, notes: 'Required per 2-year renewal cycle for physicians holding Indiana Controlled Substance Registration (CSR). Effective July 1, 2025.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Kansas - flexible cycle, using biennial as representative for DO
  {
    state: 'KS', renewalCycle: 24, totalHours: 100,
    notes: 'Kansas Board of Healing Arts. Flexible cycle: Annual (50 hrs, 20 Cat 1), Biennial (100 hrs, 40 Cat 1), or Triennial (150 hrs, 60 Cat 1). Any ACCME-accredited provider accepted. Biennial shown as default.',
    sourceUrl: 'https://www.ksbha.org',
    mandatories: [
      { topic: 'PAIN_MANAGEMENT', hoursRequired: 1, description: 'Pain management, opioid prescribing, or PDMP use (per year of chosen license cycle)', firstRenewalOnly: false, notes: '1 hour per year of chosen cycle (e.g., 2 hrs for biennial, 3 hrs for triennial). Required for DEA-registered practitioners.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Kentucky
  {
    state: 'KY', renewalCycle: 36, totalHours: 60,
    notes: '30 of 60 hours must be AMA PRA Category 1. Kentucky Board of Medical Licensure. KASPER/pain/addiction 4.5hr for controlled substance prescribers. Pediatric Abusive Head Trauma 1hr for EM physicians (within 5 years of initial licensure).',
    sourceUrl: 'https://kbml.ky.gov',
    mandatories: [
      { topic: 'PAIN_MANAGEMENT', hoursRequired: 4.5, description: 'KASPER, pain management, or addiction medicine for controlled substance prescribers', firstRenewalOnly: false, notes: 'Required every 3-year cycle for physicians authorized to prescribe/dispense controlled substances' },
      { topic: 'DOMESTIC_VIOLENCE', hoursRequired: 3, description: 'Domestic violence recognition and response (primary care physicians)', firstRenewalOnly: true, notes: 'Required within 3 years of initial licensure for primary care physicians' },
      { topic: 'CHILD_ABUSE', hoursRequired: 1, description: 'Pediatric Abusive Head Trauma (EM physicians specifically)', firstRenewalOnly: true, notes: 'Required within 5 years of initial licensure for EM physicians specifically' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Louisiana - Annual
  {
    state: 'LA', renewalCycle: 12, totalHours: 20,
    notes: 'Annual cycle. All 20 hours AMA PRA Category 1. CE Broker reporting required. Louisiana State Board of Medical Examiners.',
    sourceUrl: 'https://lsbme.la.gov',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Best practices for CDS prescribing, drug diversion, addiction treatment, and chronic pain management', firstRenewalOnly: true, notes: 'One-time requirement for CDS license holders' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Massachusetts
  {
    state: 'MA', renewalCycle: 24, totalHours: 50,
    notes: 'All 50 hours must be Type 1 (AMA PRA Category 1 or equivalent). 10 of 50 hours must be risk management. One-time requirements: Alzheimer\'s (1hr), end-of-life care (2hr), domestic violence (once), EHR proficiency demonstration.',
    sourceUrl: 'https://www.mass.gov/massmedboard',
    mandatories: [
      { topic: 'PATIENT_SAFETY', hoursRequired: 10, description: 'Risk management (per 243 CMR 2.06(a)3); opioid education, implicit bias, and end-of-life care credits may count toward this bucket', firstRenewalOnly: false, notes: 'Required every cycle. Includes sub-requirements: opioid (3hr), implicit bias (2hr), end-of-life (2hr, one-time) may count toward this 10-hour bucket.' },
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Opioid education and pain management: effective pain management, abuse/addiction risks, SUD identification, appropriate quantities, opioid antagonists/overdose prevention', firstRenewalOnly: false, notes: 'Required every cycle for physicians who prescribe controlled substances. Counts toward 10-hour risk management bucket.' },
      { topic: 'IMPLICIT_BIAS', hoursRequired: 2, description: 'Implicit bias in health care delivery', firstRenewalOnly: false, notes: 'Required every cycle. Counts toward 10-hour risk management bucket.' },
      { topic: 'END_OF_LIFE_CARE', hoursRequired: 2, description: 'End-of-life care education', firstRenewalOnly: true, notes: 'One-time requirement. Counts toward 10-hour risk management bucket.' },
      { topic: 'DOMESTIC_VIOLENCE', hoursRequired: 1, description: 'Domestic and sexual violence recognition and response', firstRenewalOnly: true, notes: 'One-time requirement per Acts 2014, Ch. 260, §9. Applies to all MA physicians.' },
      { topic: 'OTHER_MANDATORY', hoursRequired: 1, description: 'Alzheimer\'s disease and related dementias education', firstRenewalOnly: true, notes: 'One-time requirement for physicians serving adult populations per Mass. Gen. Laws ch. 112, §2.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Maryland
  {
    state: 'MD', renewalCycle: 24, totalHours: 50,
    notes: '25 of 50 hours must be Category 1. First renewal exemption applies. Implicit bias training required per Maryland Health Occupations Article §14-508 (no specific hour count). $100 per credit hour deficiency penalty. 6-year record retention.',
    sourceUrl: 'https://www.mbp.state.md.us',
    mandatories: [
      { topic: 'IMPLICIT_BIAS', hoursRequired: 1, description: 'Implicit bias training in health care (per Maryland Code Annotated, Health Occupations Article §14-508)', firstRenewalOnly: false, notes: 'Required as condition of renewal effective April 1, 2022. No specific hour minimum stated in statute; board requires completion.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Maine - DO: Maine Board of Osteopathic Licensure, 40 hrs Category 1
  {
    state: 'ME', renewalCycle: 24, totalHours: 40,
    notes: 'DO physicians regulated by Maine Board of Osteopathic Licensure. 40+ hrs Category 1 (AOA). Renewal tied to birth month. Jurisprudence exam required every ~4 years (separate from CME).',
    sourceUrl: 'https://maine.gov/osteopathic',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Controlled substance/opioid prescribing education', firstRenewalOnly: false, notes: 'Required per cycle for physicians who prescribe controlled substances' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Michigan - DO: 60 hrs Category 1 (simpler than MD)
  {
    state: 'MI', renewalCycle: 36, totalHours: 60,
    notes: 'DO requirement: 60 hours Category 1 per 3-year cycle (via AOA). Simpler than MD (150 hrs). Implicit bias 3hrs per cycle (phased in from 2022). Human trafficking 1-time training within 3 years. Opioid/CS training required (effective May 2024).',
    sourceUrl: 'https://www.michigan.gov/lara',
    mandatories: [
      { topic: 'ETHICS', hoursRequired: 1, description: 'Medical ethics', firstRenewalOnly: false, notes: 'Minimum 1 hour per 3-year cycle' },
      { topic: 'PAIN_MANAGEMENT', hoursRequired: 3, description: 'Pain and symptom management; at least 1 hour must address controlled substance prescribing', firstRenewalOnly: false, notes: 'Required per cycle. At least 1 of the 3 hours must specifically address controlled substance prescribing.' },
      { topic: 'IMPLICIT_BIAS', hoursRequired: 3, description: 'Implicit bias in health care', firstRenewalOnly: false, notes: 'Phased in from 2022. Full 3 hours required starting 2025 cycle and beyond.' },
      { topic: 'HUMAN_TRAFFICKING', hoursRequired: 1, description: 'Human trafficking identification and response', firstRenewalOnly: true, notes: 'One-time training required within 3 years of renewal. Mandatory for initial licensure since 2021.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Minnesota
  {
    state: 'MN', renewalCycle: 36, totalHours: 75,
    notes: 'All 75 hours must be Category 1 (AMA PRA Category 1, AOA equivalent, or Royal College of Physicians and Surgeons of Canada equivalent). No mandatory topics. ABMS/AOA MOC accepted as alternative compliance.',
    sourceUrl: 'https://mn.gov/boards/medical-practice',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Missouri
  {
    state: 'MO', renewalCycle: 24, totalHours: 50,
    notes: 'All 50 hours AMA PRA Category 1. No recurring mandatory topics beyond DEA MATE Act. Clean, straightforward requirements.',
    sourceUrl: 'https://pr.mo.gov/healingarts.asp',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Mississippi
  {
    state: 'MS', renewalCycle: 24, totalHours: 40,
    notes: 'All 40 hours AMA PRA Category 1. CE Broker reporting required. DEA-licensed physicians face both recurring 5hr and one-time 8hr MATE Act requirements.',
    sourceUrl: 'https://www.msbml.ms.gov',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 5, description: 'Prescribing of medications with emphasis on controlled substances', firstRenewalOnly: false, notes: 'Required every 2-year cycle for DEA-licensed physicians' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Montana - NO CME requirement
  {
    state: 'MT', renewalCycle: 24, totalHours: 0,
    notes: 'No CME requirement for Montana physician license renewal. Montana Board of Medical Examiners. DEA MATE Act still applies for DEA-registered practitioners.',
    sourceUrl: 'https://boards.bsd.dli.mt.gov/med',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners. Applies even though MT has no state CME requirement.' },
    ]
  },
  // North Carolina
  {
    state: 'NC', renewalCycle: 36, totalHours: 60,
    notes: 'Annual license renewal with 3-year rolling CME period. All 60 hours Category 1. Records kept 6 years. MATE Act training satisfies controlled substance CME requirement. ABMS MOC accepted.',
    sourceUrl: 'https://www.ncmedboard.org',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Controlled substance prescribing practices and chronic pain management; recognizing abuse/misuse signs or non-opioid treatment options', firstRenewalOnly: false, notes: 'Required per 3-year rolling period for physicians who prescribe controlled substances. MATE Act completion satisfies this requirement.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023). Completion satisfies NC controlled substance prescribing CME requirement for that 3-year period.' },
    ]
  },
  // North Dakota
  {
    state: 'ND', renewalCycle: 36, totalHours: 60,
    notes: 'All 60 hours AMA PRA Category 1. No recurring mandatory topics beyond DEA MATE Act. North Dakota State Board of Medical Examiners.',
    sourceUrl: 'https://www.ndbomex.com',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Nebraska
  {
    state: 'NE', renewalCycle: 24, totalHours: 50,
    notes: 'All 50 hours AMA PRA Category 1. Nebraska DHHS. Opioid CME 3hrs for controlled substance prescribers with unique 0.5hr PDMP sub-requirement.',
    sourceUrl: 'https://dhhs.ne.gov/licensure/Pages/Medical-Doctor-Licensing.aspx',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Opioid prescribing education including 0.5 hour on Prescription Drug Monitoring Program (PDMP) use', firstRenewalOnly: false, notes: 'Required every cycle for physicians who prescribe controlled substances. Must include 0.5hr PDMP-specific content.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // New Hampshire
  {
    state: 'NH', renewalCycle: 24, totalHours: 100,
    notes: '40 of 100 hours must be AMA PRA Category 1. New Hampshire State Board of Medicine. One of the highest biennial totals nationally.',
    sourceUrl: 'https://www.oplc.nh.gov/medicine',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Opioid prescribing for pain management or opioid use disorder treatment', firstRenewalOnly: false, notes: 'Required every 2-year cycle for DEA-licensed physicians' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // New Jersey
  {
    state: 'NJ', renewalCycle: 24, totalHours: 100,
    notes: 'N.J.S.A. 45:9-7.2. 40 of 100 hours must be Category I. Three distinct mandatory topic buckets per cycle: cultural competency (6hr), end-of-life (2hr), opioid (1hr).',
    sourceUrl: 'https://www.njconsumeraffairs.gov/bme',
    mandatories: [
      { topic: 'CULTURAL_COMPETENCY', hoursRequired: 6, description: 'Cultural competency in patient care (N.J.A.C. 13:35-6.25)', firstRenewalOnly: false, notes: 'Required every cycle. One of the largest per-cycle cultural competency mandates nationally.' },
      { topic: 'END_OF_LIFE_CARE', hoursRequired: 2, description: 'End-of-life care (Category I required)', firstRenewalOnly: false, notes: 'Required every cycle' },
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 1, description: 'Responsible opioid prescribing, alternatives to opioids, risks/signs of abuse/addiction/diversion (Category I required)', firstRenewalOnly: false, notes: 'Required every cycle effective 2019 renewal. Must be Category I.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // New Mexico
  {
    state: 'NM', renewalCycle: 36, totalHours: 75,
    notes: 'All 75 hours AMA PRA Category 1. CE Broker reporting required. NM Board of Osteopathic Medical Examiners for DOs. Practice Act review 1hr per cycle unique requirement.',
    sourceUrl: 'https://www.nmbome.com',
    mandatories: [
      { topic: 'OTHER_MANDATORY', hoursRequired: 1, description: 'New Mexico Medical/Osteopathic Practice Act review', firstRenewalOnly: false, notes: 'Required every renewal cycle for all licensees' },
      { topic: 'PAIN_MANAGEMENT', hoursRequired: 5, description: 'Pain management and prescribing controlled substances', firstRenewalOnly: false, notes: 'Required every cycle for physicians holding both DEA registration and NM controlled substance registration' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Oklahoma - DO: Annual, 16 hrs AOA Cat 1
  {
    state: 'OK', renewalCycle: 12, totalHours: 16,
    notes: 'DO: Annual renewal, 16 hours AOA Category 1 (or AMA Category 1 if maintaining AMA cert). OK Board of Osteopathic Examiners. Opioid seminar must be board-approved for DOs.',
    sourceUrl: 'https://www.ok.gov/osboe',
    mandatories: [
      { topic: 'PAIN_MANAGEMENT', hoursRequired: 1, description: 'Pain management or opioid use/addiction (board-approved seminar for DOs)', firstRenewalOnly: false, notes: 'Required annually for DEA-registered practitioners. DO version must be board-approved seminar.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Oregon
  {
    state: 'OR', renewalCycle: 24, totalHours: 60,
    notes: 'All 60 hours AMA PRA Category 1, AOA Category 1A, or AOA Category 2A. Oregon Medical Board. Pain management: OPMC free online course required (OAR 847-008-0075). Cultural competency 1hr/year (2hrs per cycle). ABMS/AOA MOC accepted as alternative.',
    sourceUrl: 'https://www.oregon.gov/omb',
    mandatories: [
      { topic: 'PAIN_MANAGEMENT', hoursRequired: 1, description: 'Oregon Pain Management Commission (OPMC) online course (OAR 847-008-0075)', firstRenewalOnly: false, notes: 'Required every 2-year cycle. Must use the specific OPMC free online course. Required even for non-opioid prescribers (common compliance gap).' },
      { topic: 'CULTURAL_COMPETENCY', hoursRequired: 2, description: 'Cultural competency: attitudes, knowledge, and skills for caring for patients from diverse cultural backgrounds (OAR 847-008-0077)', firstRenewalOnly: false, notes: '1 hour per year (2 hours per 2-year cycle). Physician determines what is relevant to their practice.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Rhode Island
  {
    state: 'RI', renewalCycle: 24, totalHours: 40,
    notes: 'All 40 hours AMA PRA Category 1. RI has its own 8hr one-time opioid requirement (Schedule II prescribers, eff Jan 4, 2022) predating the DEA MATE Act — may overlap; verify with board.',
    sourceUrl: 'https://health.ri.gov/licenses/detail.php?id=231',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 8, description: 'Opioid prescribing topics for Schedule II opioid prescribers (RI state requirement, effective Jan 4, 2022)', firstRenewalOnly: true, notes: 'One-time RI state requirement. May overlap with DEA MATE Act requirement; verify with board which satisfies which.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023). May overlap with RI state opioid requirement for DEA-registered practitioners.' },
    ]
  },
  // South Carolina
  {
    state: 'SC', renewalCycle: 24, totalHours: 40,
    notes: 'All 40 hours AMA PRA Category 1 or AOA Category 1. 30 of 40 hours must be within specialty. SC Board of Medical Examiners governs both MDs and DOs.',
    sourceUrl: 'https://llr.sc.gov/med',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 2, description: 'Prescribing and monitoring controlled substances', firstRenewalOnly: false, notes: 'Required every renewal cycle' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // South Dakota - NO CME requirement
  {
    state: 'SD', renewalCycle: 24, totalHours: 0,
    notes: 'No CME requirement for South Dakota physician license renewal. SD State Board of Medical and Osteopathic Examiners. DEA MATE Act still applies.',
    sourceUrl: 'https://doh.sd.gov/boards/medicine',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023). Applies even though SD has no state CME requirement.' },
    ]
  },
  // Tennessee
  {
    state: 'TN', renewalCycle: 24, totalHours: 40,
    notes: 'Biennial; renewal tied to birth month. CE Broker reporting. Controlled substance mandate covers opioids, benzos, barbiturates, carisoprodol — broader than most states.',
    sourceUrl: 'https://www.tn.gov/health/health-program-areas/health-professional-boards/me-board.html',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 2, description: 'Controlled substance prescribing: opioids, benzodiazepines, barbiturates, carisoprodol, addiction medicine, and risk management tools', firstRenewalOnly: false, notes: 'Required per cycle for all physicians with DEA registration. Broader scope than most states.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Utah
  {
    state: 'UT', renewalCycle: 24, totalHours: 40,
    notes: '34 of 40 hours must be Category 1 (ACCME or AOA). SBIRT one-time training (eff Jan 1, 2024) satisfies recurring controlled substance requirement for that cycle. UT DOPL 0.5hr tutorial required separately.',
    sourceUrl: 'https://dopl.utah.gov/med',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3.5, description: 'Controlled substance prescribing (3 hours) plus Utah DOPL 0.5-hour online tutorial', firstRenewalOnly: false, notes: 'Required per cycle for physicians who prescribe controlled substances. SBIRT training (one-time) may satisfy this requirement for the cycle in which it is completed.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 3.5, description: 'SBIRT (Screening, Brief Intervention, and Referral to Treatment) training', firstRenewalOnly: true, notes: 'One-time requirement beginning licensing period after Jan 1, 2024. Satisfies the recurring controlled substance CME requirement for that cycle.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Virginia
  {
    state: 'VA', renewalCycle: 24, totalHours: 30,
    notes: '18VAC85-20-235 effective Feb 27, 2025 — reduced from 60 to 30 hours. All 30 hours Type 1 (AMA PRA Category 1). No mandatory topic areas. First biennial renewal exempt. 6-year record retention.',
    sourceUrl: 'https://dhp.virginia.gov/medicine',
    mandatories: [
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Vermont - DO: Vermont Board of Osteopathic Physicians and Surgeons
  {
    state: 'VT', renewalCycle: 24, totalHours: 30,
    notes: 'DO: Vermont Board of Osteopathic Physicians and Surgeons. 30 hrs/2yr with 12 within scope of practice. Hospice/palliative/pain 1hr per cycle. DEA-registered: 2hr safe prescribing per cycle.',
    sourceUrl: 'https://sos.vermont.gov/osteopathic',
    mandatories: [
      { topic: 'END_OF_LIFE_CARE', hoursRequired: 1, description: 'Hospice, palliative care, or pain management', firstRenewalOnly: false, notes: 'Required every renewal cycle for all physicians' },
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 2, description: 'Safe and effective prescribing of controlled substances', firstRenewalOnly: false, notes: 'Required every cycle for DEA-registered physicians' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Wisconsin
  {
    state: 'WI', renewalCycle: 24, totalHours: 30,
    notes: 'All 30 hours AMA PRA Category 1. CE Broker reporting. Wisconsin Medical Examining Board. Low total hours; opioid mandate applies to virtually all EM physicians.',
    sourceUrl: 'https://dsps.wi.gov/Pages/Professions/Physician/Default.aspx',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 2, description: 'Opioid and controlled substance prescribing', firstRenewalOnly: false, notes: 'Required every cycle for physicians authorized to prescribe controlled substances' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // West Virginia - DO: WV Board of Osteopathy, 32 hrs/2yr
  {
    state: 'WV', renewalCycle: 24, totalHours: 32,
    notes: 'DO: WV Board of Osteopathy. 32 hrs/2yr, 16 must be AOA Category 1. New 2024 CS prescribing mandate (3hrs) effective July 1, 2024 — applies regardless of DEA status.',
    sourceUrl: 'https://wvboo.us',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 3, description: 'Risk assessment and responsible prescribing of controlled substances (effective July 1, 2024)', firstRenewalOnly: false, notes: 'Required every cycle for all physicians (regardless of DEA status). New 2024 mandate.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
  // Wyoming
  {
    state: 'WY', renewalCycle: 36, totalHours: 60,
    notes: 'All 60 hours AMA PRA Category 1. Wyoming Board of Medicine. Mismatched requirement: responsible prescribing 1hr on 2-year cycle within 3-year license (tracking complexity).',
    sourceUrl: 'https://wyomingboard.state.wy.us',
    mandatories: [
      { topic: 'OPIOID_PRESCRIBING', hoursRequired: 1, description: 'Responsible prescribing of controlled substances or SUD treatment', firstRenewalOnly: false, notes: 'Required on a 2-year sub-cycle within the 3-year license period for DEA-registered practitioners. Tracking complexity: not aligned with license renewal cycle.' },
      { topic: 'SUBSTANCE_USE', hoursRequired: 8, description: 'DEA MATE Act: treating/managing opioid and other substance use disorders', firstRenewalOnly: true, notes: 'One-time federal DEA MATE Act requirement (effective June 27, 2023) for DEA-registered practitioners' },
    ]
  },
];

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Railway PostgreSQL');

  let rulesSeeded = 0;
  let requirementsSeeded = 0;
  const errors = [];

  for (const rule of DO_RULES) {
    if (ALREADY_SEEDED.has(rule.state)) {
      console.log(`Skipping ${rule.state} — already seeded`);
      continue;
    }

    try {
      // Insert ComplianceRule
      const ruleResult = await client.query(`
        INSERT INTO "ComplianceRule" (id, state, "licenseType", "renewalCycle", "totalHours", notes, "updatedAt", "sourceUrl")
        VALUES (
          gen_random_uuid()::text,
          $1, 'DO', $2, $3, $4,
          NOW(),
          $5
        )
        ON CONFLICT (state, "licenseType") DO NOTHING
        RETURNING id, state
      `, [rule.state, rule.renewalCycle, rule.totalHours, rule.notes, rule.sourceUrl]);

      let complianceRuleId;
      if (ruleResult.rows.length > 0) {
        complianceRuleId = ruleResult.rows[0].id;
        rulesSeeded++;
        console.log(`✅ Seeded ComplianceRule: ${rule.state} DO (id: ${complianceRuleId})`);
      } else {
        // Rule already exists — fetch its id
        const existing = await client.query(
          `SELECT id FROM "ComplianceRule" WHERE state = $1 AND "licenseType" = 'DO'`,
          [rule.state]
        );
        if (existing.rows.length > 0) {
          complianceRuleId = existing.rows[0].id;
          console.log(`⚠️  ComplianceRule already exists: ${rule.state} DO (id: ${complianceRuleId})`);
        } else {
          console.error(`❌ Could not find or create ComplianceRule for ${rule.state}`);
          errors.push(`No rule id for ${rule.state}`);
          continue;
        }
      }

      // Insert MandatoryRequirements
      for (const req of rule.mandatories) {
        try {
          const reqResult = await client.query(`
            INSERT INTO "MandatoryRequirement" (id, "complianceRuleId", topic, "hoursRequired", description, "firstRenewalOnly", notes)
            VALUES (
              gen_random_uuid()::text,
              $1, $2::\"SpecialTopic\", $3, $4, $5, $6
            )
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [complianceRuleId, req.topic, req.hoursRequired, req.description, req.firstRenewalOnly, req.notes]);

          if (reqResult.rows.length > 0) {
            requirementsSeeded++;
          }
        } catch (reqErr) {
          const msg = `Mandatory req error for ${rule.state} topic ${req.topic}: ${reqErr.message}`;
          console.error(`❌ ${msg}`);
          errors.push(msg);
        }
      }
    } catch (err) {
      const msg = `Rule error for ${rule.state}: ${err.message}`;
      console.error(`❌ ${msg}`);
      errors.push(msg);
    }
  }

  await client.end();

  console.log('\n=== SEED COMPLETE ===');
  console.log(`DO rules seeded: ${rulesSeeded}`);
  console.log(`Mandatory requirements seeded: ${requirementsSeeded}`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('No errors!');
  }
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
