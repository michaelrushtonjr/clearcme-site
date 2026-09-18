/* eslint-disable @typescript-eslint/no-require-imports */
require('./helpers/local-env.cjs');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
fs.mkdirSync('codex-review/walkthrough-D', {recursive:true});
const log = fs.openSync('codex-review/walkthrough-D/server.log', 'a');
require('node:fs').rmSync('codex-review/walkthrough-D/stop-server', {force:true});
const authSecret = require('node:crypto').randomBytes(32).toString('hex');
const base = new URL(process.env.WALKTHROUGH_BASE_URL || 'http://localhost:3000');
if (!['localhost','127.0.0.1'].includes(base.hostname)) throw new Error('Loopback only');
const child = spawn('npm', ['run', 'dev', '--', '--port', base.port || '3000', '--hostname', '0.0.0.0'], {
  stdio:['ignore',log,log], env:{...process.env, NEXTAUTH_URL:base.origin, AUTH_URL:base.origin, AUTH_TRUST_HOST:'true', AUTH_SECRET:authSecret, NEXTAUTH_SECRET:authSecret, NEXT_TELEMETRY_DISABLED:'1', WATCHPACK_POLLING:'true',
    RESEND_API_KEY:'', STRIPE_SECRET_KEY:'sk_test_run_d_local_mock', WALKTHROUGH_STRIPE_MOCK:'1', ANTHROPIC_API_KEY:'', BLOB_READ_WRITE_TOKEN:'',
    NODE_OPTIONS:`--require=${path.resolve('tests/e2e/helpers/server-guard.cjs')}`}
});
for (const s of ['SIGTERM','SIGINT']) process.on(s,()=>child.kill(s));
child.on('exit',c=>process.exit(c || 0));
