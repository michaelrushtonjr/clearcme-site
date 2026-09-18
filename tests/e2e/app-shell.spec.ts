import {test,expect} from '@playwright/test';
import {Evidence} from './helpers/evidence';
import {createFreshUser,localPrisma,signIn} from './helpers/fresh-account';
test('iOS app shell surfaces',async({page},info)=>{
 test.skip(info.project.name!=='app-shell');
 const e=new Evidence(page,info.project.name);await e.protect();await createFreshUser();await signIn(page);
 await e.visit('/dashboard/setup','app-setup');
 await page.request.post('/api/licenses',{data:{state:'NV',licenseType:'MD',renewalDate:'2027-06-30'}});
 for(const path of ['/dashboard','/dashboard/setup','/dashboard/compliance','/dashboard/settings','/pricing']) await e.attempt(path,async()=>{
  await e.visit(path,`app-${path.slice(1)}`);
  // Capture bind-address redirect separately, then restore the canonical local origin.
  if(new URL(page.url()).hostname==='0.0.0.0') {await page.goto('/dashboard');await e.capture('app-pricing-canonical-dashboard');}
  await expect(page.locator('html')).toHaveAttribute('data-app-shell','ios');
  for(const item of await page.locator('.app-hide').all()) await expect(item).toBeHidden();
  for(const link of await page.locator('a[href^="/pricing"]').all()) await expect(link).toBeHidden();
  const visible=await page.locator('body').innerText();e.log('app-shell-visible-copy',{path,visible});
  expect(visible).not.toMatch(/\$\s*\d|Upgrade to|Compare plans|Opening checkout/i);
  if(path==='/pricing') expect(page.url()).not.toContain('/pricing');
 });
 const cssProbe=await page.evaluate(()=>Object.fromEntries(['app-hide','app-only'].map(className=>{
  const node=document.createElement('span');node.className=className;node.textContent='Run D CSS probe';document.body.appendChild(node);
  const display=getComputedStyle(node).display;node.remove();return [className,display];
 })));
 e.log('app-shell-css-probe',cssProbe);
 for(const name of ['checkout','portal']) {
  const res=await page.request.post(`/api/stripe/${name}`,{data:{tier:'ESSENTIAL'}});e.log('app-stripe-guard',{name,status:res.status()});expect(res.status()).toBe(403);
 }
 await (await localPrisma()).$disconnect();e.finish();
});
