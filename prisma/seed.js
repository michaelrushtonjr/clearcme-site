// ClearCME — Compliance Rule Seed Script
// Covers all 50 states + DC for MD license type
// Run: DATABASE_URL=... node prisma/seed.js

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// ── Helper ────────────────────────────────────────────────────────────────────
function rule(state, renewalCycleYears, totalHours, mandatories = [], opts = {}) {
  return {
    state,
    licenseType: 'MD',
    renewalCycle: renewalCycleYears * 12,
    totalHours,
    notes: opts.notes || null,
    sourceUrl: opts.sourceUrl || null,
    mandatoryRequirements: mandatories,
  };
}

function req(topic, hoursRequired, description, opts = {}) {
  return {
    topic,
    hoursRequired,
    description: description || null,
    firstRenewalOnly: opts.oneTime || false,
    notes: opts.notes || null,
  };
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const STATES = [
  // ── Priority 5 ──────────────────────────────────────────────────────────────
  rule('NV', 2, 40, [
    req('ETHICS',           2,  'Ethics, pain management, and addiction — required each 2-yr cycle'),
    req('SUICIDE_PREVENTION', 2, 'Suicide prevention — required every 4 years', { notes: 'Every 4 years (every other cycle)' }),
    req('OTHER_MANDATORY',  4,  'Bioterrorism/WMD — one-time requirement', { oneTime: true }),
    req('SUBSTANCE_USE',    2,  'SBIRT (Screening, Brief Intervention, Referral to Treatment) — one-time', { oneTime: true }),
    req('IMPLICIT_BIAS',    2,  'HIV implicit bias — required for EM physicians (one-time)', { oneTime: true, notes: 'EM physicians only' }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),

  rule('CA', 2, 50, [
    req('PAIN_MANAGEMENT',  12, 'Pain management and end-of-life care — 12 hr one-time requirement', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),

  rule('TX', 2, 48, [
    req('ETHICS',           2,  'Medical ethics — 2 hr required each 2-yr cycle'),
    req('PAIN_MANAGEMENT',  2,  'Opioid/pain management — 2 hr required each 2-yr cycle'),
    req('HUMAN_TRAFFICKING', 1, 'Human trafficking recognition — 1 hr required each 2-yr cycle'),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: '24 of 48 hours must be AMA PRA Category 1' }),

  rule('FL', 2, 40, [
    req('PATIENT_SAFETY',   2,  'Medical error prevention — 2 hr required each 2-yr cycle'),
    req('OTHER_MANDATORY',  2,  'Controlled substance prescribing — 2 hr required each 2-yr cycle (DEA holders)', { notes: 'DEA registrants only' }),
    req('DOMESTIC_VIOLENCE', 2, 'Domestic violence — 2 hr required every 6 years', { notes: 'Every 3 cycles (every 6 years)' }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),

  rule('NY', 3, 0, [
    req('INFECTION_CONTROL', 4, 'Infection control — required every 4 years', { notes: 'Variable credit; every 4 years' }),
    req('CHILD_ABUSE',      2,  'Child abuse identification and reporting — 2 hr one-time', { oneTime: true }),
    req('OPIOID_PRESCRIBING', 3, 'Opioid prescribing — 3 hr required each 3-yr cycle (controlled substance prescribers)', { notes: 'Controlled substance prescribers only' }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'NY has no state CME hour requirement for licensure renewal; mandatory topics still apply' }),

  // ── Remaining 45 states + DC ─────────────────────────────────────────────────
  rule('AL', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('AK', 2, 50, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('AZ', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('AR', 2, 60, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('CO', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('CT', 2, 50, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('DC', 2, 50, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('DE', 2, 40, [
    req('PATIENT_SAFETY',   1,  'Patient safety — 1 hr required each cycle'),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('GA', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('HI', 2, 40, [
    req('DOMESTIC_VIOLENCE', 2, 'Domestic violence — 2 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('ID', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('IL', 2, 150, [
    req('DOMESTIC_VIOLENCE', 3, 'Domestic violence — 3 hr one-time', { oneTime: true }),
    req('ETHICS',           6,  'Medical ethics — 6 hr required each cycle'),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'Illinois requires 150 CME hours per 3-year cycle (actually 3yr cycle)' }),
  rule('IN', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('IA', 3, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('KS', 2, 50, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('KY', 2, 60, [
    req('DOMESTIC_VIOLENCE', 3, 'Domestic violence — 3 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('LA', 2, 40, [
    req('OTHER_MANDATORY',  3,  'Controlled dangerous substances / prescribing — 3 hr required each cycle', { notes: 'CDS prescribers' }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('ME', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('MD', 2, 50, [
    req('CULTURAL_COMPETENCY', 2, 'Cultural competency — 2 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('MA', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('MI', 3, 150, [
    req('OTHER_MANDATORY',  1,  'Pain and symptom management — 1 hr required each cycle'),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'Michigan requires 150 CME hours per 3-year cycle' }),
  rule('MN', 2, 75, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'Minnesota requires 75 AMA PRA Category 1 hours per 3-year cycle — stored as 2-year equivalent; verify cycle' }),
  rule('MS', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('MO', 2, 0, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'Missouri has no state CME requirement for MD licensure; DEA MATE still applies' }),
  rule('MT', 2, 40, [
    req('DOMESTIC_VIOLENCE', 2, 'Domestic violence — 2 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('NE', 2, 50, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('NH', 2, 100, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'NH requires 100 hours per 3-year cycle — stored as 2yr approximation; verify cycle' }),
  rule('NJ', 2, 100, [
    req('IMPLICIT_BIAS',    2,  'Implicit bias training — 2 hr required each cycle'),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'NJ requires 100 credits per 2-year cycle; 40 must be AMA PRA Cat 1' }),
  rule('NM', 3, 75, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('NC', 2, 60, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('ND', 2, 60, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('OH', 2, 100, [
    req('DOMESTIC_VIOLENCE', 3, 'Domestic violence — 3 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('OK', 2, 60, [
    req('ETHICS',           2,  'Medical ethics — 2 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('OR', 2, 60, [
    req('PAIN_MANAGEMENT',  2,  'Pain management — 2 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('PA', 2, 100, [
    req('IMPLICIT_BIAS',    2,  'Implicit bias training — 2 hr required each cycle'),
    req('CHILD_ABUSE',      2,  'Child abuse recognition — 2 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('RI', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('SC', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('SD', 2, 60, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('TN', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('UT', 2, 40, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('VT', 2, 30, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('VA', 2, 60, [
    req('DOMESTIC_VIOLENCE', 2, 'Domestic violence — 2 hr one-time', { oneTime: true }),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('WA', 2, 200, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ], { notes: 'WA requires 200 CME hours per 4-year cycle — stored as 2yr approximation; verify cycle' }),
  rule('WV', 2, 60, [
    req('ETHICS',           2,  'Medical ethics — 2 hr required each cycle'),
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('WI', 2, 30, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
  rule('WY', 2, 60, [
    req('OTHER_MANDATORY',  8,  'DEA MATE Act — 8 hr one-time (if DEA registered)', { oneTime: true, notes: 'DEA registrants only' }),
  ]),
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding ClearCME compliance rules...\n');

  let rulesCreated = 0;
  let rulesUpdated = 0;
  let reqsCreated = 0;

  for (const stateData of STATES) {
    const { mandatoryRequirements, ...ruleData } = stateData;

    // Upsert the ComplianceRule
    const existing = await prisma.complianceRule.findUnique({
      where: { state_licenseType: { state: ruleData.state, licenseType: ruleData.licenseType } },
    });

    let rule;
    if (existing) {
      rule = await prisma.complianceRule.update({
        where: { id: existing.id },
        data: ruleData,
      });
      rulesUpdated++;
      // Delete existing mandatory requirements to re-seed cleanly
      await prisma.mandatoryRequirement.deleteMany({ where: { complianceRuleId: rule.id } });
    } else {
      rule = await prisma.complianceRule.create({ data: ruleData });
      rulesCreated++;
    }

    // Create mandatory requirements
    for (const req of mandatoryRequirements) {
      await prisma.mandatoryRequirement.create({
        data: { ...req, complianceRuleId: rule.id },
      });
      reqsCreated++;
    }

    console.log(`  ✅ ${ruleData.state} (${ruleData.totalHours}h / ${ruleData.renewalCycle}mo) — ${mandatoryRequirements.length} mandatory req(s)`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ComplianceRules created: ${rulesCreated}`);
  console.log(`  ComplianceRules updated: ${rulesUpdated}`);
  console.log(`  MandatoryRequirements created: ${reqsCreated}`);
  console.log(`  Total states seeded: ${STATES.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
