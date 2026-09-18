import { test, expect, type Page } from '@playwright/test';
import { Evidence } from './helpers/evidence';
import { createFreshUser, signIn, localPrisma } from './helpers/fresh-account';
const before = process.env.WALKTHROUGH_BEFORE === '1';
const phase = before ? 'before' : 'after';
async function associations(page: Page, e: Evidence, expected: number) {
  const labels = await page.locator('label.product-label:visible').evaluateAll(labels => labels.map(label => {
    const control = (label as HTMLLabelElement).control;
    return { text: label.textContent, target: (label as HTMLLabelElement).htmlFor, id: control?.id, count: control ? document.querySelectorAll(`[id="${CSS.escape(control.id)}"]`).length : 0 };
  }));
  e.log('label-associations', { phase, labels });
  expect(labels).toHaveLength(expected);
  if (!before) {
    expect(new Set(labels.map(l => l.target)).size).toBe(expected);
    for (const label of labels) { expect(label.target).toBeTruthy(); expect(label.id).toBe(label.target); expect(label.count).toBe(1); }
  }
}
test('E4 multiple certificate recovery rows have unique label targets', async ({ page }, info) => {
  const e = new Evidence(page, info.project.name); await e.protect(); await createFreshUser(); await signIn(page);
  await page.request.post('/api/licenses', { data: { state: 'NV', licenseType: 'MD', renewalDate: '2027-06-30' } });
  for (const title of ['Run E recovery A', 'Run E recovery B']) {
    expect((await page.request.post('/api/certificates', { data: { title, provider: 'Fictional Provider', creditHours: 2, activityDate: '2099-01-01', creditType: 'AMA_PRA_1' } })).status()).toBe(201);
  }
  await page.goto('/dashboard/certificates');
  await expect(page.getByRole('button', { name: 'Review details →', exact: true })).toHaveCount(2);
  while (await page.getByRole('button', { name: 'Review details →', exact: true }).count()) await page.getByRole('button', { name: 'Review details →', exact: true }).first().click();
  await associations(page, e, 10);
  await e.capture(`E4-${phase}-two-recovery-rows`);
  await (await localPrisma()).$disconnect();
});
test('E4 upload recovery and Fix something cards name all fields', async ({ page }, info) => {
  const e = new Evidence(page, info.project.name); await e.protect(); await createFreshUser(); await signIn(page);
  await page.request.post('/api/licenses', { data: { state: 'NV', licenseType: 'MD', renewalDate: '2027-06-30' } });
  if (info.project.name === 'phone') {
    await e.visit('/dashboard/upload', `E4-${phase}-phone-camera-uploader`);
    e.log('coverage', { item: 'E4', note: 'The three desktop recovery cards are hidden below sm; phone recovery labels are verified in the certificate list.' });
    await (await localPrisma()).$disconnect(); return;
  }
  await page.route('**/api/certificates/upload-token', r => r.fulfill({ status: 503, json: { error: 'Use mocked multipart boundary' } }));
  for (const status of ['NEEDS_REVIEW', 'FAILED', 'COMPLETED']) {
    let index = 0;
    await page.route('**/api/certificates', r => r.fulfill({ status: 201, json: { certificate: {
      id: `run-e-${status}-${++index}`, fileName: `fictional-${index}.pdf`, title: `Run E fixture ${index}`, provider: 'Fictional Provider', creditHours: 2, creditType: 'AMA_PRA_1', activityDate: '2026-09-01', extractionStatus: status,
    } } }));
    await page.goto('/dashboard/upload');
    await page.locator('input[type=file]').last().setInputFiles([1, 2].map(n => ({ name: `fictional-${n}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4 fictional boundary fixture ${n}`) })));
    if (status === 'COMPLETED') {
      await expect(page.getByRole('button', { name: 'Fix something', exact: true })).toHaveCount(2);
      while (await page.getByRole('button', { name: 'Fix something', exact: true }).count()) await page.getByRole('button', { name: 'Fix something', exact: true }).first().click();
    } else await expect(page.getByText(status === 'NEEDS_REVIEW' ? 'Review & Confirm' : "Couldn\'t read this certificate automatically", { exact: true })).toHaveCount(2);
    await associations(page, e, 8);
    await e.capture(`E4-${phase}-two-${status}-cards`);
    await page.unroute('**/api/certificates');
  }
  await (await localPrisma()).$disconnect();
});
