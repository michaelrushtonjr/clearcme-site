/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('node:net');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
require('./helpers/local-env.cjs');
async function free(port) {
  return new Promise(resolve=>{const s=createServer();s.once('error',()=>resolve(false));s.listen(port,'127.0.0.1',()=>s.close(()=>resolve(true)));});
}
(async()=>{
  // --list is a discovery-only command and never starts the web server/browser.
  const listing = process.argv.includes('--list');
  const requested = new URL(process.env.WALKTHROUGH_BASE_URL || 'http://localhost:3000');
  if(!['localhost','127.0.0.1'].includes(requested.hostname)) throw new Error('Loopback only');
  let port = Number(requested.port || 3000);
  if(!listing && !(await free(port))) { port=3100; if(!(await free(port))) throw new Error('Ports 3000 and 3100 unavailable; no existing server will be reused'); }
  const base=`http://localhost:${port}`;
  mkdirSync('codex-review/walkthrough-D',{recursive:true});
  if(!listing) writeFileSync('codex-review/walkthrough-D/mock-modes.json','{}');
  const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config','tests/e2e/playwright.config.ts',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,WALKTHROUGH_BASE_URL:base,NEXTAUTH_URL:base,AUTH_URL:base,AUTH_TRUST_HOST:'true',REVIEW_DEMO_EMAIL:process.env.REVIEW_DEMO_EMAIL || 'walkthrough-d@local.test',REVIEW_DEMO_CODE:process.env.REVIEW_DEMO_CODE || 'WALKTHRU-RUN-D'}});
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
  child.on('exit',code=>process.exit(code || 0));
})().catch(e=>{console.error(e.message);process.exit(1);});
