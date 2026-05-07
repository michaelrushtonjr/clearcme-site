/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');
const { PrismaClient, LicenseType } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL environment variable is required');

const DRY_RUN = process.argv.includes('--dry-run');
const requestedLicense = (process.argv.find((arg) => arg.startsWith('--license=')) || '--license=MD').split('=')[1];
if (!['MD', 'DO'].includes(requestedLicense)) throw new Error('--license must be MD or DO');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function loadStateRequirements() {
  const sourcePath = path.join(__dirname, '..', 'lib', 'state-requirements.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const sandbox = { exports: {}, module: { exports: {} } };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(output, sandbox, { filename: sourcePath });
  return sandbox.exports.STATE_REQUIREMENTS;
}

function parseHours(hours) {
  if (!hours) return 0;
  const value = String(hours);
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function cadenceFor(topic) {
  const text = `${topic.hours || ''} ${topic.note || ''}`;
  if (/first renewal/i.test(text)) return 'FIRST_RENEWAL_ONLY';
  if (/initial/i.test(text)) return 'INITIAL_LICENSE_ONLY';
  if (/one-time|one time|within 5 years|within 3 years|required before first/i.test(text)) return 'ONE_TIME';
  const years = text.match(/every\s+(\d+)\s+years?/i) || text.match(/(\d+)-year/i);
  if (years) return 'EVERY_N_YEARS';
  if (/if |when applicable|applies|depending|implementation|pending|scope-specific|exemption|may apply|separate.*condition/i.test(text)) return 'CONDITIONAL';
  return 'EVERY_RENEWAL';
}

function intervalYearsFor(topic) {
  const text = `${topic.hours || ''} ${topic.note || ''}`;
  const years = text.match(/every\s+(\d+)\s+years?/i) || text.match(/(\d+)-year/i);
  return years ? Number(years[1]) : null;
}

function specialTopic(topic) {
  const text = `${topic.topic || ''} ${topic.note || ''}`.toLowerCase();
  if (/dea mate|mate training/.test(text)) return 'SUBSTANCE_USE';
  if (/implicit bias/.test(text)) return 'IMPLICIT_BIAS';
  if (/end-of-life|end of life|palliative|hospice/.test(text)) return 'END_OF_LIFE_CARE';
  if (/domestic|sexual violence/.test(text)) return 'DOMESTIC_VIOLENCE';
  if (/child abuse|pediatric abusive|abusive head/.test(text)) return 'CHILD_ABUSE';
  if (/elder abuse/.test(text)) return 'ELDER_ABUSE';
  if (/human trafficking/.test(text)) return 'HUMAN_TRAFFICKING';
  if (/infection|infectious|hiv/.test(text)) return 'INFECTION_CONTROL';
  if (/risk management|patient safety|medical error/.test(text)) return 'PATIENT_SAFETY';
  if (/ethics|board regulations|professional boundaries|sexual misconduct/.test(text)) return 'ETHICS';
  if (/cultural/.test(text)) return 'CULTURAL_COMPETENCY';
  if (/suicide|behavioral health/.test(text)) return 'SUICIDE_PREVENTION';
  if (/opioid|controlled substance|pain management|kasper|prescribing|substance|addiction|sbirt|oud|cds/.test(text)) return 'OPIOID_PRESCRIBING';
  return 'OTHER_MANDATORY';
}

function toMandatoryRequirement(topic) {
  const cadence = cadenceFor(topic);
  const intervalYears = intervalYearsFor(topic);
  return {
    topic: specialTopic(topic),
    hoursRequired: parseHours(topic.hours),
    description: topic.topic,
    firstRenewalOnly: cadence === 'ONE_TIME' || cadence === 'FIRST_RENEWAL_ONLY' || cadence === 'INITIAL_LICENSE_ONLY',
    cadence,
    intervalYears,
    lookbackYears: intervalYears,
    attestationAllowed: cadence !== 'EVERY_RENEWAL',
    notes: [topic.hours, topic.note].filter(Boolean).join(' — ') || null,
  };
}

async function upsertState(state, requirement, licenseType) {
  if (requirement.cycleYears === null) {
    return {
      state,
      licenseType,
      skipped: true,
      reason: 'Variable total-hours/cycle path cannot be represented safely in ComplianceRule yet',
      notes: `${requirement.totalHoursLabel}; ${requirement.cycleLabel}`,
    };
  }
  const ruleData = {
    state,
    licenseType,
    totalHours: requirement.totalHours ?? 0,
    renewalCycle: requirement.cycleYears * 12,
    notes: `${requirement.totalHoursLabel}; ${requirement.cycleLabel}`,
  };
  const mandatoryRequirements = requirement.mandatoryTopics.map(toMandatoryRequirement);
  if (DRY_RUN) return { state, ...ruleData, mandatoryCount: mandatoryRequirements.length };

  const existing = await prisma.complianceRule.findUnique({
    where: { state_licenseType: { state, licenseType } },
    select: { id: true },
  });
  const rule = existing
    ? await prisma.complianceRule.update({ where: { id: existing.id }, data: ruleData })
    : await prisma.complianceRule.create({ data: ruleData });
  await prisma.mandatoryRequirement.deleteMany({ where: { complianceRuleId: rule.id } });
  for (const requirementRow of mandatoryRequirements) {
    await prisma.mandatoryRequirement.create({ data: { ...requirementRow, complianceRuleId: rule.id } });
  }
  return { state, totalHours: ruleData.totalHours, renewalCycle: ruleData.renewalCycle, mandatoryCount: mandatoryRequirements.length };
}

async function main() {
  const requirements = loadStateRequirements();
  const licenseType = LicenseType[requestedLicense];
  const states = Object.keys(requirements).sort();
  const results = [];
  for (const state of states) results.push(await upsertState(state, requirements[state][licenseType], licenseType));
  console.log(JSON.stringify({ dryRun: DRY_RUN, licenseType, synced: results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
