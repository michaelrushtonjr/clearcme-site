import { expect, type Page } from '@playwright/test';
import { createFreshUser, signIn } from './fresh-account';
import { Evidence } from './evidence';
export async function setupToStep4(page: Page, e: Evidence, state='NV', degree='MD', specialty='', refresh=false, name?:string) {
  await createFreshUser(name ? {name} : {});
  await page.context().clearCookies();
  await signIn(page); await e.capture(`${state}-${degree}-first-signin`);
  await expect(page).toHaveURL(/dashboard\/setup/);
  await page.locator('select').selectOption(state);
  if(refresh) { await page.reload(); await expect(page.locator('select')).toHaveValue(state); await e.capture('step1-restored'); }
  await page.getByRole('button',{name:'Continue →',exact:true}).click();
  await page.getByRole('button',{name:degree,exact:true}).click();
  if(specialty) await page.locator('select').nth(0).selectOption(specialty);
  if(refresh) { await page.reload(); await e.capture('step2-restored'); }
  await e.capture(`${state}-${degree}-step2`);
  await page.getByRole('button',{name:'Continue →',exact:true}).click();
  await e.capture(`${state}-${degree}-step3-landing`);
  if(state==='TX' && await page.locator('select').count()) {
    await page.locator('select').selectOption('1'); const january=await page.locator('input[type=date]').inputValue();
    await page.locator('select').selectOption('8');
    expect(await page.locator('input[type=date]').inputValue()).not.toBe(january);
    await e.capture('TX-birth-month-updated');
  }
  if(state==='CA' || (state==='TX' && !(await page.locator('select').count()))) {
    if(state==='TX') e.log('fact-question',{state,shown:'Variable TMB-assigned expiration; no birth month select',briefExpected:'birth-month based'});
    await expect(page.getByRole('button',{name:/I'm not sure/})).toBeDisabled();
    await expect(page.locator('input[type=date]')).toHaveValue('');
    await page.locator('input[type=date]').fill('2027-09-30');
  } else {
    const confirm=page.getByRole('button',{name:'Confirm',exact:true});
    const unsure=page.getByRole('button',{name:/I'm not sure/});
    await confirm.click(); await expect(confirm).toHaveAttribute('aria-pressed','true'); await expect(unsure).toHaveAttribute('aria-pressed','false');
    await e.capture(`${state}-${degree}-confirmed`);
    await page.getByRole('button',{name:'Edit',exact:true}).click();
    await expect(page.locator('input[type=date]')).toBeEnabled();
    await unsure.click(); await expect(confirm).toHaveAttribute('aria-pressed','false');
    await e.capture(`${state}-${degree}-estimate`);
    await unsure.click(); await expect(page.locator('input[type=date]')).toBeEnabled();
    await page.locator('input[type=date]').fill('2027-10-31');
    await e.capture(`${state}-${degree}-manual`);
    if(state==='NV' && degree==='MD') {
      await page.getByRole('button',{name:'← Back',exact:true}).click();
      await page.getByRole('button',{name:'← Back',exact:true}).click();
      await page.locator('select').selectOption('CA');
      await page.locator('select').selectOption('NV');
      await page.getByRole('button',{name:'Continue →',exact:true}).click();
      await page.getByRole('button',{name:'Continue →',exact:true}).click();
      await e.capture('NV-changed-state-returned');
      await expect(confirm).toHaveAttribute('aria-pressed','false');
    }
  }
  if(refresh) { await page.reload(); await e.capture('step3-restored'); }
  await page.getByRole('button',{name:'Continue →',exact:true}).click();
  await e.capture(`${state}-${degree}-step4`);
}
export async function finishSetup(page: Page, e: Evidence, refreshConditional=false) {
  if(await page.getByRole('button',{name:'No',exact:true}).isVisible()) await page.getByRole('button',{name:'No',exact:true}).click();
  await page.getByRole('button',{name:'See my compliance map →',exact:true}).click();
  await page.waitForLoadState('networkidle');
  if(await page.getByRole('heading',{name:'A few questions about your practice'}).isVisible()) {
    await e.capture('step5-conditional-questions');
    const no=page.getByRole('button',{name:'No',exact:true});
    for(const b of await no.all()) await b.click();
    await e.capture('step5-answered');
    if(refreshConditional) { await page.reload(); await e.capture('step5-after-refresh'); return; }
    await page.getByRole('button',{name:'See my compliance map →',exact:true}).click();
  }
  await page.waitForURL(/\/dashboard(?:\?onboarded=1)?$/);
  await e.capture('dashboard-onboarded');
}
