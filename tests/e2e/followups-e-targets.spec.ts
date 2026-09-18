import { test, expect, type Locator } from '@playwright/test';
import { Evidence } from './helpers/evidence';
import { createFreshUser, signIn, localPrisma } from './helpers/fresh-account';
const before = process.env.WALKTHROUGH_BEFORE === '1';
const phase = before ? 'before' : 'after';
test('E5 phone target boxes and unchanged desktop controls', async ({ page }, info) => {
  const e = new Evidence(page, info.project.name); await e.protect(); await createFreshUser(); await signIn(page);
  await page.request.post('/api/licenses', { data: { state: 'NV', licenseType: 'MD', renewalDate: '2027-06-30' } });
  const measure = async (control: Locator, name: string) => {
    const box = await control.boundingBox(); expect(box).not.toBeNull();
    e.log('tap-target', { phase, name, ...box });
    if (!before && info.project.name === 'phone') { expect(box!.width).toBeGreaterThanOrEqual(40); expect(box!.height).toBeGreaterThanOrEqual(40); }
  };
  await e.visit('/dashboard/settings', `E5-${phase}-settings`);
  await measure(page.getByRole('button', { name: 'Account menu', exact: true }), 'Account menu');
  for (const name of ['Renewal reminders', 'Monthly digest']) await measure(page.getByRole('switch', { name, exact: true }), name);
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  const toggle = page.getByRole('switch', { name: 'Monthly digest', exact: true });
  const checked = await toggle.getAttribute('aria-checked');
  await toggle.click(!before && info.project.name === 'phone' ? { position: { x: 2, y: 2 } } : {});
  await expect(toggle).toHaveAttribute('aria-checked', checked === 'true' ? 'false' : 'true');
  await e.visit('/dashboard/compliance', `E5-${phase}-map`);
  if (await page.getByRole('button', { name: 'Show me my gaps →' }).isVisible()) await page.getByRole('button', { name: 'Show me my gaps →' }).click();
  if (await page.getByRole('button', { name: 'Got it', exact: true }).isVisible()) await page.getByRole('button', { name: 'Got it', exact: true }).click();
  for (const row of await page.locator('button.rt-row').all()) await row.click();
  for (const name of ["I've done this", 'Still need it']) {
    await expect(page.getByRole('button', { name, exact: true }).first()).toBeVisible();
    for (const control of await page.getByRole('button', { name, exact: true }).all()) await measure(control, name);
  }
  await e.capture(`E5-${phase}-attestation`);
  await (await localPrisma()).$disconnect();
});
