// Run A: local-only Prisma operations with a disposable, separate shadow server.
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');

function localDatabaseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('A local PostgreSQL DATABASE_URL is required'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Refusing a non-local PostgreSQL database');
  }
  // Connection options must not redirect the client to another host/socket.
  const allowed = new Set(['schema', 'sslmode', 'connection_limit', 'connect_timeout', 'pool_timeout', 'socket_timeout', 'max_idle_connection_lifetime']);
  for (const key of url.searchParams.keys()) if (!allowed.has(key)) throw new Error(`Unsupported database URL option: ${key}`);
  return url.href;
}

function validateArguments(args) {
  if (args[0] !== 'migrate' || !['dev', 'diff', 'status', 'resolve'].includes(args[1])) {
    throw new Error('Allowed local commands: migrate dev, diff, status, resolve');
  }
  if (args.some((arg) => /^--(?:url|config)(?:=|$)/.test(arg))) {
    throw new Error('Database and config overrides are not allowed by the local runner');
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function withShadow(fn) {
  const { startPrismaDevServer } = require('@prisma/dev');
  const ports = new Set();
  while (ports.size < 3) ports.add(await freePort());
  const [port, databasePort, shadowDatabasePort] = [...ports];
  const server = await startPrismaDevServer({ name: `clearcme-migrate-${crypto.randomUUID()}`, port, databasePort, shadowDatabasePort });
  try { return await fn(localDatabaseUrl(server.shadowDatabase.prismaORMConnectionString)); }
  finally { await server.close(); }
}

function redact(output) {
  return output.replace(/(?:postgres(?:ql)?|prisma\+postgres):\/\/[^\s"'`]+/g, '[database URL redacted]');
}

async function runPrisma(args, databaseUrl, shadowDatabaseUrl, extraArgs = []) {
  const data = new URL(localDatabaseUrl(databaseUrl));
  const shadow = new URL(localDatabaseUrl(shadowDatabaseUrl));
  // PGlite multiplexes database names/schemas through one engine. Different
  // schemas on the same endpoint are NOT independent shadow databases.
  if ((data.port || '5432') === (shadow.port || '5432')) throw new Error('Shadow database must use a separate local port');
  const schema = data.searchParams.get('schema') || 'public';
  data.searchParams.set('schema', schema);
  // Prisma dev's PGlite engine retains search_path between socket clients.
  // Establish it explicitly before Prisma opens its migration connection.
  const { Client } = require('pg');
  const db = new Client({ connectionString: data.href });
  await db.connect();
  try { await db.query("SELECT set_config('search_path', $1, false)", [`"${schema.replaceAll('"', '""')}"`]); }
  finally { await db.end(); }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('prisma/build/index.js'), ...args, ...extraArgs], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: data.href, SHADOW_DATABASE_URL: shadow.href, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output: redact(output) }));
  });
}

async function main(args) {
  validateArguments(args);
  // Deliberately ignore exported DATABASE_URL and .env: Next.js uses .env.local.
  const local = require('dotenv').parse(fs.readFileSync(path.resolve(__dirname, '../.env.local')));
  const url = localDatabaseUrl(local.DATABASE_URL);
  const result = await withShadow(async (shadow) => {
    const result = await runPrisma(args, url, shadow);
    process.stdout.write(result.output);
    return result;
  });
  process.exitCode = result.code ?? 1;
}

if (require.main === module) main(process.argv.slice(2)).catch((error) => {
  console.error(redact(error.message));
  process.exitCode = 1;
});

module.exports = { localDatabaseUrl, validateArguments, withShadow, runPrisma, redact };
