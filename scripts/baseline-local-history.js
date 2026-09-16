// Register only schema changes already present in the local sandbox. Historical
// data backfills must never be replayed against existing compliance facts.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Client } = require('pg');
const { localDatabaseUrl, withShadow, runPrisma, redact } = require('./local-prisma');

const FIRST_RUN_A_MIGRATION = '20260910060000_requirement_identity_retirement';

async function main() {
  const root = path.resolve(__dirname, '..');
  const local = require('dotenv').parse(fs.readFileSync(path.join(root, '.env.local')));
  const url = localDatabaseUrl(local.DATABASE_URL);
  if ((new URL(url).searchParams.get('schema') || 'public') !== 'public') throw new Error('This repair expects the public schema');
  const migrations = path.join(root, 'prisma/migrations');
  const names = fs.readdirSync(migrations).filter((name) => name < FIRST_RUN_A_MIGRATION && fs.statSync(path.join(migrations, name)).isDirectory()).sort();
  const db = new Client({ connectionString: url });
  let applied;
  await db.connect();
  try {
    const exists = (await db.query("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists")).rows[0].exists;
    applied = exists ? (await db.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations')).rows : [];
  } finally { await db.end(); }
  for (const row of applied) {
    if (!row.finished_at && !row.rolled_back_at) throw new Error(`Unresolved failed migration: ${row.migration_name}`);
    if (row.rolled_back_at) continue;
    const file = path.join(migrations, row.migration_name, 'migration.sql');
    if (!fs.existsSync(file) || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== row.checksum) {
      throw new Error(`Migration checksum mismatch: ${row.migration_name}`);
    }
  }
  const completed = new Set(applied.filter((row) => row.finished_at && !row.rolled_back_at).map((row) => row.migration_name));
  const missing = names.filter((name) => !completed.has(name));
  if (!missing.length) { console.log('Historical baseline is already registered.'); return; }
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'clearcme-baseline-'));
  try {
    for (const name of names) fs.cpSync(path.join(migrations, name), path.join(work, name), { recursive: true });
    fs.copyFileSync(path.join(migrations, 'migration_lock.toml'), path.join(work, 'migration_lock.toml'));
    await withShadow(async (shadow) => {
      const check = await runPrisma(['migrate', 'diff', '--from-migrations', work, '--to-config-datasource', '--exit-code'], url, shadow);
      process.stdout.write(check.output);
      if (check.code !== 0) throw new Error('Existing schema does not match the reconstructed history; no migrations were marked applied');
      for (const name of missing) {
        const result = await runPrisma(['migrate', 'resolve', '--applied', name], url, shadow);
        process.stdout.write(result.output);
        if (result.code !== 0) throw new Error(`Could not register ${name}; no historical data backfill was executed`);
      }
    });
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
}

if (require.main === module) main().catch((error) => { console.error(redact(error.message)); process.exitCode = 1; });
