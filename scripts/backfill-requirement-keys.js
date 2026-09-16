// ASTRA-TODO(A2-2): Local sockets are denied (EPERM); reconcile sandbox history and verify status/diff plus all 16 backup tables before rollout.
// Review #A2-2: environment-independent identity mapping; no compliance facts change.
const fs = require('fs');
const { databaseTarget, checksum, savePlan, requirePlan } = require('./reviewed-db-plan');
const { redact } = require('./local-prisma');

const descriptionKey = (row) => `${row.state}:${row.licenseType}:${row.topic}:${row.description ?? ''}`;
const baseKey = (row) => `${row.state}:${row.licenseType}:${row.topic}`;
function planBackfill(rows, mapping = {}) {
  if (!mapping || Array.isArray(mapping) || typeof mapping !== 'object') throw new Error('Mapping must be an object keyed by state:licenseType:topic:description');
  const groups = new Map();
  for (const row of rows) {
    const base = baseKey(row);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(row);
  }
  const collisions = [...groups].filter(([, group]) => group.length > 1).map(([key, group]) => ({ key, rows: group.map((row) => ({ id: row.id, identity: descriptionKey(row), description: row.description })) }));
  const unresolvedCollisions = collisions.filter((group) => group.rows.some((row) => !Object.hasOwn(mapping, row.identity)) || new Set(group.rows.map((row) => row.identity)).size !== group.rows.length);
  const staleMappings = Object.keys(mapping).filter((identity) => !rows.some((row) => descriptionKey(row) === identity));
  const planRows = [...rows].sort((a, b) => a.id.localeCompare(b.id)).map((row) => ({
    id: row.id, complianceRuleId: row.complianceRuleId, identity: descriptionKey(row),
    previousKey: row.requirementKey ?? null,
    requirementKey: Object.hasOwn(mapping, descriptionKey(row)) ? mapping[descriptionKey(row)] : baseKey(row),
  }));
  const invalidKeys = planRows.filter((row) => typeof row.requirementKey !== 'string' || !row.requirementKey.trim());
  const keys = new Map();
  for (const row of planRows) {
    const key = JSON.stringify([row.complianceRuleId, row.requirementKey]);
    if (!keys.has(key)) keys.set(key, []);
    keys.get(key).push(row.id);
  }
  const duplicateKeys = [...keys].filter(([, ids]) => ids.length > 1).map(([key, ids]) => ({ key: JSON.parse(key), ids }));
  return { rows: planRows, collisions, unresolvedCollisions, staleMappings, invalidKeys, duplicateKeys };
}
function assertResolved(plan) {
  if (plan.unresolvedCollisions.length || plan.staleMappings.length || plan.invalidKeys.length || plan.duplicateKeys.length) {
    throw new Error('Unresolved collision, stale mapping, invalid or duplicate requirement keys; no rows written');
  }
}
async function readRows(db) {
  return (await db.query('SELECT m.id, m."complianceRuleId", r.state, r."licenseType", m.topic, m.description, m."requirementKey" FROM "MandatoryRequirement" m JOIN "ComplianceRule" r ON r.id = m."complianceRuleId" ORDER BY m.id')).rows;
}
function planIdentity(rows, mapping) {
  // Current keys are deliberately excluded: the same reviewed plan is safe to reapply.
  return { kind: 'requirement-key-backfill', sourceChecksum: checksum({
    script: fs.readFileSync(__filename, 'utf8'),
    rows: rows.map(({ id, complianceRuleId, state, licenseType, topic, description }) => ({ id, complianceRuleId, state, licenseType, topic, description })),
    mapping: Object.fromEntries(Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b))),
  }) };
}
async function applyBackfill(db, mapping, review = () => {}) {
  await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    await db.query('LOCK TABLE "ComplianceRule", "MandatoryRequirement" IN SHARE ROW EXCLUSIVE MODE');
    const rows = await readRows(db);
    const plan = planBackfill(rows, mapping);
    assertResolved(plan);
    await review(planIdentity(rows, mapping));
    for (const row of plan.rows) {
      if (row.previousKey !== row.requirementKey) await db.query('UPDATE "MandatoryRequirement" SET "requirementKey" = $1 WHERE id = $2', [row.requirementKey, row.id]);
    }
    await db.query('COMMIT');
    return plan;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
}
async function main(args) {
  const target = databaseTarget(process.env.DATABASE_URL, args);
  const apply = args.includes('--apply');
  const inventory = args.includes('--inventory');
  if (apply && (inventory || args.includes('--dry-run'))) throw new Error('--apply cannot be combined with --inventory or --dry-run');
  const mappingFile = args.find((arg) => arg.startsWith('--mapping='))?.slice('--mapping='.length);
  if (inventory && mappingFile) throw new Error('--inventory must run without a mapping');
  const mapping = mappingFile ? JSON.parse(fs.readFileSync(mappingFile, 'utf8')) : {};
  const planFile = args.find((arg) => arg.startsWith('--plan='))?.slice('--plan='.length);
  if (apply && target.remote && !planFile) throw new Error('Remote apply requires --plan=<file> produced by --dry-run');
  const { Client } = require('pg');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema') || 'public';
    await db.query("SELECT set_config('search_path', $1, false)", [`"${schema.replaceAll('"', '""')}"`]);
    if (apply) {
      const plan = await applyBackfill(db, mapping, (identity) => {
        if (target.remote || planFile) requirePlan(planFile, identity);
      });
      console.log(JSON.stringify({ applied: true, ...plan }, null, 2));
    } else {
      const rows = await readRows(db);
      const plan = planBackfill(rows, mapping);
      if (inventory) console.log(JSON.stringify({ inventory: true, collisions: plan.collisions }, null, 2));
      else savePlan({ ...planIdentity(rows, mapping), dryRun: true, ...plan }, planFile);
    }
  } finally { await db.end(); }
}
if (require.main === module) main(process.argv.slice(2)).catch((error) => { console.error(redact(error.message)); process.exitCode = 1; });
module.exports = { descriptionKey, planBackfill, assertResolved, readRows, planIdentity, applyBackfill };
