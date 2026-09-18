import {test,expect,type Page} from '@playwright/test';
import {Evidence} from './helpers/evidence';
import {createFreshUser,signIn,localPrisma,reviewEmail} from './helpers/fresh-account';
import {setupToStep4,finishSetup} from './helpers/setup';
async function tabTo(page:Page,selector:string,text?:string) {
 for(let i=0;i<80;i++) {await page.keyboard.press('Tab');if(await page.evaluate(({selector,text})=>!!document.activeElement?.matches(selector)&&(!text||document.activeElement?.textContent?.trim()===text),{selector,text}))return;}
 throw new Error(`Cannot keyboard-focus ${selector} ${text || ''}`);
}
test('keyboard-only wizard and double submit',async({page},info)=>{
 test.skip(info.project.name==='app-shell');const e=new Evidence(page,info.project.name);await e.protect();await createFreshUser();await signIn(page);
 await tabTo(page,'select');await page.keyboard.press('Space');await page.keyboard.type('Nevada');await page.keyboard.press('Enter');
 await expect(page.locator('select')).toHaveValue('NV');await e.capture('keyboard-state-selected');
 await tabTo(page,'button','Continue →');await page.keyboard.press('Enter');
 await tabTo(page,'button','MD');await page.keyboard.press('Enter');await tabTo(page,'button','Continue →');await page.keyboard.press('Enter');
 await tabTo(page,'button','Confirm');await page.keyboard.press('Enter');await e.capture('keyboard-renewal-confirmed');
 await tabTo(page,'button','Continue →');await page.keyboard.press('Enter');
 await tabTo(page,'button','No');await page.keyboard.press('Enter');
 await tabTo(page,'button','See my compliance map →');
 let posts=0;page.on('request',r=>{if(r.url().endsWith('/api/licenses')&&r.method()==='POST')posts++;});
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');await page.waitForTimeout(1300);await e.capture('keyboard-double-submit-result');
 const licenses=await (await localPrisma()).physicianLicense.count({where:{user:{email:reviewEmail}}});
 e.log('double-submit',{posts,licenses});expect(posts).toBe(1);expect(licenses).toBe(1);
 await (await localPrisma()).$disconnect();
});

test('conditional step refresh and failed save UI contract',async({page},info)=>{
 test.skip(info.project.name==='app-shell');const e=new Evidence(page,info.project.name);await e.protect();
 await setupToStep4(page,e);
 // Synthetic presentation-only question; never writes a clinical requirement.
 await page.route('**/api/conditional-requirements',r=>r.request().method()==='GET'?r.fulfill({json:{questions:[{key:'run_d_fixture',question:'Run D fictional practice question?',help:'UI test fixture; not a licensing rule.',requirements:[]}]}}):r.fulfill({status:503,json:{error:'Run D simulated save failure'}}));
 await page.getByRole('button',{name:'No',exact:true}).click();await page.getByRole('button',{name:'See my compliance map →'}).click();
 await expect(page.getByText('Run D fictional practice question?')).toBeVisible();
 await page.getByRole('button',{name:'Yes',exact:true}).click();await e.capture('conditional-step5-answered');
 await page.reload();await e.capture('conditional-step5-refresh');
 await expect(page.getByText('Run D fictional practice question?')).toBeVisible();
 await expect(page.getByRole('button',{name:'Yes',exact:true})).toHaveAttribute('aria-pressed','true');
 const save=page.waitForResponse(r=>r.url().endsWith('/api/conditional-requirements')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'See my compliance map →'}).click();expect((await save).status()).toBe(503);
 await expect(page.getByText("We couldn't save your answers. Please try again.",{exact:false})).toBeVisible();
 await e.capture('conditional-save-failed-result-fixed');
 await page.unroute('**/api/conditional-requirements');
 await page.route('**/api/conditional-requirements',r=>r.fulfill({json:{ok:true}}));
 await page.getByRole('button',{name:'See my compliance map →'}).click();await page.waitForURL(/dashboard\?onboarded=1/);await e.capture('conditional-save-retry-success');
 await (await localPrisma()).$disconnect();
});

test('return destination requested by login',async({page},info)=>{
 test.skip(info.project.name==='app-shell');const e=new Evidence(page,info.project.name);await e.protect();
 await e.visit('/dashboard/certificates/new','callback-protected-request');
 await page.route('**/api/auth/signin/google**',async r=>{e.log('oauth-signin-request',{callbackUrl:new URLSearchParams(r.request().postData() || '').get('callbackUrl')});await r.fulfill({json:{url:'http://localhost:3000/login?run-d=provider-boundary'}});});
 await page.getByRole('button',{name:'Continue with Google'}).click();await page.waitForTimeout(400);await e.capture('callback-provider-request');
});

test('attestation and course link interactions',async({page},info)=>{
 test.skip(info.project.name==='app-shell');const e=new Evidence(page,info.project.name);await e.protect();await setupToStep4(page,e);await finishSetup(page,e);
 await e.visit('/dashboard/compliance','interactive-compliance');
 if(await page.getByRole('button',{name:'Show me my gaps →'}).isVisible()){await page.getByRole('button',{name:'Show me my gaps →'}).click();await e.capture('show-my-gaps-result');}
 for(const b of await page.locator('button.rt-row').all())await b.click();
 await e.capture('compliance-rows-expanded');
 if(await page.getByRole('button',{name:"I've done this",exact:true}).count()) {
  await page.getByRole('button',{name:"I've done this",exact:true}).first().click();await page.waitForTimeout(500);await e.capture('requirement-attested');
  await page.getByRole('button',{name:'Clear response',exact:true}).first().click();await page.waitForTimeout(400);await e.capture('requirement-unattested');
 }
 const links=await page.locator('a[href^="/courses/"]').all();
 if(links.length){const url=await links[0].getAttribute('href');await links[0].click();await page.waitForTimeout(400);await e.capture('compliance-course-destination');e.log('course-link',{url});}
 else e.log('coverage',{flow:'course links',status:'none on expanded map'});
 await (await localPrisma()).$disconnect();
});

test('conditional answer failure can be skipped explicitly',async({page},info)=>{
 test.skip(info.project.name==='app-shell');const e=new Evidence(page,info.project.name);await e.protect();await setupToStep4(page,e);
 await page.route('**/api/conditional-requirements',r=>r.request().method()==='GET'?r.fulfill({json:{questions:[{key:'run_d_fixture',question:'Run D fictional practice question?',help:'UI test fixture; not a licensing rule.',requirements:[]}]}}):r.fulfill({status:503,json:{error:'Run D simulated save failure'}}));
 await page.getByRole('button',{name:'No',exact:true}).click();await page.getByRole('button',{name:'See my compliance map →'}).click();
 await page.getByRole('button',{name:'Yes',exact:true}).click();await page.getByRole('button',{name:'See my compliance map →'}).click();
 await expect(page.getByText("We couldn't save your answers. Please try again.",{exact:false})).toBeVisible();
 await e.capture('conditional-save-error-with-skip');
 await page.getByRole('button',{name:'Continue without saving these answers'}).click();await page.waitForURL(/dashboard\?onboarded=1/);await e.capture('conditional-explicit-skip-dashboard');
 await (await localPrisma()).$disconnect();
});

test('reminder settings retain independent states',async({page},info)=>{
 test.skip(info.project.name==='app-shell');const e=new Evidence(page,info.project.name);await e.protect();await createFreshUser();await signIn(page);
 await page.request.post('/api/licenses',{data:{state:'NV',licenseType:'MD',renewalDate:'2027-06-30'}});
 await e.visit('/dashboard/settings','reminders-before');
 const states:Record<string,string>={};
 for(const name of ['Renewal reminders','Monthly digest']) {
  const control=page.getByRole('switch',{name,exact:true});states[name]=(await control.getAttribute('aria-checked'))==='true'?'false':'true';
  await control.click();await expect(control).toHaveAttribute('aria-checked',states[name]);
 }
 await page.reload();for(const [name,state] of Object.entries(states))await expect(page.getByRole('switch',{name,exact:true})).toHaveAttribute('aria-checked',state);
 e.log('reminder-persistence',{states});await e.capture('reminders-persisted-asserted');await (await localPrisma()).$disconnect();
});
