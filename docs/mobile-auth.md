# Mobile authentication and the web-view bridge

Native Google sign-in POSTs `idToken` to `/api/auth/mobile-google`. The Google authentication library verifies signature, expiry, issuer, and audience against `GOOGLE_CLIENT_ID` plus optional `GOOGLE_IOS_CLIENT_ID`. Only boolean `email_verified: true` is accepted. Verification uses cached public certificates (key refresh requires Google's public-key endpoint); no tokeninfo request sends the bearer token in a URL.

Native Apple sign-in POSTs `identityToken` to `/api/auth/mobile-apple`. Signature verification uses Apple's JWKS, RS256, the Apple issuer, expiry, and the exact configured `APPLE_BUNDLE_ID`. There is no hardcoded audience fallback. Set this environment variable before rollout; the former `APPLE_IOS_BUNDLE_ID` name is no longer used. Apple's boolean true or string "true" email verification claims are accepted.

On September 16, the read-only native reference's `app.json` and `app/(auth)/login.tsx` confirmed the following public audience identifiers. Both were missing from the web sandbox and have now been set in `.env.local`. Production configuration was not read or changed; its owner must verify these match the native build being released:

```dotenv
APPLE_BUNDLE_ID=ai.clearcme.app
GOOGLE_IOS_CLIENT_ID=925639150574-v8gm73h4nkikrahp2l8gsa8t5c2f071q.apps.googleusercontent.com
```

Accounts resolve by `(provider, providerAccountId)` before considering email. Verified email can link an existing user without creating a duplicate, unless another account from that provider is already linked. Creation/linking is transactional. The web OAuth sign-in callback also requires verified email before automatic linking. The existing Apple cross-site cookie configuration is preserved.

The native app receives its usual mobile JWT. To open an authenticated web view:

1. POST `/api/auth/mobile-session/exchange` with `Authorization: Bearer <mobile JWT>`. The response is `{ "code": "<single-use code>", "expiresIn": 60 }`.
2. Immediately navigate the web view to `/api/auth/mobile-session?code=<code>`.
3. The server atomically consumes the code and creates an Auth.js database session, sets the secure HTTP-only session cookie, and redirects to `/dashboard`. A repeated, expired, malformed, or concurrently consumed code returns 401.

Codes contain 32 random bytes; only their SHA-256 hash is stored in the existing `VerificationToken` table. Responses use `Cache-Control: no-store`; the redirect also sets `Referrer-Policy: no-referrer`. No new database table is required. Expired rows cannot authenticate; pruning them can use the existing verification-token maintenance policy.

For one release, requests containing the old `?token=` parameter return 410 Gone and log a deprecation message without the token. The read-only iOS reference still builds that URL in `app/dashboard.tsx:26`; Michael must coordinate the wrapper update before rolling out this breaking bridge change. The iOS repository was not edited.

Verification references: [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Apple identity verification](https://developer.apple.com/documentation/signinwithapple/verifying-a-user). Tests use locally signed tokens and mocked public-key retrieval; no provider authentication service is called.

## Email sign-in codes (added 2026-09-16)

The iOS app also offers "Continue with email" so physicians who joined on the web with an email link can get into the app, and so App Review has working credentials.

1. POST `/api/auth/mobile-email/start` with `{ "email" }`. The server stores a SHA-256 hash of a random six-digit code in `MobileEmailCode` (one row per lower-cased email) and emails the code through the existing Resend transport. Codes last 10 minutes. Resends are limited to one per 30 seconds and five per 15 minutes.
2. POST `/api/auth/mobile-email/verify` with `{ "email", "code" }`. Five wrong guesses retire the code. A correct code is spent atomically, the user is found or created with a verified email, and the response is the same 30-day mobile JWT the Apple and Google routes return. The web view then uses the exchange flow above.

**App Review account.** When both `REVIEW_DEMO_EMAIL` and `REVIEW_DEMO_CODE` (8+ characters) are set, that one address signs in with the fixed code and no email is sent. The account must already exist and must hold fictional data only. Ten wrong guesses lock it for 15 minutes. Unset either variable to switch it off between reviews.

## Running inside the iOS app

The wrapper appends `ClearCMEApp/<version>` to the web view's user agent. `app/layout.tsx` tags `<html data-app-shell="ios">` before first paint, and two CSS utilities do the rest: `.app-hide` (pricing, plan names with prices, upgrade and checkout links, the billing portal) and `.app-only` (neutral replacement copy). Server-side, `/pricing` redirects to `/dashboard` and the Stripe checkout and portal routes return 403 for app requests. This is App Store guideline 3.1.1: the app contains no purchase flows, prices, or links to buy. Anything new that sells or prices a plan needs `.app-hide`.

## Account deletion

`DELETE /api/account` with `{ "confirm": "DELETE" }` (Settings → Delete account, reachable in the app) cancels any Stripe subscription first, removes the user's private blobs (`certificates/<userId>/`, `audit-exports/<userId>/`), then deletes the user row, which cascades to everything else. Each step is safe to repeat; if billing or storage fails, nothing after it runs. The Stripe webhook acknowledges events for users that no longer exist.

## Push alerts

The app registers its Expo push token at `POST /api/devices/push-token` and clears it with `DELETE` on sign-out. `/api/cron/renewal-reminders` runs daily but only sends on days 60, 45, 30, 21, 14, 7, 3, and 1 before a renewal. Tokens Expo reports as `DeviceNotRegistered` are cleared.
