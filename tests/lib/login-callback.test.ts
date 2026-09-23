import { expect, test } from 'vitest';
import { loginCallbackUrl } from '@/lib/login-callback';

test.each(['/dashboard/certificates/new', '/dashboard?x=1', '/', '/dashboard#certificates'])('retains local destination %s', path => {
  expect(loginCallbackUrl(path)).toBe(path);
});
test.each([null, undefined, '', '//evil', 'https://evil', '/\\evil', 'javascript:', 'dashboard', '/\n/evil', '/\t/evil', ' /dashboard'])('rejects unsafe destination %s', path => {
  expect(loginCallbackUrl(path)).toBe('/dashboard');
});
