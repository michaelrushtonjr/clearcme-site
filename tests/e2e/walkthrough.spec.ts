import { test } from '@playwright/test';
import { Evidence } from './helpers/evidence';
const protectedUrls = ['/dashboard','/dashboard/setup','/dashboard/compliance','/dashboard/certificates','/dashboard/certificates/new','/dashboard/upload','/dashboard/profile','/dashboard/settings'];

test('walkthrough', async ({page}, info)=> {
  test.skip(info.project.name==='app-shell','The dedicated shell spec covers logged-in app surfaces');
  const e = new Evidence(page, info.project.name); await e.protect();
  if(info.project.name !== 'app-shell') {
    for(const url of ['/','/pricing','/demo','/demo/compliance','/courses','/courses/opioid-prescribing','/mate-act','/methodology','/support','/privacy','/terms','/login','/login/check-email','/unsubscribe','/unsubscribe?token=invalid','/run-d-missing-page',...protectedUrls]) {
      await e.attempt(`public-${url}`,()=>e.visit(url,`logged-out-${url==='/'?'home':url.slice(1)}`));
    }
    await e.attempt('login-email-unconfigured',async()=>{
      await e.visit('/login','email-before-submit');
      const providers=await page.request.get('/api/auth/providers');
      e.log('local-auth-providers',{status:providers.status(),ids:Object.keys(await providers.json())});
      if(await page.locator('input[type=email]').count()) {
        await page.locator('input[type=email]').fill('walkthrough-d@local.test');
        await page.getByRole('button',{name:'Email me a sign-in link'}).click();
        await page.waitForTimeout(1200); await e.capture('email-unconfigured-after-submit');
      } else e.log('coverage',{flow:'email submit',status:'blocked',reason:'Email form not enabled in local configuration'});
    });
  }
  e.finish();
});
