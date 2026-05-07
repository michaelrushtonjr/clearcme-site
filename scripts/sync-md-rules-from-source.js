/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'sync-rules-from-source.js');
const args = [script, '--license=MD', ...process.argv.slice(2)];
const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
