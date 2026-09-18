import { test, expect } from '@playwright/test';
import { Evidence } from './helpers/evidence';
import { setupToStep4 } from './helpers/setup';
import { localPrisma } from './helpers/fresh-account';
const before = process.env.WALKTHROUGH_BEFORE === '1';
const phase = before ? 'before' : 'after';
const question = { key: 'run_e_fixture', question: 'Run E fictional practice question?', help: 'Presentation fixture; not a licensing rule.', requirements: [] };
test('E6 step five resumes answers without resubmitting licenses and D1 retry works', async ({ page }, info) => {
  const e = new Evidence(page, info.project.name); await e.protect();
  await setupToStep4(page, e, 'NV', 'MD', '', true);
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Step 4 of 4', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'See my compliance map →' })).toBeEnabled();
  await e.capture(`E6-${phase}-D4-step4-restored`);
  let licensePosts = 0, gets = 0, saveFails = true, getFails = false;
  let questions = [question];
  const postedAnswers: unknown[] = [];
  page.on('request', r => { if (r.url().endsWith('/api/licenses') && r.method() === 'POST') licensePosts++; });
  await page.route('**/api/conditional-requirements', r => {
    if (r.request().method() === 'GET') { gets++; return r.fulfill({ status: getFails ? 503 : 200, json: getFails ? { error: 'Simulated restore outage' } : { questions } }); }
    postedAnswers.push(r.request().postDataJSON());
    return r.fulfill({ status: saveFails ? 503 : 200, json: saveFails ? { error: 'Run E simulated save failure' } : { ok: true } });
  });
  await page.getByRole('button', { name: 'See my compliance map →' }).click();
  await expect(page.getByText(question.question, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await e.capture(`E6-${phase}-answered`);
  if (!before) getFails = true;
  await page.reload();
  if (before) {
    await expect(page.getByText('Step 4 of 4', { exact: true })).toBeVisible();
    await e.capture('E6-before-refresh-loses-step5');
  } else {
    await expect(page.getByText("We couldn't load your practice questions. Reload to try again.")).toBeVisible();
    expect(licensePosts).toBe(1);
    const parked = await page.evaluate(() => {
      const key = Object.keys(sessionStorage).find(key => key.startsWith('clearcme-setup-wizard:'))!;
      return JSON.parse(sessionStorage.getItem(key)!);
    });
    expect(parked.licensesSubmitted).toBe(true);
    expect(parked.conditionalAnswers).toEqual({ run_e_fixture: 'yes' });
    await e.capture('E6-after-restore-outage-keeps-draft');
    getFails = false;
    await page.getByRole('button', { name: 'Reload questions', exact: true }).click();
    await expect(page.getByText(question.question, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '← Back', exact: true })).toHaveCount(0);
    expect(licensePosts).toBe(1); expect(gets).toBeGreaterThanOrEqual(2);
    await e.capture('E6-after-refresh-restores-answer');
    await page.getByRole('button', { name: 'See my compliance map →' }).click();
    await expect(page.getByText("We couldn't save your answers. Please try again.", { exact: false })).toBeVisible();
    await e.capture('E6-after-D1-save-failure');
    saveFails = false;
    await page.getByRole('button', { name: 'See my compliance map →' }).click();
    await page.waitForURL(/dashboard\?onboarded=1/);
    expect(postedAnswers).toEqual([{ answers: { run_e_fixture: 'yes' } }, { answers: { run_e_fixture: 'yes' } }]);
    expect(licensePosts).toBe(1);
    await e.capture('E6-after-D1-retry-dashboard');
    // A separate restored submitted draft whose questions no longer apply.
    await page.evaluate(() => {
      const key = Object.keys(sessionStorage).find(key => key.startsWith('clearcme-setup-wizard:'));
      if (key) throw new Error('Finished setup should clear its draft');
    });
    const user = await (await localPrisma()).user.findUniqueOrThrow({ where: { email: process.env.REVIEW_DEMO_EMAIL || 'walkthrough-d@local.test' } });
    await page.evaluate(id => sessionStorage.setItem(`clearcme-setup-wizard:${id}`, JSON.stringify({ step: 5, licensesSubmitted: true, conditionalAnswers: { run_e_fixture: 'yes' } })), user.id);
    questions = [];
    await page.goto('/dashboard/setup'); await page.waitForURL(/dashboard\?onboarded=1/);
    expect(licensePosts).toBe(1);
    await e.capture('E6-after-no-questions-dashboard');
  }
  e.log('wizard-license-requests', { phase, licensePosts, gets, postedAnswers });
  await (await localPrisma()).$disconnect();
});
