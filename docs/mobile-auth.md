# Mobile authentication and the web-view bridge

Native Google sign-in POSTs `idToken` to `/api/auth/mobile-google`. The Google authentication library verifies signature, expiry, issuer, and audience against `GOOGLE_CLIENT_ID` plus optional `GOOGLE_IOS_CLIENT_ID`. Only boolean `email_verified: true` is accepted. Verification uses cached public certificates (key refresh requires Google's public-key endpoint); no tokeninfo request sends the bearer token in a URL.

Native Apple sign-in POSTs `identityToken` to `/api/auth/mobile-apple`. Signature verification uses Apple's JWKS, RS256, the Apple issuer, expiry, and the exact configured `APPLE_BUNDLE_ID`. There is no hardcoded audience fallback. Set this environment variable before rollout; the former `APPLE_IOS_BUNDLE_ID` name is no longer used. Apple's boolean true or string "true" email verification claims are accepted.

Accounts resolve by `(provider, providerAccountId)` before considering email. Verified email can link an existing user without creating a duplicate, unless another account from that provider is already linked. Creation/linking is transactional. The web OAuth sign-in callback also requires verified email before automatic linking. The existing Apple cross-site cookie configuration is preserved.

The native app receives its usual mobile JWT. To open an authenticated web view:

1. POST `/api/auth/mobile-session/exchange` with `Authorization: Bearer <mobile JWT>`. The response is `{ "code": "<single-use code>", "expiresIn": 60 }`.
2. Immediately navigate the web view to `/api/auth/mobile-session?code=<code>`.
3. The server atomically consumes the code and creates an Auth.js database session, sets the secure HTTP-only session cookie, and redirects to `/dashboard`. A repeated, expired, malformed, or concurrently consumed code returns 401.

Codes contain 32 random bytes; only their SHA-256 hash is stored in the existing `VerificationToken` table. Responses use `Cache-Control: no-store`; the redirect also sets `Referrer-Policy: no-referrer`. No new database table is required. Expired rows cannot authenticate; pruning them can use the existing verification-token maintenance policy.

For one release, requests containing the old `?token=` parameter return 410 Gone and log a deprecation message without the token. The read-only iOS reference still builds that URL in `app/dashboard.tsx:26`; Michael must coordinate the wrapper update before rolling out this breaking bridge change. The iOS repository was not edited.

Verification references: [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Apple identity verification](https://developer.apple.com/documentation/signinwithapple/verifying-a-user). Tests use locally signed tokens and mocked public-key retrieval; no provider authentication service is called.
