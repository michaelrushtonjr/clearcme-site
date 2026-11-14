import { expect, test } from 'vitest';
import { chosenPlan, loginCallbackUrl, planLoginHref } from '@/lib/login-callback';

test.each(['/dashboard/certificates/new', '/dashboard?x=1', '/', '/dashboard#certificates'])('retains local destination %s', path => {
  expect(loginCallbackUrl(path)).toBe(path);
});
test.each([null, undefined, '', '//evil', 'https://evil', '/\\evil', 'javascript:', 'dashboard', '/\n/evil', '/\t/evil', ' /dashboard'])('rejects unsafe destination %s', path => {
  expect(loginCallbackUrl(path)).toBe('/dashboard');
});

test('price-card links carry the plan through sign-in the way /pricing does', () => {
  expect(planLoginHref('essential')).toBe('/login?callbackUrl=%2Fpricing%3Fcheckout%3Dessential');
  expect(planLoginHref('pro')).toBe('/login?callbackUrl=%2Fpricing%3Fcheckout%3Dpro');
  for (const plan of ['essential', 'pro'] as const) {
    const callbackUrl = new URL(planLoginHref(plan), 'https://clearcme.ai').searchParams.get('callbackUrl');
    // The sign-in page keeps the destination and reads the plan back out of it.
    expect(loginCallbackUrl(callbackUrl)).toBe(`/pricing?checkout=${plan}`);
    expect(chosenPlan(callbackUrl)).toBe(plan);
  }
});
test.each([
  ['/pricing?checkout=essential', 'essential'],
  ['/pricing?checkout=PRO', 'pro'],
  ['/pricing?utm_source=x&checkout=pro', 'pro'],
])('reads the chosen plan from %s', (path, plan) => {
  expect(chosenPlan(path)).toBe(plan);
});
test.each([null, undefined, '', '/pricing', '/pricing?checkout=group', '/pricing?checkout=', '/dashboard?checkout=pro', '/pricing/x?checkout=pro', '//evil.example/pricing?checkout=pro', 'https://evil.example/pricing?checkout=pro'])('no plan is chosen for %s', path => {
  expect(chosenPlan(path)).toBeNull();
});
