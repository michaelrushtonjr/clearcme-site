import { expect, test, type Page } from '@playwright/test';
import { Evidence } from './helpers/evidence';
import { createFreshUser, signIn, localPrisma } from './helpers/fresh-account';

// D-3: the upload summary only counts what the user has confirmed and saved,
// and a certificate left in review when they move on shows up as pending.
async function fixture(page: Page, title: string) {
  const res = await page.request.post('/api/certificates', { data: { title, provider: 'Fictional Provider', creditHours: 2, activityDate: '2026-09-01', creditType: 'AMA_PRA_1' } });
  if (!res.ok()) throw new Error(`Fixture create ${res.status()}: ${await res.text()}`);
  const data = await res.json(); return data.certificate || data;
}
async function mockReviewUpload(page: Page, cert: { id: string }) {
  await page.route('**/api/certificates/upload-token', r => r.fulfill({ status: 503, json: { error: 'use multipart' } }));
  await page.route('**/api/certificates', async r => {
    if (r.request().method() !== 'POST') return r.continue();
    // Mirror a real needs-review extraction: no completion date yet, so a bare Confirm can't validate.
    await (await localPrisma()).certificate.update({ where: { id: cert.id }, data: { extractionStatus: 'NEEDS_REVIEW', activityDate: null } });
    return r.fulfill({ json: { certificate: { ...cert, fileName: 'run-d-fictional.pdf', extractionStatus: 'NEEDS_REVIEW', activityDate: null }, warning: 'Check the extracted details.' } });
  });
}
async function upload(page: Page, phone: boolean) {
  const input = phone ? page.locator('input[type=file][accept="application/pdf,image/jpeg,image/png"]') : page.locator('input[type=file]').last();
  await input.setInputFiles('tests/fixtures/certs/run-d-fictional.pdf');
}

test('upload summary follows confirmation, not extraction', async ({ page }, info) => {
  // The phone uploader (MobileCameraUpload) has its own result card; D-3 is the desktop summary.
  test.skip(info.project.name !== 'desktop');
  const phone = false;
  const e = new Evidence(page, info.project.name); await e.protect(); await createFreshUser(); await signIn(page);
  await page.request.post('/api/licenses', { data: { state: 'NV', licenseType: 'MD', renewalDate: '2027-06-30' } });
  const banner = page.getByText(/Compliance Updated|Pending Your Review/i);
  const tile = (label: string) => page.locator('p', { hasText: new RegExp(`^${label}$`, 'i') }).locator('xpath=following-sibling::p[1]');

  // 1. A needs-review upload shows the review form and NO summary.
  const a = await fixture(page, 'Run D review A');
  await mockReviewUpload(page, a);
  await e.visit('/dashboard/upload', 'd3-before');
  await upload(page, phone); await page.getByText('Review & Confirm').waitFor();
  await e.capture('d3-review-open-no-banner');
  await expect(banner).toHaveCount(0);
  await expect(page.getByText(/credits added|hours added/i)).toHaveCount(0);

  // 2. Moving on without confirming: the summary appears with Needs review = 1 and nothing added.
  await page.getByRole('button', { name: 'Upload another' }).click();
  await expect(page.getByText('Pending Your Review')).toBeVisible();
  await expect(tile('Needs review')).toHaveText('1');
  await expect(tile('Hours added')).toHaveText('0.0');
  await expect(tile('Confirmed')).toHaveText('0');
  await e.capture('d3-deferred-needs-review-1');
  await page.unroute('**/api/certificates'); await page.unroute('**/api/certificates/upload-token');

  // 3. Confirm & Save with invalid fields (no date): the server keeps NEEDS_REVIEW and the card says so.
  const b = await fixture(page, 'Run D review B');
  await mockReviewUpload(page, b);
  await upload(page, phone); await page.getByText('Review & Confirm').waitFor();
  await page.getByRole('button', { name: 'Confirm & Save' }).click();
  await expect(page.getByText(/still needs review/i)).toBeVisible();
  await expect(tile('Confirmed')).toHaveText('0');
  await e.capture('d3-confirm-invalid-stays-review');

  // 4. Confirm & Save with a date: now it counts — Confirmed 1, Hours 2.0, A still pending.
  await page.locator('input[type=date]').last().fill('2026-09-01');
  await page.getByRole('button', { name: 'Confirm & Save' }).click();
  await expect(page.getByText('Confirmed and saved.')).toBeVisible();
  await expect(page.getByText('Compliance Updated')).toBeVisible();
  await expect(tile('Confirmed')).toHaveText('1');
  await expect(tile('Hours added')).toHaveText('2.0');
  await expect(tile('Needs review')).toHaveText('1');
  await e.capture('d3-confirmed-banner');
  const saved = await (await localPrisma()).certificate.findUnique({ where: { id: b.id }, select: { extractionStatus: true } });
  expect(saved?.extractionStatus).toBe('COMPLETED');
  await page.unroute('**/api/certificates'); await page.unroute('**/api/certificates/upload-token');
});
