import { test, expect, type Page } from '@playwright/test';
import { Evidence } from './helpers/evidence';
import { setupToStep4, finishSetup } from './helpers/setup';
import { createFreshUser, localPrisma, signIn, reviewEmail } from './helpers/fresh-account';
const protectedUrls=['/dashboard','/dashboard/setup','/dashboard/compliance','/dashboard/certificates','/dashboard/certificates/new','/dashboard/upload','/dashboard/profile','/dashboard/settings'];
async function manual(page:Page,title:string,hours:string,date='2026-09-01') {
 await page.getByPlaceholder('e.g. Advanced Cardiac Life Support').fill(title);
 await page.getByPlaceholder('e.g. American Heart Association').fill('Fictional Run D Provider');
 await page.locator('input[type=date]').fill(date);
 await page.locator('input[type=number]').fill(hours);
 await page.locator('select').selectOption('AMA_PRA_1');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/certificates')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Save Hours',exact:true}).click();
 return response;
}
test('account lifecycle',async({page},info)=>{
 test.skip(info.project.name==='app-shell');
 const e=new Evidence(page,info.project.name);await e.protect();
 await setupToStep4(page,e); await finishSetup(page,e);
 await e.visit('/dashboard','dashboard-no-name');
 await e.attempt('hours-popover',async()=>{
   const infoButton=page.getByRole('button',{name:/hours|needed|breakdown/i});
   if(await infoButton.count()) {await infoButton.first().click();await e.capture('hours-needed-popover');}
   else e.log('coverage',{flow:'hours popover',status:'not found',buttons:await page.getByRole('button').allTextContents()});
 });
 await e.visit('/dashboard/compliance','compliance-all-rows');
 if(await page.getByRole('button',{name:'Got it',exact:true}).isVisible()) await page.getByRole('button',{name:'Got it',exact:true}).click();
 await e.attempt('attest-unattest',async()=>{
   for(const b of await page.locator('button.rt-row').all()) await b.click();
   const attest=page.getByRole('button',{name:"I've done this",exact:true});
   if(!(await attest.count())) {e.log('coverage',{flow:'attest',status:'no visible eligible row'});return;}
   await attest.first().click(); await page.waitForTimeout(500);await e.capture('compliance-attested');
   await e.visit('/dashboard','dashboard-after-attestation');
   await e.visit('/dashboard/compliance','compliance-attestation-persisted');
   for(const row of await page.locator('button.rt-row').all()) if(await row.getAttribute('aria-expanded')==='false') await row.click();
   await page.getByRole('button',{name:'Clear response',exact:true}).first().click();
   await e.capture('compliance-unattested');
 });
 await e.visit('/dashboard/certificates','certificates-empty');
 await e.visit('/dashboard/certificates/new','manual-empty');
 await expect(page.getByRole('button',{name:'Save Hours',exact:true})).toBeDisabled();
 for(const hours of ['0','-1','1000']) await e.attempt(`hours-${hours}`,async()=>{
   await e.visit('/dashboard/certificates/new',`manual-before-${hours}`);
   const r=await manual(page,`Run D invalid ${hours}`,hours);e.log('manual-response',{hours,status:r.status(),body:await r.text()});
   await e.capture(`manual-rejected-${hours}`);
 });
 await e.attempt('future-date',async()=>{
   await e.visit('/dashboard/certificates/new','manual-before-future');
   const r=await manual(page,'Run D future','2','2099-01-01');e.log('manual-response',{case:'future-date',status:r.status(),body:await r.text()});await e.capture('manual-future-result');
 });
 await e.visit('/dashboard/certificates/new','manual-valid-before');
 const saved=await manual(page,'Run D Fictional CME','2'); expect(saved.ok()).toBeTruthy();
 await e.capture('manual-saved'); await e.visit('/dashboard','dashboard-after-certificate');
 await e.visit('/dashboard/certificates/new','manual-duplicate-before');
 const duplicate=await manual(page,'Run D Fictional CME','2');e.log('duplicate-response',{status:duplicate.status()});await e.capture('manual-duplicate-warning');
 await e.visit('/dashboard/certificates','certificates-after-save');
 await page.getByRole('button',{name:'Delete certificate',exact:true}).first().click();await e.capture('certificate-delete-confirmation');
 await page.getByRole('button',{name:'Yes',exact:true}).click(); await page.waitForTimeout(500);await e.capture('certificate-deleted');
 await e.visit('/dashboard/profile','profile-initial');
 await e.attempt('federal-record',async()=>{
  const f=page.locator('#federal-training');
  await f.locator('select').nth(0).selectOption('yes');
  await f.locator('input[type=date]').nth(0).fill('2026-08-01');
  await f.locator('select').nth(1).selectOption('EIGHT_HOUR_TRAINING');
  await f.locator('input[type=date]').nth(1).fill('2026-07-01');
  await f.locator('textarea').fill('Fictional Run D record');
  await f.locator('input[type=checkbox]').check();
  await f.getByRole('button',{name:'Save federal record'}).click();
  await expect(f.getByRole('status')).toContainText('saved');await e.capture('federal-record-saved');
  await page.reload();await e.capture('federal-record-reloaded');
  await expect(f.locator('textarea')).toHaveValue('Fictional Run D record');
  await e.visit('/dashboard','dashboard-federal-attested');
 });
 await e.visit('/dashboard/settings','settings-initial');
 await e.attempt('settings-name-reminders',async()=>{
  await page.getByPlaceholder('Dr. Jane Smith').fill('Jordan Lee');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(page.getByText('Changes saved',{exact:true})).toBeVisible();
  for(const s of await page.getByRole('switch').all()) await s.click();
  await e.capture('settings-name-reminders-saved');await page.reload();await e.capture('settings-persisted');
  await expect(page.getByPlaceholder('Dr. Jane Smith')).toHaveValue('Jordan Lee');
  await e.visit('/dashboard','dashboard-named-greeting');
 });
 await e.attempt('audit-export',async()=>{
  await e.visit('/dashboard/compliance','compliance-before-export');
  const b=page.getByRole('button',{name:/audit|export record/i}).first();
  await b.click();await page.waitForTimeout(700);await e.capture('audit-export-free-response');
 });
 await e.attempt('sign-out',async()=>{
  await e.visit('/dashboard/settings','settings-before-signout');
  await page.getByRole('button',{name:'Account menu',exact:true}).click();
  await e.capture('account-menu-open');
  await page.getByRole('button',{name:'Sign out',exact:true}).last().click();
  await page.waitForURL(/\/(?:login)?$/);await e.capture('signed-out');
  await signIn(page);await e.capture('signed-back-in');
 });
 // The account is deleted last, after all lifecycle inspections and export.
 await e.visit('/dashboard/settings','settings-before-delete');
 await page.getByRole('button',{name:'Delete my account…',exact:true}).click();await e.capture('delete-account-empty-confirmation');
 await expect(page.getByRole('button',{name:'Permanently delete account'})).toBeDisabled();
 await page.getByLabel('Type DELETE to confirm').fill('DELETE');await e.capture('delete-account-confirmed');
 const deletion=page.waitForResponse(r=>r.url().endsWith('/api/account')&&r.request().method()==='DELETE');
 await page.getByRole('button',{name:'Permanently delete account'}).click();expect((await deletion).status()).toBe(200);
 await page.waitForURL(/\/$/);await e.capture('account-deleted');
 const db=await localPrisma();expect(await db.user.findUnique({where:{email:reviewEmail}})).toBeNull();
 for(const url of protectedUrls) {await e.visit(url,`deleted-protected-${url.slice(11) || 'dashboard'}`);expect(page.url()).toContain('/login');}
 const review=await page.request.post('/api/auth/mobile-email/verify',{data:{email:reviewEmail,code:process.env.REVIEW_DEMO_CODE}});
 e.log('post-deletion-review-login',{status:review.status(),body:await review.text()});
 // Review-login intentionally requires a pre-existing fixture user.
 await createFreshUser();await signIn(page);await e.capture('new-bare-user-after-reset');
 await db.$disconnect();e.finish();
});
