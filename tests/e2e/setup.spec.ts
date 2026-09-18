import { test, expect } from '@playwright/test';
import { Evidence } from './helpers/evidence';
import { setupToStep4, finishSetup } from './helpers/setup';
import { localPrisma } from './helpers/fresh-account';

test.afterAll(async()=>{await (await localPrisma()).$disconnect();});
for(const [state,degree,specialty] of [['NV','MD',''],['TX','MD',''],['CA','MD',''],['NV','DO',''],['NV','DO','Psychiatry']]) {
 test(`setup ${state} ${degree} ${specialty || 'unset'}`,async({page},info)=>{
  test.skip(info.project.name==='app-shell');
  const e=new Evidence(page,info.project.name);await e.protect();
  await setupToStep4(page,e,state,degree,specialty,true);
  await page.getByRole('button',{name:'No',exact:true}).click();
  await page.reload(); await e.capture(`${state}-${degree}-step4-after-refresh`);
  // Step 4 choice must survive reload; finish also supports a new untouched draft.
  await finishSetup(page,e);
  await e.visit('/dashboard/compliance',`${state}-${degree}-${specialty || 'unset'}-compliance`);
 });
}
test('multi-state free limit and refresh',async({page},info)=>{
 test.skip(info.project.name==='app-shell');
 const e=new Evidence(page,info.project.name);await e.protect();
 await setupToStep4(page,e);
 await page.getByRole('button',{name:'Yes',exact:true}).click();
 for(let i=0;i<4;i++) {
   if(i) await page.getByRole('button',{name:'+ Add another state',exact:true}).click();
   const card=page.locator('div.border').filter({has:page.getByRole('button',{name:'Remove license'})}).filter({has:page.locator('select')}).nth(i);
   // License cards have one select and two degree buttons.
   await card.locator('select').first().selectOption(['TX','CA','AZ','NY'][i]);
   await card.getByRole('button',{name:'MD',exact:true}).click();
   await card.locator('input[type=date]').fill('2027-10-31');
 }
 await e.capture('multi-state-five-license-limit');
 await page.reload(); await e.capture('multi-state-restored-after-refresh');
 await expect(page.getByRole('button',{name:'Remove license'})).toHaveCount(4);
 while(await page.getByRole('button',{name:'Remove license'}).count()>1) await page.getByRole('button',{name:'Remove license'}).last().click();
 await page.locator('select').first().selectOption('CA');
 await page.getByRole('button',{name:'MD',exact:true}).click();
 await page.locator('input[type=date]').fill('2027-10-31');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/licenses')&&r.status()===402);
 await page.getByRole('button',{name:'See my compliance map →'}).click();
 await response; await e.capture('multi-state-free-402');
 await e.visit('/dashboard','dashboard-after-partial-setup');
});

test('named account and browser back',async({page},info)=>{
 test.skip(info.project.name==='app-shell');
 const e=new Evidence(page,info.project.name);await e.protect();
 await setupToStep4(page,e,'NV','MD','',false,'Jordan Lee');
 await page.goBack(); await e.capture('browser-back-from-step4');
 await page.goto('/dashboard/setup'); await e.capture('wizard-return-after-browser-back');
 await finishSetup(page,e);
});
