/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { loadStateRequirements, parseHours, specialTopic } = require('./rule-source');
const { planSync, withRequirementKeys } = require('./rule-sync-planner');
const { databaseTarget, checksum, savePlan, requirePlan } = require('./reviewed-db-plan');

function sourceRows(state, licenseType, topics, existingRows, questions) {
  const rows = topics.map((topic) => {
    const mapped = specialTopic(topic);
    const candidates = existingRows.filter((row) => row.topic === mapped);
    const existing = candidates.find((row) => row.description === topic.topic) ?? (candidates.length === 1 ? candidates[0] : undefined);
    const explicit = Boolean(topic.cadence) && (topic.cadence !== 'EVERY_N_YEARS' || topic.intervalYears > 0);
    if (!explicit) questions.push(`${state} ${licenseType}: ${topic.topic} — cadence/interval missing; proposed value requires Vera/Roz verification. Existing cadence fields are preserved; new rows use CONDITIONAL with UNVERIFIED-CADENCE.`);
    const cadence = explicit ? topic.cadence : existing ? existing.cadence : 'CONDITIONAL';
    return {
      topic: mapped, hoursRequired: parseHours(topic.hours), description: topic.topic,
      firstRenewalOnly: explicit ? ['ONE_TIME', 'FIRST_RENEWAL_ONLY', 'INITIAL_LICENSE_ONLY'].includes(cadence) : existing ? existing.firstRenewalOnly : false,
      cadence,
      intervalYears: explicit ? topic.intervalYears ?? null : existing ? existing.intervalYears : null,
      lookbackYears: !explicit && existing ? existing.lookbackYears : existing?.lookbackYears ?? topic.intervalYears ?? null,
      attestationAllowed: existing ? existing.attestationAllowed : true,
      notes: !explicit && existing ? existing.notes : `${explicit ? '' : 'UNVERIFIED-CADENCE: '}${[topic.hours, topic.note].filter(Boolean).join(' — ')}` || null,
    };
  });
  return withRequirementKeys(state, licenseType, rows, existingRows);
}

function appendQuestions(questions) {
  if (!questions.length) return;
  const file = path.join(__dirname, '..', 'codex-review', 'FACT-QUESTIONS-A.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '# Run A fact questions\n';
  const fresh = questions.filter((line) => !existing.includes(line) && !existing.includes(line.split(' — ')[0].replace(': ', ' — ')));
  if (fresh.length) fs.writeFileSync(file, existing + '\n' + fresh.map((line) => `- ${line}`).join('\n') + '\n');
}

async function syncState(prisma, state, requirement, licenseType, questions) {
  if (requirement.cycleYears === null) return { state, skipped: true, reason: 'Variable cycle cannot be represented safely' };
  return prisma.$transaction(async (tx) => {
    const before = await tx.complianceRule.findUnique({
      where: { state_licenseType: { state, licenseType } }, include: { mandatoryRequirements: true },
    });
    const existingRows = before?.mandatoryRequirements ?? [];
    const source = sourceRows(state, licenseType, requirement.mandatoryTopics, existingRows, questions);
    const plan = planSync(source, existingRows);
    const ruleData = { state, licenseType, totalHours: requirement.totalHours ?? 0, renewalCycle: requirement.cycleYears * 12, notes: `${requirement.totalHoursLabel}; ${requirement.cycleLabel}` };
    const ruleChanged = !before || Object.entries(ruleData).some(([key, value]) => before[key] !== value);
    const rule = !ruleChanged ? before : await tx.complianceRule.upsert({ where: { state_licenseType: { state, licenseType } }, create: ruleData, update: ruleData });
    for (const row of plan.creates) {
      await tx.mandatoryRequirement.upsert({ where: { complianceRuleId_requirementKey: { complianceRuleId: rule.id, requirementKey: row.requirementKey } }, create: { ...row, complianceRuleId: rule.id }, update: row });
    }
    for (const update of plan.updates) {
      const data = Object.fromEntries(Object.entries(update.changes).map(([key, change]) => [key, change.to]));
      const row = source.find((item) => item.requirementKey === update.requirementKey);
      await tx.mandatoryRequirement.upsert({ where: { complianceRuleId_requirementKey: { complianceRuleId: rule.id, requirementKey: update.requirementKey } }, create: { ...row, complianceRuleId: rule.id }, update: data });
    }
    for (const row of plan.retires) {
      await tx.mandatoryRequirement.update({ where: { complianceRuleId_requirementKey: { complianceRuleId: rule.id, requirementKey: row.requirementKey } }, data: { retiredAt: new Date() } });
    }
    return { state, created: plan.creates.length, updated: plan.updates.length, retired: plan.retires.length, unchanged: source.length - plan.creates.length - plan.updates.length };
  }, { isolationLevel: 'Serializable' });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const licenseType = (process.argv.find((arg) => arg.startsWith('--license=')) || '--license=MD').split('=')[1];
  if (!['MD', 'DO'].includes(licenseType)) throw new Error('--license must be MD or DO');
  const requirements = loadStateRequirements();
  const questions = [];
  const args = process.argv.slice(2);
  const planPath = args.find((arg) => arg.startsWith('--plan='))?.slice('--plan='.length);
  const sourceChecksum = checksum(['rule-source.js', 'rule-sync-planner.js', 'sync-rules-from-source.js', '../lib/state-requirements.ts'].map((file) => fs.readFileSync(path.join(__dirname, file), 'utf8')));
  const target = process.env.DATABASE_URL ? databaseTarget(process.env.DATABASE_URL, args) : null;
  const identity = { kind: 'rule-sync', licenseType, sourceChecksum };
  if (dryRun) {
    const snapshotPath = process.argv.find((arg) => arg.startsWith('--existing='))?.slice('--existing='.length);
    if (!snapshotPath) throw new Error('--dry-run requires --existing=<JSON snapshot of ComplianceRule[] including mandatoryRequirements>; use [] only for an empty baseline. No database is contacted.');
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const results = Object.keys(requirements).sort().map((state) => {
      const requirement = requirements[state][licenseType];
      if (requirement.cycleYears === null) return { state, skipped: true, reason: 'Variable cycle cannot be represented safely' };
      const before = snapshot.find((rule) => rule.state === state && rule.licenseType === licenseType);
      const rows = before?.mandatoryRequirements ?? [];
      const rule = { state, licenseType, totalHours: requirement.totalHours ?? 0, renewalCycle: requirement.cycleYears * 12, notes: `${requirement.totalHoursLabel}; ${requirement.cycleLabel}` };
      return { state, ruleDiff: Object.fromEntries(Object.entries(rule).filter(([key, value]) => before?.[key] !== value).map(([key, value]) => [key, { from: before?.[key] ?? null, to: value }])), ...planSync(sourceRows(state, licenseType, requirement.mandatoryTopics, rows, questions), rows) };
    });
    const plan = { ...identity, dryRun: true, baseline: snapshotPath, states: results };
    savePlan(plan, planPath);
    appendQuestions(questions);
    return;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL environment variable is required');
  if (target.remote || planPath) requirePlan(planPath, identity);
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    for (const state of Object.keys(requirements).sort()) console.log(JSON.stringify(await syncState(prisma, state, requirements[state][licenseType], licenseType, questions)));
  } finally { appendQuestions(questions); await prisma.$disconnect(); }
}
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { sourceRows, syncState };
