import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';
createRequire(`${process.cwd()}/tests/e2e/helpers/fresh-account.ts`)('./local-env.cjs');

export async function localPrisma() {
  // Import only after validating/overriding DATABASE_URL from .env.local.
  return (await import('../../../lib/prisma')).prisma;
}
export const reviewEmail = process.env.REVIEW_DEMO_EMAIL || 'walkthrough-d@local.test';
export async function createFreshUser(options: { name?: string } = {}) {
  if (!reviewEmail.endsWith('@local.test')) throw new Error('Only fictional @local.test users may be reset');
  const prisma = await localPrisma();
  await prisma.user.deleteMany({ where: { email: reviewEmail } });
  await prisma.mobileEmailCode.deleteMany({ where: { email: reviewEmail } });
  return prisma.user.create({ data: { email: reviewEmail, emailVerified: new Date(), ...options } });
}
export async function signIn(page: Page) {
  const verify = await page.request.post('/api/auth/mobile-email/verify', { data: { email: reviewEmail, code: process.env.REVIEW_DEMO_CODE || 'WALKTHRU-RUN-D' } });
  if (!verify.ok()) throw new Error(`Review verify: ${verify.status()} ${await verify.text()}`);
  const body = await verify.json();
  const exchange = await page.request.post('/api/auth/mobile-session/exchange', { headers: { Authorization: `Bearer ${body.jwt || body.token}` } });
  if (!exchange.ok()) throw new Error(`Review exchange: ${exchange.status()} ${await exchange.text()}`);
  const { code } = await exchange.json();
  await page.goto(`/api/auth/mobile-session?code=${encodeURIComponent(code)}`);
  // next dev -H 0.0.0.0 can put its bind address in the bridge redirect.
  // The real bridge already set localhost's cookie; navigate back to that origin.
  if (new URL(page.url()).hostname === '0.0.0.0') await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}
