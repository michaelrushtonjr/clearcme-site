import { appendFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
export const root = 'codex-review/walkthrough-D';
export class Evidence {
  private seq: number;
  private failures: string[] = [];
  private dir: string;
  constructor(readonly page: Page, readonly viewport: string) {
    this.dir = `${root}/${viewport}`;
    mkdirSync(this.dir, {recursive:true});
    this.seq = Math.max(0,...readdirSync(this.dir).filter(n=>n.endsWith('.jpg')).map(n=>Number(n.split('-')[0]) || 0));
    page.on('console', m=> { if(['error','warning'].includes(m.type())) this.log('console', {level:m.type(), text:this.safeUrl(m.text())}); });
    page.on('request', r=>{if(r.method()!=='GET' && !r.url().includes('/api/auth/')) this.log('mutation-request',{method:r.method(),url:this.safeUrl(r.url())});});
    page.on('pageerror', e=>this.log('pageerror', {text:e.message}));
    page.on('response', r=> { if(r.status()>=400) this.log('response', {url:this.safeUrl(r.url()), status:r.status(), method:r.request().method()}); });
    page.on('requestfailed', r=>this.log('requestfailed', {url:this.safeUrl(r.url()), error:r.failure()?.errorText}));
  }
  private safeUrl(url: string) { return url.replace(/([?&](?:code|token)=)[^&]+/g,'$1[redacted]'); }
  log(type: string, data: object) { appendFileSync(`${root}/log-${this.viewport}.jsonl`, JSON.stringify({time:new Date().toISOString(), type, page:this.safeUrl(this.page.url()), ...data})+'\n'); }
  async protect() {
    await this.page.context().route('**/*', async route=> {
      const url = new URL(route.request().url());
      if (url.hostname === '0.0.0.0' && url.port === new URL(process.env.WALKTHROUGH_BASE_URL || 'http://localhost:3000').port) {
        url.hostname='localhost'; this.log('local-dev-origin-normalized',{target:this.safeUrl(url.toString())});
        return route.fulfill({status:307,headers:{location:url.toString()},body:''});
      }
      if (['localhost','127.0.0.1','[::1]'].includes(url.hostname)) return route.continue();
      this.log('external-blocked', {url:this.safeUrl(url.toString())});
      return route.abort('blockedbyclient');
    });
  }
  async capture(slug: string) {
    await this.page.waitForTimeout(250);
    this.seq = Math.max(this.seq,...readdirSync(this.dir).filter(n=>n.endsWith('.jpg')).map(n=>Number(n.split('-')[0]) || 0));
    const name = `${String(++this.seq).padStart(3,'0')}-${slug.replace(/[^a-z0-9-]/gi,'-')}`;
    let bytes: Buffer = Buffer.alloc(0);
    for (const quality of [65,45,30,18,10,5,1]) {
      bytes = await this.page.screenshot({type:'jpeg', quality, scale:'css', fullPage:true, animations:'disabled'});
      if(bytes.length<=200_000) break;
    }
    if (bytes.length>200_000) throw new Error(`Screenshot exceeds 200 KB: ${name}`);
    const screenshot = `${this.dir}/${name}.jpg`; writeFileSync(screenshot, bytes);
    const readState = () => this.page.evaluate(()=>({
      text:document.body.innerText,
      width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      controls:[...document.querySelectorAll('button,a,input,select,textarea')].filter(e=>(e as HTMLElement).offsetWidth>0).map(e=>({tag:e.tagName,text:(e.textContent||'').trim().slice(0,100),aria:e.getAttribute('aria-label'),pressed:e.getAttribute('aria-pressed'),checked:(e as HTMLInputElement).checked,disabled:(e as HTMLInputElement).disabled,labels:Array.from((e as HTMLInputElement).labels || []).map(l=>l.textContent?.trim()),type:e.getAttribute('type'),href:e.getAttribute('href'),value:(e as HTMLInputElement).value,height:Math.round(e.getBoundingClientRect().height),width:Math.round(e.getBoundingClientRect().width)})),
      appShell:document.documentElement.dataset.appShell,
      appHide:[...document.querySelectorAll('.app-hide')].map(e=>({text:(e.textContent||'').trim().slice(0,100),display:getComputedStyle(e).display})),
      appOnly:[...document.querySelectorAll('.app-only')].map(e=>({text:(e.textContent||'').trim().slice(0,100),display:getComputedStyle(e).display}))
    }));
    const state = await readState().catch(async error => {
      if (!String(error).includes("Execution context was destroyed")) throw error;
      this.log("capture-navigation-race", {screenshot});
      await this.page.waitForLoadState("domcontentloaded");
      return readState();
    });
    writeFileSync(`${this.dir}/${name}.json`,JSON.stringify(state,null,2));
    this.log('visit', {slug, screenshot, bytes:bytes.length, url:this.safeUrl(this.page.url()), overflow:state.scrollWidth>state.width});
    console.log(`${this.viewport}: ${slug} -> ${this.safeUrl(this.page.url())}`);
    return state;
  }
  async visit(url: string, slug: string) { await this.page.goto(url); await this.page.waitForLoadState('networkidle'); return this.capture(slug); }
  finish() { if (this.failures.length) throw new Error(this.failures.join("\n")); }
  async attempt(name: string, action:()=>Promise<unknown>) {
    try { await action(); } catch(e) { this.failures.push(`${name}: ${String(e)}`); this.log('harness-step-error', {name,error:String(e)}); await this.capture(`blocked-${name}`).catch(()=>{}); console.log(`STEP ERROR ${name}: ${String(e).slice(0,250)}`); }
  }
}
