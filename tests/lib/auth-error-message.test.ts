import { expect, test } from 'vitest';
import { authErrorMessage } from '@/lib/auth-error-message';

test.each([
  ['Configuration', 'Sign-in is misconfigured on our end. Please try again shortly.'],
  ['Verification', 'That sign-in link has expired or was already used. Please try signing in again below.'],
  ['OAuthSignin', "We couldn't start sign-in with that provider. Please try again."],
  ['OAuthSignInError', "We couldn't start sign-in with that provider. Please try again."],
  ['OAuthCallback', "We couldn't finish sign-in with that provider. Please try again."],
  ['OAuthCallbackError', "We couldn't finish sign-in with that provider. Please try again."],
  ['AccessDenied', 'Sign-in was cancelled or not permitted.'],
  ['EmailSignin', "We couldn't send your sign-in link. Please try again shortly."],
  ['EmailSignInError', "We couldn't send your sign-in link. Please try again shortly."],
])('%s gives specific recovery guidance', (error, expected) => {
  expect(authErrorMessage(error)).toBe(expected);
});
test.each(['unexpected-secret-code', 'toString', '__proto__'])('unknown %s stays generic', error => {
  expect(authErrorMessage(error)).toBe('Something went wrong signing you in. Please try again.');
});
