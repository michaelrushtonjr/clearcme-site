/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL environment variable is required');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function req(topic, hoursRequired, description, opts = {}) {
  const cadence = opts.cadence ?? (opts.oneTime ? 'ONE_TIME' : opts.intervalYears ? 'EVERY_N_YEARS' : 'EVERY_RENEWAL');
  return {
    topic,
    hoursRequired,
    description,
    firstRenewalOnly: opts.oneTime || cadence === 'ONE_TIME' || cadence === 'FIRST_RENEWAL_ONLY',
    cadence,
    intervalYears: opts.intervalYears ?? null,
    lookbackYears: opts.lookbackYears ?? opts.intervalYears ?? null,
    attestationAllowed: opts.attestationAllowed ?? true,
    notes: opts.notes ?? null,
  };
}

function rule(state, totalHours, cycleMonths, mandatoryRequirements, notes = null) {
  return { state, licenseType: 'MD', totalHours, renewalCycle: cycleMonths, notes, mandatoryRequirements };
}

const RULES = [
  rule('CT', 50, 24, [
    req('INFECTION_CONTROL', 1, 'Infectious diseases / HIV', { cadence: 'EVERY_N_YEARS', intervalYears: 6, notes: 'Required at first renewal and every 6 years thereafter.' }),
    req('PATIENT_SAFETY', 1, 'Risk management', { cadence: 'EVERY_N_YEARS', intervalYears: 6, notes: 'Required at first renewal and every 6 years thereafter.' }),
    req('OTHER_MANDATORY', 1, 'Sexual assault education', { cadence: 'EVERY_N_YEARS', intervalYears: 6, notes: 'Required at first renewal and every 6 years thereafter.' }),
    req('DOMESTIC_VIOLENCE', 1, 'Domestic violence recognition and response', { cadence: 'EVERY_N_YEARS', intervalYears: 6, notes: 'Required at first renewal and every 6 years thereafter.' }),
    req('CULTURAL_COMPETENCY', 1, 'Cultural competency', { cadence: 'EVERY_N_YEARS', intervalYears: 6, notes: 'Required at first renewal and every 6 years thereafter.' }),
    req('SUICIDE_PREVENTION', 1, 'Behavioral health', { cadence: 'EVERY_N_YEARS', intervalYears: 6, notes: 'Required at first renewal and every 6 years thereafter.' }),
    req('SUBSTANCE_USE', 8, 'DEA MATE Act: treating/managing opioid and other substance use disorders', { oneTime: true, notes: 'One-time federal requirement if DEA-registered.' }),
  ], 'Annual registration; 50 hours in the 24-month CME lookback. Six named topics rotate at first renewal and every 6 years.'),

  rule('MA', 50, 24, [
    req('PATIENT_SAFETY', 10, 'Risk management', { notes: 'Required each renewal cycle.' }),
    req('ETHICS', 2, 'Board regulations review', { notes: 'Required each renewal cycle.' }),
    req('OPIOID_PRESCRIBING', 3, 'Opioid education and pain management', { notes: 'Required each renewal cycle if prescribing controlled substances.' }),
    req('IMPLICIT_BIAS', 2, 'Implicit bias in health care', { oneTime: true, notes: 'One-time if not completed previously.' }),
    req('END_OF_LIFE_CARE', 2, 'End-of-life care', { oneTime: true }),
    req('CHILD_ABUSE', 0, 'Child abuse recognition and reporting', { oneTime: true, notes: 'One-time training; no fixed CME hour value in ClearCME rule data.' }),
    req('DOMESTIC_VIOLENCE', 0, 'Domestic and sexual violence', { oneTime: true, notes: 'One-time training; no fixed CME hour value in ClearCME rule data.' }),
    req('OTHER_MANDATORY', 1, "Alzheimer's disease / dementias", { oneTime: true, notes: 'If serving adult populations and not previously completed.' }),
    req('OTHER_MANDATORY', 3, 'EHR proficiency', { oneTime: true, notes: 'Course or demonstration-of-proficiency pathway may satisfy.' }),
    req('SUBSTANCE_USE', 8, 'DEA MATE Act: treating/managing opioid and other substance use disorders', { oneTime: true, notes: 'One-time federal requirement if DEA-registered.' }),
  ], 'Policy 17-05 operational standard: 50 credits per 2-year renewal cycle.'),

  rule('UT', 40, 24, [
    req('SUICIDE_PREVENTION', 0.5, 'Suicide prevention training', { notes: 'Required every renewal.' }),
    req('OPIOID_PRESCRIBING', 3.5, 'Controlled substance prescribing', { notes: 'Required every renewal if prescribing controlled substances.' }),
    req('SUBSTANCE_USE', 3.5, 'SBIRT', { oneTime: true, notes: 'One-time beginning after Jan. 1, 2024; satisfies controlled-substance CE for the cycle taken.' }),
    req('SUBSTANCE_USE', 8, 'DEA MATE Act: treating/managing opioid and other substance use disorders', { oneTime: true, notes: 'One-time federal requirement if DEA-registered.' }),
  ], '40 hours per 2-year cycle; 34 Category 1 minimum.'),

  rule('WV', 50, 24, [
    req('OPIOID_PRESCRIBING', 3, 'Risk assessment and responsible prescribing / controlled substances', { notes: 'For 2026 renewal if prescribing, administering, or dispensing controlled substances in WV; post-2026 becomes initial-license/one-time logic for new prescribers/dispensers.' }),
    req('OTHER_MANDATORY', 0, 'Nutrition education', { cadence: 'CONDITIONAL', notes: 'HB 4951 effective June 12, 2026; board implementation/hour details pending.' }),
    req('SUBSTANCE_USE', 8, 'DEA MATE Act: treating/managing opioid and other substance use disorders', { oneTime: true, notes: 'One-time federal requirement if DEA-registered.' }),
  ], '2-year renewal cycle; WV controlled-substance renewal prerequisite sunsets after the 2026 cycle.'),

  rule('KY', 60, 36, [
    req('OPIOID_PRESCRIBING', 4.5, 'KASPER / pain management / addiction', { cadence: 'EVERY_N_YEARS', intervalYears: 3, notes: 'Every 3-year CME cycle if authorized to prescribe or dispense controlled substances.' }),
    req('SUBSTANCE_USE', 12, 'Addiction medicine', { cadence: 'EVERY_N_YEARS', intervalYears: 3, notes: 'Every 3-year CME cycle if DEA-licensed to prescribe buprenorphine.' }),
    req('DOMESTIC_VIOLENCE', 3, 'Domestic violence', { cadence: 'EVERY_N_YEARS', intervalYears: 3, notes: 'Within 3 years if primary care physician.' }),
    req('CHILD_ABUSE', 1, 'Pediatric abusive head trauma', { cadence: 'EVERY_N_YEARS', intervalYears: 5, notes: 'Within 5 years for EM, FM, pediatrics, radiology, urgent care.' }),
    req('SUBSTANCE_USE', 8, 'DEA MATE Act: treating/managing opioid and other substance use disorders', { oneTime: true, notes: 'One-time federal requirement if DEA-registered.' }),
  ], 'Annual license registration by March 1; CME is reported on a separate 3-year cycle.'),
];

async function syncRule(config) {
  const { mandatoryRequirements, ...ruleData } = config;
  const existing = await prisma.complianceRule.findUnique({
    where: { state_licenseType: { state: ruleData.state, licenseType: ruleData.licenseType } },
    select: { id: true },
  });

  const rule = existing
    ? await prisma.complianceRule.update({ where: { id: existing.id }, data: ruleData })
    : await prisma.complianceRule.create({ data: ruleData });

  await prisma.mandatoryRequirement.deleteMany({ where: { complianceRuleId: rule.id } });
  for (const requirement of mandatoryRequirements) {
    await prisma.mandatoryRequirement.create({ data: { ...requirement, complianceRuleId: rule.id } });
  }
  return { state: ruleData.state, totalHours: ruleData.totalHours, renewalCycle: ruleData.renewalCycle, mandatoryCount: mandatoryRequirements.length };
}

async function main() {
  const results = [];
  for (const config of RULES) results.push(await syncRule(config));
  console.log(JSON.stringify({ synced: results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
