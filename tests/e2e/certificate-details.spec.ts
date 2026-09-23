import {test,expect} from '@playwright/test';
import {Evidence} from './helpers/evidence';
import {createFreshUser,signIn,localPrisma} from './helpers/fresh-account';
test('certificate topic suggestions and review recovery',async({page},info)=>{
 test.skip(info.project.name==='app-shell');
 const e=new Evidence(page,info.project.name);await e.protect();await createFreshUser();await signIn(page);
 await page.request.post('/api/licenses',{data:{state:'NV',licenseType:'MD',renewalDate:'2027-06-30'}});
 const r=await page.request.post('/api/certificates',{data:{title:'Run D fictional ethics training',provider:'Fictional Provider',creditHours:2,activityDate:'2026-09-01',creditType:'AMA_PRA_1'}});
 expect(r.status()).toBe(201);const data=await r.json();const cert=data.certificate || data;
 await e.visit('/dashboard/certificates','topic-suggestion-unconfirmed');
 const box=page.getByRole('group',{name:/Looks like it may count toward ethics/});
 await expect(box).toBeVisible();await expect(box.getByLabel('ethics hours')).toHaveValue('0');
 await e.visit('/dashboard/compliance','topic-map-before-confirmation');
 if(await page.getByRole('button',{name:'Got it',exact:true}).isVisible())await page.getByRole('button',{name:'Got it',exact:true}).click();
 await e.visit('/dashboard/certificates','topic-before-confirm');
 await box.getByLabel('ethics hours').fill('2');
 const saved=page.waitForResponse(r=>r.url().endsWith(`/api/certificates/${cert.id}`)&&r.request().method()==='PATCH');
 await box.getByRole('button',{name:'Confirm topic hours'}).click();expect((await saved).status()).toBe(200);
 await page.reload();await e.capture('topic-confirmed-persisted');
 await e.visit('/dashboard/compliance','topic-map-after-confirmation');
 const db=await localPrisma();
 for(const status of ['NEEDS_REVIEW','FAILED'] as const) await e.attempt(`recover-${status}`,async()=>{
  // Only this synthetic certificate's extraction status changes, never requirements.
  await db.certificate.update({where:{id:cert.id},data:{extractionStatus:status}});
  await page.goto('/dashboard'); // A second identical hash URL alone does not reload server data.
  await e.visit(`/dashboard/certificates#cert-${cert.id}`,`recovery-${status}-form`);
  const row=page.locator(`#cert-${cert.id}`);
  const response=page.waitForResponse(r=>r.url().endsWith(`/api/certificates/${cert.id}`)&&r.request().method()==='PATCH');
  await row.getByRole('button',{name:'Save details',exact:true}).click();
  const result=await response;e.log('recovery-response',{status,code:result.status(),body:await result.text()});
  await page.waitForTimeout(500);await e.capture(`recovery-${status}-saved`);
  await page.reload();await e.capture(`recovery-${status}-reloaded`);
  expect((await db.certificate.findUnique({where:{id:cert.id}}))?.extractionStatus).toBe('COMPLETED');
 });
 await db.$disconnect();e.finish();
});

test('compliance report popup and free export surfaces',async({page},info)=>{
 test.skip(info.project.name==='app-shell');
 const e=new Evidence(page,info.project.name);await e.protect();await createFreshUser();await signIn(page);
 const license=await page.request.post('/api/licenses',{data:{state:'NV',licenseType:'MD',renewalDate:'2027-06-30'}});expect(license.ok()).toBeTruthy();
 await e.visit('/dashboard/compliance','exports-compliance');
 if(await page.getByRole('button',{name:'Got it',exact:true}).isVisible())await page.getByRole('button',{name:'Got it',exact:true}).click();
 await page.context().addInitScript(()=>{window.print=()=>{document.documentElement.dataset.printRequested='true';};});
 const pop=page.waitForEvent('popup');await page.getByRole('button',{name:'Compliance report',exact:true}).click();const popup=await pop;
 await popup.waitForLoadState('domcontentloaded');
 const reportEvidence=new Evidence(popup,info.project.name);await reportEvidence.capture('compliance-report-popup');
 await popup.close();
 for(const path of ['/api/audit-export','/api/certificates/export','/api/certificates/cebroker-export']) {
  const res=await page.request.get(path);e.log('free-export-api',{path,status:res.status(),body:await res.text()});expect(res.status()).toBe(402);
 }
 await page.getByRole('button',{name:'Audit ZIP',exact:true}).click();await page.waitForTimeout(600);await e.capture('export-upgrade-feedback');
 await (await localPrisma()).$disconnect();
});
