/* eslint-disable @typescript-eslint/no-require-imports */
const evidenceRoot = process.env.WALKTHROUGH_EVIDENCE_DIR || 'codex-review/walkthrough-D';
// Test-process-only boundary. No application code imports this file.
require('./local-env.cjs');
const fs = require('node:fs');
const net = require('node:net');
// Prisma dev/PGlite multiplexes sessions: serialize the run's server pool.
const pg = require('pg');
pg.Pool = class WalkthroughPool extends pg.Pool { constructor(options) { super({...options,max:1}); } };

// Run-owned shutdown control when the sandbox cannot signal a detached child.
setInterval(()=>{if(fs.existsSync(`${evidenceRoot}/stop-server`)) process.exit(0);},500).unref();
const http = require('node:http');
const https = require('node:https');
const { Writable, Readable } = require('node:stream');
const { syncBuiltinESMExports } = require('node:module');
const localHost = h => !h || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(h);
const log = data => fs.appendFileSync(`${evidenceRoot}/server-boundary.jsonl`, JSON.stringify({time:new Date().toISOString(),...data})+'\n');
function mode(service) {
  try { return JSON.parse(fs.readFileSync(`${evidenceRoot}/mock-modes.json`,'utf8'))[service] || 'success'; }
  catch { return 'success'; }
}
function deny(host) { log({host,blocked:true}); throw new Error('RUN_D_BLOCKED_OUTBOUND: '+host); }
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const o = normalized[0];
  const host = typeof o === 'object' ? (o.host || o.hostname) : typeof normalized[1] === 'string' ? normalized[1] : undefined;
  if (!localHost(host)) deny(host);
  return connect.apply(this, args);
};
for (const transport of [http,https]) {
  const request = transport.request;
  transport.request = function (...args) {
    const opts = typeof args[0] === 'string' || args[0] instanceof URL ? new URL(args[0]) : args[0];
    const host = opts.hostname || opts.host;
    if (localHost(host)) return request.apply(this,args);
    if (host !== 'api.stripe.com' || process.env.WALKTHROUGH_STRIPE_MOCK !== '1') return deny(host);
    const scenario = mode('stripe'); const path = opts.path || opts.pathname;
    log({service:'stripe',path,scenario,mocked:true});
    const body = path === '/v1/customers' ? {id:'cus_run_d_fixture'} : {id:'cs_run_d_fixture',url:`${process.env.WALKTHROUGH_BASE_URL}/__walkthrough/billing-return`};
    let timer;
    const req = new Writable({autoDestroy:false,write(_chunk,_encoding,done){done();},final(done){
      timer = setTimeout(()=>{
        if(req.destroyed) return;
        const res = Readable.from([JSON.stringify(scenario === 'error' ? {error:{type:'invalid_request_error',message:'Run D simulated Stripe failure'}} : body)]);
        res.statusCode = scenario === 'error' ? 400 : 200;
        res.headers = {'content-type':'application/json','request-id':'req_run_d_fixture'};
        req.emit('response',res);
      },scenario === 'hang' ? 35_000 : 0); done();
    }});
    // Stripe waits for a connected socket before sending its request body.
    req.setTimeout = () => req;
    req.on('close',()=>clearTimeout(timer));
    process.nextTick(()=>req.emit('socket',{connecting:false}));
    const callback = args.find(a=>typeof a === 'function'); if(callback) req.on('response',callback);
    return req;
  };
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url || input.toString());
  if (localHost(url.hostname)) return originalFetch(input, init);
  return deny(url.hostname);
};
syncBuiltinESMExports();
