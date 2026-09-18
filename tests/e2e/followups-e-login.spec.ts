import { test, expect } from '@playwright/test';
import { Evidence } from './helpers/evidence';
const before = process.env.WALKTHROUGH_BEFORE === '1';
const phase = before ? 'before' : 'after';
test('E1 provider availability and auth errors', async ({ page }, info) => {
  const e = new Evidence(page, info.project.name); await e.protect();
  await e.visit('/login', `E1-${phase}-unconfigured`);
  if (!before) {
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0);
    await expect(page.getByText("Email sign-in isn't available right now — use Google or Apple.")).toBeVisible();
  }
  await e.visit('/login?error=Configuration', `E1-${phase}-configuration`);
  await expect(page.locator('.error-note')).toContainText('misconfigured on our end');
  await page.route('**/api/auth/providers', r => r.fulfill({ json: {
    google: { id: 'google', type: 'oauth', name: 'Google' },
    apple: { id: 'apple', type: 'oauth', name: 'Apple' },
    resend: { id: 'resend', type: 'email', name: 'Resend' },
  } }));
  await e.visit('/login', `E1-${phase}-configured-mock`);
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});
test('E2 preserves the protected destination at provider boundaries', async ({ page }, info) => {
  const e = new Evidence(page, info.project.name); await e.protect();
  await e.visit('/dashboard/certificates/new', `E2-${phase}-protected`);
  let callback: string | null = null;
  await page.route('**/api/auth/signin/google**', async r => {
    callback = new URLSearchParams(r.request().postData() || '').get('callbackUrl');
    e.log('oauth-signin-request', { phase, provider: 'google', callbackUrl: callback });
    await r.fulfill({ json: { url: `${new URL(page.url()).origin}/login?provider-boundary=1` } });
  });
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect.poll(() => callback).toBe(before ? '/dashboard' : '/dashboard/certificates/new');
  await page.waitForURL(/provider-boundary/);
  await e.capture(`E2-${phase}-provider-request`);
});
test('E2 Apple and email share callback validation', async ({ page }, info) => {
  test.skip(before);
  const e = new Evidence(page, info.project.name); await e.protect();
  await page.route('**/api/auth/providers', r => r.fulfill({ json: {
    google: { id: 'google', type: 'oauth', name: 'Google' },
    apple: { id: 'apple', type: 'oauth', name: 'Apple' },
    resend: { id: 'resend', type: 'email', name: 'Resend' },
  } }));
  for (const [provider, requested, expected] of [
    ['apple', '/dashboard/certificates/new', '/dashboard/certificates/new'],
    ['resend', '/dashboard?x=1', '/dashboard?x=1'],
    ['google', '//evil.example', '/dashboard'],
  ]) {
    let callback: string | null = null;
    await page.route(`**/api/auth/signin/${provider}**`, async r => {
      callback = new URLSearchParams(r.request().postData() || '').get('callbackUrl');
      e.log('oauth-signin-request', { phase, provider, callbackUrl: callback });
      await r.fulfill({ json: { url: `${new URL(page.url()).origin}/login?provider-boundary=${provider}` } });
    });
    await page.goto(`/login?callbackUrl=${encodeURIComponent(requested)}`);
    if (provider === 'resend') {
      await page.getByLabel('Email', { exact: true }).fill('fixture@local.test');
      await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    } else await page.getByRole('button', { name: `Continue with ${provider === 'apple' ? 'Apple' : 'Google'}` }).click();
    await expect.poll(() => callback).toBe(expected);
    await page.waitForURL(/provider-boundary/);
    await e.capture(`E2-${phase}-${provider}-callback`);
  }
});
