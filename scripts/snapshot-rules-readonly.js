/* eslint-disable @typescript-eslint/no-require-imports */
// Read-only snapshot for `sync-rules-from-source.js --dry-run --existing=<file>`.
//
// Safety: the session is switched to read-only before anything else, every
// statement runs inside one READ ONLY transaction (PostgreSQL rejects any
// write there), the script refuses to continue unless the server confirms
// that, and the transaction is rolled back at the end. Only SELECT/SHOW/SET
// statements exist in this file.
//
// Privacy: rule rows are exported in full. User tables are only COUNTED
// (completions per requirement, licenses per state) — no user row, id, email
// or note text leaves the database.
const fs = require('fs');
const { databaseTarget } = require('./reviewed-db-plan');

const COMPLETION_COUNTS = `
  SELECT c."mandatoryRequirementId" AS "requirementId",
         count(*)::int AS total,
         count(DISTINCT c."userId")::int AS users,
         count(*) FILTER (WHERE c.source = 'SELF_ATTESTED')::int AS "selfAttested",
         count(*) FILTER (WHERE c.source = 'CERTIFICATE_UPLOAD')::int AS "certificateUpload",
         count(*) FILTER (WHERE c.source = 'ADMIN_ADJUSTED')::int AS "adminAdjusted",
         count(*) FILTER (WHERE c.notes = '__CLEARCME_NOT_APPLICABLE__')::int AS "markedNotApplicable",
         count(*) FILTER (WHERE c.notes = '__CLEARCME_NOT_COMPLETED__')::int AS "markedNotCompleted",
         count(*) FILTER (WHERE c.notes LIKE '__CLEARCME_CERT__:%')::int AS "linkedToCertificate"
  FROM "UserRequirementCompletion" c
  GROUP BY c."mandatoryRequirementId"`;

const LICENSE_COUNTS = `
  SELECT state, "licenseType", count(*)::int AS licenses, count(DISTINCT "userId")::int AS users,
         count(*) FILTER (WHERE "isActive")::int AS active
  FROM "PhysicianLicense" GROUP BY state, "licenseType" ORDER BY state, "licenseType"`;

async function main() {
  const args = process.argv.slice(2);
  const out = args.find((arg) => arg.startsWith('--out='))?.slice('--out='.length);
  const impactOut = args.find((arg) => arg.startsWith('--impact='))?.slice('--impact='.length);
  if (!out) throw new Error('--out=<rules snapshot file> is required');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL environment variable is required');
  const target = databaseTarget(connectionString, args);
  const { Client, types } = require('pg');
  // Prisma stores DateTime as UTC in columns without a time zone. Read them as UTC,
  // not in this machine's local time, so updatedAt and retiredAt are exported correctly.
  types.setTypeParser(1114, (value) => new Date(`${value.replace(' ', 'T')}Z`));
  const client = new Client({ connectionString, statement_timeout: 30000, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query('SET default_transaction_read_only = on');
    await client.query('BEGIN TRANSACTION READ ONLY');
    const readOnly = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
    if (readOnly !== 'on') throw new Error('Refusing to continue: the transaction is not read-only');
    const takenAt = (await client.query('SELECT now() AS now')).rows[0].now;
    const rules = (await client.query('SELECT * FROM "ComplianceRule" ORDER BY state, "licenseType"')).rows;
    const requirements = (await client.query('SELECT * FROM "MandatoryRequirement" ORDER BY "complianceRuleId", "requirementKey", id')).rows;
    const byRule = new Map(rules.map((rule) => [rule.id, { ...rule, mandatoryRequirements: [] }]));
    for (const row of requirements) byRule.get(row.complianceRuleId)?.mandatoryRequirements.push(row);
    fs.writeFileSync(out, JSON.stringify([...byRule.values()], null, 2) + '\n', { mode: 0o600 });
    const summary = { host: target.host, takenAt, rules: rules.length, requirements: requirements.length, activeRequirements: requirements.filter((row) => !row.retiredAt).length };
    if (impactOut) {
      const completions = (await client.query(COMPLETION_COUNTS)).rows;
      const licenses = (await client.query(LICENSE_COUNTS)).rows;
      const migrations = (await client.query('SELECT migration_name, finished_at IS NOT NULL AS applied, rolled_back_at IS NOT NULL AS "rolledBack" FROM _prisma_migrations ORDER BY started_at')).rows;
      fs.writeFileSync(impactOut, JSON.stringify({ ...summary, completions, licenses, migrations }, null, 2) + '\n', { mode: 0o600 });
      summary.completionRows = completions.reduce((sum, row) => sum + row.total, 0);
      summary.licenseRows = licenses.reduce((sum, row) => sum + row.licenses, 0);
    }
    console.log(JSON.stringify(summary));
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
