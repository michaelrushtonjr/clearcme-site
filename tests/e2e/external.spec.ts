import { test, type Page, type Route } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { Evidence, root } from './helpers/evidence';
import { createFreshUser, signIn, localPrisma } from './helpers/fresh-account';
const modes=['success','error','hang'] as const;
const selected=process.env.WALKTHROUGH_SERVICES?.split(',');
const includes=(name:string)=>!selected || selected.includes(name);
async function uploadInput(page:Page,phone:boolean,file:string|{name:string,mimeType:string,buffer:Buffer}) {
 const input=phone ? page.locator('input[type=file][accept="application/pdf,image/jpeg,image/png"]') : page.locator('input[type=file]').last();
 await input.setInputFiles(file);
}
async function fixture(page:Page) {
 const res=await page.request.post('/api/certificates',{data:{title:'Run D extracted fixture',provider:'Fictional Provider',creditHours:2,activityDate:'2026-09-01',creditType:'AMA_PRA_1'}});
 if(!res.ok()) throw new Error(`Fixture create ${res.status()}: ${await res.text()}`);
 const data=await res.json();return data.certificate || data;
}
test('external boundary matrix',async({page},info)=>{
 test.skip(info.project.name==='app-shell');
 const e=new Evidence(page,info.project.name);await e.protect();const user=await createFreshUser();await signIn(page);
 // License through the real API; no compliance-rule fixture mutation.
 await page.request.post('/api/licenses',{data:{state:'NV',licenseType:'MD',renewalDate:'2027-06-30'}});
 await page.route('**/__walkthrough/billing-return',r=>r.fulfill({contentType:'text/html',body:'<h1>Run D mock billing destination</h1><p>No provider was contacted.</p>'}));
 for(const flow of (includes('stripe') ? ['checkout','portal'] : [])) for(const mode of modes) await e.attempt(`stripe-${flow}-${mode}`,async()=>{
  writeFileSync(`${root}/mock-modes.json`,JSON.stringify({stripe:mode}));
  await e.visit('/dashboard/settings',`stripe-${flow}-${mode}-before`);
  const response=page.waitForResponse(r=>r.url().endsWith(`/api/stripe/${flow}`),{timeout:45000});
  const button=page.getByRole('button',{name:flow==='checkout'?'Upgrade to Essential':'Manage',exact:true});
  await button.click();
  if(mode==='hang') {await page.waitForTimeout(30_000);await e.capture(`stripe-${flow}-hang-30-seconds`);}
  const r=await response;e.log('external-matrix-response',{service:'stripe',flow,mode,status:r.status(),body:await r.text().catch(()=>'Response navigated to the mock destination')});
  await page.waitForTimeout(800);await e.capture(`stripe-${flow}-${mode}-result`);
 });
 writeFileSync(`${root}/mock-modes.json`,'{}');
 const cert=await fixture(page);
 // Extraction UI contract is isolated at its same-origin endpoint; metadata was
 // created via the real API, so the needs-review deep link has a real row.
 for(const mode of (includes('extraction') ? [...modes,'review','failed'] as const : [])) await e.attempt(`extraction-${mode}`,async()=>{
  await page.route('**/api/certificates/upload-token',r=>r.fulfill({status:503,json:{error:'Run D: direct storage unavailable; use multipart fallback'}}));
  const handler=async(r:Route)=>{
   if(r.request().method()!=='POST')return r.continue();
   e.log('external-matrix-call',{service:'extraction',mode});
   if(mode==='hang') await new Promise(resolve=>setTimeout(resolve,35_000));
   if(mode==='error') return r.fulfill({status:502,json:{error:'Run D simulated extraction failure. Try again.'}});
   if(mode==='review') await (await localPrisma()).certificate.update({where:{id:cert.id},data:{extractionStatus:'NEEDS_REVIEW'}});
   return r.fulfill({json:{certificate:{...cert,fileName:'run-d-fictional.pdf',extractionStatus:mode==='review'?'NEEDS_REVIEW':mode==='failed'?'FAILED':'COMPLETED'},warning:mode==='review'?'Check the extracted details.':undefined}});
  };
  await page.route('**/api/certificates',handler);
  await e.visit('/dashboard/upload',`extraction-${mode}-before`);
  await uploadInput(page,info.project.name==='phone','tests/fixtures/certs/run-d-fictional.pdf');
  if(mode==='hang') {await page.waitForTimeout(30_000);await e.capture('extraction-hang-30-seconds');await page.waitForTimeout(6500);}
  else await page.waitForTimeout(1400);
  await e.capture(`extraction-${mode}-result`);
  if(mode==='review') await e.visit(`/dashboard/certificates#cert-${cert.id}`,'needs-review-real-row');
  await page.unroute('**/api/certificates',handler);await page.unroute('**/api/certificates/upload-token');
 });
 // Direct Blob boundary: fabricated client token, every provider request fulfilled.
 for(const mode of (includes('blob') ? modes : [])) await e.attempt(`blob-${mode}`,async()=>{
  const tokenHandler=async(r:Route)=>{
   const pathname=r.request().postDataJSON().payload.pathname;
   const payload={pathname,validUntil:Date.now()+60000,maximumSizeInBytes:11_000_000,allowedContentTypes:['application/pdf','image/jpeg','image/png'],addRandomSuffix:false};
   const encoded=Buffer.from(`signature.${Buffer.from(JSON.stringify(payload)).toString('base64')}`).toString('base64');
   await r.fulfill({json:{type:'blob.generate-client-token',clientToken:`vercel_blob_client_rundstore_${encoded}`}});
  };
  await page.route('**/api/certificates/upload-token',tokenHandler);
  const blobHandler=async(r:Route)=>{
    const url=new URL(r.request().url());
    if(!(url.hostname==='vercel.com' && url.pathname==='/api/blob/') && !url.hostname.endsWith('.blob.vercel-storage.com')) return r.abort('blockedbyclient');
    e.log('external-matrix-call',{service:'blob',mode,method:r.request().method()});
    const preflight=r.request().method()==='OPTIONS';
    if(mode==='hang' && !preflight) await new Promise(resolve=>setTimeout(resolve,35_000));
    await r.fulfill({status:mode==='error' && !preflight?400:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':r.request().headers()['access-control-request-headers'] || '*','access-control-allow-methods':'PUT, POST, GET, OPTIONS'},json:mode==='error'?{error:{code:'forbidden',message:'Run D simulated storage failure'}}:{url:'https://rundstore.private.blob.vercel-storage.com/certificates/run-d.pdf',downloadUrl:'https://rundstore.private.blob.vercel-storage.com/certificates/run-d.pdf',pathname:'certificates/run-d.pdf',contentType:'image/jpeg',contentDisposition:'attachment',etag:'fixture'}});
  };
  await page.route('https://**/*',blobHandler);
  await page.route('**/api/certificates',r=>{
    if(r.request().method()!=='POST') return r.continue();
    e.log('external-matrix-call',{service:'blob-finalize',mode,contentType:r.request().headers()['content-type']});
    return r.fulfill({json:{certificate:{...cert,fileName:'run-d-fictional.jpg',extractionStatus:'COMPLETED'}}});
  });
  await e.visit('/dashboard/upload',`blob-${mode}-before`);
  await uploadInput(page,info.project.name==='phone','tests/fixtures/certs/run-d-fictional.jpg');
  if(mode==='hang'){await page.waitForTimeout(30_000);await e.capture('blob-hang-30-seconds');await page.waitForTimeout(6500);}else await page.waitForTimeout(1800);
  await e.capture(`blob-${mode}-result`);
  await page.unroute('**/api/certificates');await page.unroute('https://**/*',blobHandler);await page.unroute('**/api/certificates/upload-token',tokenHandler);
 });
 for(const kind of (includes('files') ? ['oversized','wrong-mime'] : [])) await e.attempt(`upload-${kind}`,async()=>{
  await e.visit('/dashboard/upload',`${kind}-before`);
  await page.route('**/api/certificates/upload-token',r=>r.fulfill({status:400,json:{error:'Unsupported file type'}}));
  await page.route('**/api/certificates',r=>r.request().method()==='POST'?r.fulfill({status:400,json:{error:'Unsupported file type'}}):r.continue());
  await uploadInput(page,info.project.name==='phone',kind==='oversized'?{name:'oversized.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(11*1024*1024)}:{name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('not a certificate')});
  await page.waitForTimeout(700);await e.capture(`upload-${kind}-result`);
  await page.unroute('**/api/certificates');await page.unroute('**/api/certificates/upload-token');
 });
 // Actual review-account Stripe customer is synthetic; no live subscription exists.
 await (await localPrisma()).subscription.deleteMany({where:{userId:user.id}});
 await page.context().clearCookies();
 for(const mode of (includes('email') ? modes : [])) await e.attempt(`email-${mode}`,async()=>{
  await page.route('**/api/auth/providers',r=>r.fulfill({json:{resend:{id:'resend',name:'Resend',type:'email',signinUrl:'http://localhost:3000/api/auth/signin/resend',callbackUrl:'http://localhost:3000/api/auth/callback/resend'}}}));
  await page.route('**/api/auth/signin/resend**',async r=>{
   e.log('external-matrix-call',{service:'resend-ui-contract',mode});
   if(mode==='hang')await new Promise(resolve=>setTimeout(resolve,35_000));
   await r.fulfill({status:mode==='error'?503:200,json:mode==='error'?{url:'http://localhost:3000/login?error=Configuration'}:{url:'http://localhost:3000/login/check-email'}});
  });
  await e.visit('/login',`email-${mode}-before`);await page.locator('input[type=email]').fill('walkthrough-d@local.test');
  await page.getByRole('button',{name:'Email me a sign-in link'}).click();
  if(mode==='hang'){await page.waitForTimeout(30_000);await e.capture('email-hang-30-seconds');await page.waitForTimeout(6500);}else await page.waitForTimeout(1000);
  await e.capture(`email-${mode}-result`);await page.unroute('**/api/auth/providers');await page.unroute('**/api/auth/signin/resend**');
 });
 await (await localPrisma()).$disconnect();e.finish();
});
