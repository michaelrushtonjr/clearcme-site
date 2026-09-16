// Shared review gate for rule sync and identity backfill. Never loads environment files.
const fs = require('fs');
const crypto = require('crypto');

function databaseTarget(value, args) {
  let url;
  try { url = new URL(value); } catch { throw new Error('A PostgreSQL DATABASE_URL is required'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('A PostgreSQL DATABASE_URL is required');
  const allowed = new Set(['schema', 'sslmode', 'connection_limit', 'connect_timeout', 'pool_timeout', 'socket_timeout', 'max_idle_connection_lifetime']);
  for (const key of url.searchParams.keys()) if (!allowed.has(key)) throw new Error(`Unsupported database URL option: ${key}`);
  const remote = !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (remote && !args.includes('--allow-remote')) throw new Error('Non-local DATABASE_URL requires --allow-remote');
  console.error(`Database target host: ${url.host}`);
  return { remote, host: url.host };
}
const checksum = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function savePlan(plan, file) {
  const json = JSON.stringify(plan, null, 2) + '\n';
  if (file) fs.writeFileSync(file, json, { mode: 0o600 });
  process.stdout.write(json);
}
function requirePlan(file, identity) {
  if (!file) throw new Error('Apply requires --plan=<file> produced by --dry-run');
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (plan.dryRun !== true || Object.entries(identity).some(([key, value]) => plan[key] !== value)) {
    throw new Error('Plan source checksum or scope does not match current source; run --dry-run again');
  }
  return plan;
}
module.exports = { databaseTarget, checksum, savePlan, requirePlan };
