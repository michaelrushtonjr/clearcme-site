/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const local = parseEnv(fs.readFileSync(path.resolve('.env.local'), 'utf8'));
const url = new URL(local.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port !== '51214') throw new Error('Run D requires the localhost:51214 sandbox');
process.env.DATABASE_URL = local.DATABASE_URL;
module.exports = { local };
