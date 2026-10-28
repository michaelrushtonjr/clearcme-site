// Local UI check; API responses are mocked and no Google data is submitted.
// Start an isolated local app, then: node tests/e2e/google-ads-measurement.mjs
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

async function main() {
  const baseURL = process.env.CLEARCME_BASE_URL || 'http://127.0.0.1:3047';
  if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('This check runs only on a local app');
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const posted = [], external = [];
      let choice = null;
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== new URL(baseURL).origin) { external.push(url.hostname); return route.abort(); }
        if (url.pathname === '/api/ads/measurement') {
          if (request.method() === 'POST') { const value = request.postDataJSON(); posted.push(value); choice = value.choice; return route.fulfill({ status: 204 }); }
          return route.fulfill({ json: { enabled: true, choice } });
        }
        return route.continue();
      });
      await page.goto(`${baseURL}/?gclid=test_click-123&utm_source=google&email=private%40example.invalid&token=private-token`);
      await page.getByRole('heading', { name: 'Allow ad measurement?' }).waitFor();
      assert.equal(posted.length, 0, 'No click ID is posted before consent');
      await page.getByRole('button', { name: 'Decline', exact: true }).click();
      await page.getByRole('button', { name: 'Ad measurement settings', exact: true }).waitFor();
      assert.deepEqual(posted.shift(), { choice: 'denied' });
      await page.getByRole('button', { name: 'Ad measurement settings', exact: true }).click();
      await page.getByRole('button', { name: 'Allow', exact: true }).click();
      await page.getByRole('button', { name: 'Ad measurement settings', exact: true }).waitFor();
      assert.deepEqual(posted.shift(), { choice: 'granted', click: { kind: 'gclid', value: 'test_click-123' }, page: '/' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'No horizontal overflow');
      await page.goto(`${baseURL}/login?token=private-token`);
      await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
      assert.equal(await page.getByRole('complementary', { name: 'Advertising measurement' }).count(), 0, 'Consent UI does not appear on login');
      assert.equal(posted.length, 0, 'Private navigation emits no advertising payload');
      assert.equal(external.some(host => /google|doubleclick/.test(host)), false, 'No browser requests to Google advertising services');
      await context.close();
    }
    for (const signal of ['doNotTrack', 'globalPrivacyControl']) {
      const context = await browser.newContext();
      await context.addInitScript(name => Object.defineProperty(navigator, name, { get: () => name === 'doNotTrack' ? '1' : true }), signal);
      const page = await context.newPage(), posts = [];
      await context.route('**/api/ads/measurement', async route => { posts.push(route.request().postDataJSON()); return route.fulfill({ status: 204 }); });
      const denied = page.waitForResponse(response => response.url().endsWith('/api/ads/measurement'));
      await page.goto(`${baseURL}/?gclid=test_click-123`);
      await page.waitForFunction(() => document.readyState === 'complete');
      await denied;
      assert.deepEqual(posts, [{ choice: 'denied' }]);
      assert.equal(await page.getByRole('complementary', { name: 'Advertising measurement' }).count(), 0);
      await context.close();
    }
    console.log('PASS: desktop/mobile consent, no capture before opt-in, decline/allow, bounded payload, private routes, DNT/GPC and no Google browser tags');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
