# Google Ads completed registrations

Audit date: October 28, 2026. Starting main: `310a3755438771fe9f29e0a853d08fd7c7d68c86`.

## Finding and decision

**Recommendation: let the current pilot end on its scheduled date, approximately October 29, and revise measurement before authorizing another finite pilot.** This is a measurement-readiness recommendation, not evidence that Google Ads converts poorly. No campaign dates, status, budget, bids or spend were changed by this implementation.

The [October 27 performance email](https://mail.google.com/mail/u/?authuser=hello%40clearcme.ai#all/1a17f053f518540a) reports **37 impressions and two clicks for October 18–24** and asks for conversion setup. Its flattened campaign table can misleadingly put the number 2 near the Conversions heading; it does not establish two registrations or customers. Two clicks do not support a meaningful conversion-rate conclusion. Actual spend, cost per registration, search terms, targeting, and paid-customer outcomes were not available in the inspected evidence. The campaign name includes "$150 pilot"; this is not proof of its current budget or actual spend. Live account reporting was unavailable through the connected reporting tool during this audit.

The [campaign-end notice](https://mail.google.com/mail/u/?authuser=hello%40clearcme.ai#all/1a17ebbe01771403), dated October 27, says the Search campaign ends in two days. The exact account end-date setting was not independently inspected. The [advertiser verification notice](https://mail.google.com/mail/u/?authuser=hello%40clearcme.ai#all/1a17c41c513c8af5) sets **November 25, 2026** as the deadline and says verification can take up to **seven business days**. Complete verification promptly if further advertising is planned; it is separate from campaign measurement.

Before another pilot, review the actual spend, search terms, match types, negatives, geography and final landing page; agree on a fixed budget/end date and acceptable cost per completed registration using the business's economics. Those settings were not changed here. Do not optimize to CTA clicks or treat registration as a paying customer. Activation and paid subscriptions are separate outcomes.

## Existing measurement, preserved

| Surface | What it measures | Privacy and interpretation |
| --- | --- | --- |
| `AcquisitionAnalytics` in the root layout | Public CTA/course clicks; Vercel public pageviews | Allowlisted routes; query strings, fragments and private paths excluded from Vercel events; DNT honored |
| `clearcme_acquisition` | First eligible landing page, cluster, coarse channel and time, up to 30 days | No click IDs or UTM contents. Any `utm_source`/`utm_campaign` is classified broadly as campaign; an auto-tagged click without UTM may resemble organic search. This is not Google Ads attribution |
| Auth.js `createUser` → `recordSeoRegistration` | New-account registration by saved first touch | Atomic first-party aggregate and account attribution; DNT honored; not a form view or email-link request |
| `recordSeoActivation` | First active license plus processed/verified manual CME record | Separate, atomic milestone; remains first party and is not sent to Ads |
| PostHog browser/server analytics | Product usage and signups | Existing `trackSignup` sends account ID, name and email to PostHog; browser recordings mask inputs and numeric identifiers. Its server signup helper has no request-level DNT check. This audit does not certify all existing analytics as free of personal data; none of these PostHog properties are forwarded to Ads |

The current main already includes infection-control and organ-donation in the SEO route allowlist. An older open draft PR #8 addresses those routes; its work is not repeated here. No existing acquisition code or PostHog behavior is changed.

The inspected main contained no Google Ads tag or completed-registration Ads delivery. Google's [October 13 tag instructions](https://mail.google.com/mail/u/?authuser=hello%40clearcme.ai#all/1a136e323f187709) identify `AW-18511494396` and website signup label `9CK2CMjR4JsdEPz5-_pE`. These are browser-tag identifiers, not the numeric import conversion action required below. Their current status was not inspected in the live account.

## Integration and data boundary

This implementation uses Google's **Data Manager API** to import consented click conversions. It adds no Google browser script, pageview tag, remarketing pixel, enhanced conversion, hashed email matching, or advertising session replay. The browser only contacts ClearCME's consent endpoint. The server contacts Google using its own network connection, without forwarding visitor IPs, headers or user agents.

1. On an eligible public landing, offer equal Allow/Decline controls. No new Ads click cookie is written before explicit opt-in. A saved opt-in permits a later eligible paid landing to update the click; the original consent expiry is retained.
2. Accept only bounded `gclid` or web `wbraid` values. Reject private paths, URL/query/fragment dimensions, additional top-level personal fields and client registration events. `gbraid` app attribution is outside this web-only integration.
3. Store consent and click in a separate AES-256-GCM authenticated, encrypted, HttpOnly cookie for at most 30 days. HTTPS uses Secure/SameSite=None for Apple's cross-site callback, consistent with the existing auth requirement. The existing acquisition cookie is independent.
4. After Auth.js successful sign-in, queue only `isNewUser` registrations. Google, Apple and email-link web signups share the hook. Requesting an email link, failure, returning sign-in, page navigation and mobile authentication do not create Ads conversions.
5. An additive, encrypted database outbox claims one event per account. The random UUID is not derived from the account ID. Internal account/consent references never enter Google's payload. Account deletion cascades to the outbox.
6. An authenticated hourly GET cron waits at least six hours after signup, submits up to five events, polls processing receipts, retries with the same event UUID and original registration time, and caps work at eight attempts per row. Database leases limit concurrent sends. Expired rows are deleted; successful processing immediately clears click ciphertext. Cleanup also runs with delivery disabled when the table is available.
7. Withdrawal cancels locally queued, unsubmitted events. A submission already in flight may complete. Previously submitted data is not retracted by this endpoint. DNT/GPC/native-app headers override collection even with an earlier cookie; the browser also requests withdrawal when these signals are detected.

Exact event fields sent to Google:

| Field | Source |
| --- | --- |
| `adIdentifiers.gclid` **or** `adIdentifiers.wbraid` | Consented Google click identifier |
| `eventTimestamp` | Successful new-account sign-in time, RFC 3339 |
| `transactionId` | Random UUID, stable across retries |
| `eventSource` | Constant `WEB` |
| Consent | `adUserData=CONSENT_GRANTED`, `adPersonalization=CONSENT_DENIED` |
| Destination | Configured Ads customer, optional manager and numeric conversion action |

No name, email (including hashes), account ID, IP address, browser identifier, full URL, referrer, UTM value, search query, specialty, license/DEA/NPI number, certificate, activation detail or payment data is included. No monetary value is invented for a registration. Click IDs remain **pseudonymous advertising data**, not anonymous data; attribution necessarily discloses that the click led to a registration. If no advertising identifier may leave ClearCME, use first-party aggregate reporting only and leave this integration disabled.

Google can accept an ingestion request and later reject an event. The worker therefore distinguishes submitted from processed. Even processed uploads can have warnings or fail to match an ad click; only Google Ads reporting establishes attributed conversions. Logs/cron output contain counts or fixed error messages, not Google's raw errors, click IDs, event IDs or credentials. `requestId` stays in the private outbox for diagnostics, not browser responses.

Limitations: consented, same-browser, web registrations only; cross-device magic-link completion, cookie rejection/expiry, unsupported identifiers, failed capture, queue outages and exhausted retries can undercount. Existing first-touch first-party attribution and Google's click-based attribution use different definitions, so their totals should not be expected to match. There is no historical reconstruction, purchase attribution, customer-match fallback or anonymous-conversion claim.

## Configuration and rollout

**This branch is off by default and is not a production deployment. A migration is required.** No credentials or live database URLs were copied into this checkout.

1. Review this implementation and the updated privacy notice. Preserve the existing first-party/PostHog settings; do not wire those events to Google.
2. Apply `20261028090000_google_ads_registration` to an isolated Preview/test database and verify it there. The ordinary `prisma generate` step does not apply migrations. Before an approved production rollout, run the repository's normal `prisma migrate deploy` process against the explicitly selected database. Do not seed production. Main deploys production immediately, so prepare the additive migration before enabling the feature.
3. In the Ads account, create or select an **ENABLED import-from-clicks conversion action**, type `UPLOAD_CLICKS`, category signup, count One, with no assumed dollar value and a compatible click window (up to 30 days here). Start as a secondary observation goal during verification. Confirm account ownership/current action state. Do not put the existing AW tag ID or website label into the numeric action field.
4. Enable the Data Manager API in the operator's Google Cloud project, authorize a suitable operator identity with `https://www.googleapis.com/auth/datamanager`, and grant it access to the conversion account or its parent manager. These credentials are separate from physicians' Google Sign-In. Do not request this scope from product users.
5. Put these **server-only** variables in the deployment's secret configuration. None uses `NEXT_PUBLIC_`:

   | Variable | Required value |
   | --- | --- |
   | `GOOGLE_ADS_MEASUREMENT_ENABLED` | Explicit `true` after readiness verification; absent/false disables collection and delivery |
   | `GOOGLE_ADS_CUSTOMER_ID` | Conversion-owning customer, 10 digits without hyphens. Notice account: `4341095762`; verify ownership |
   | `GOOGLE_ADS_REGISTRATION_ACTION_ID` | Numeric `UPLOAD_CLICKS` action ID; **not available in inspected material** |
   | `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Optional manager/customer through which the operator has access; defaults to the customer |
   | `GOOGLE_ADS_COOKIE_KEY` | Separate random 32-byte key encoded as 64 hex characters (`openssl rand -hex 32`) |
   | `GOOGLE_ADS_OAUTH_CLIENT_ID` | Operator OAuth client |
   | `GOOGLE_ADS_OAUTH_CLIENT_SECRET` | Operator OAuth client secret |
   | `GOOGLE_ADS_OAUTH_REFRESH_TOKEN` | Operator refresh token with Data Manager scope |
   | `CRON_SECRET` | Existing Vercel cron bearer secret, required for worker execution |

   Preview Vercel deployments remain disabled by code, even if variables are accidentally populated. Use an isolated local app/database for opt-in testing. Never paste secrets into chat or commit environment files. Keep the cookie key stable while events are queued; rotation invalidates old ciphertext. Queued events are bound to the customer/action at signup and do not silently move when configuration changes.

6. Confirm campaign auto-tagging and that redirects preserve click IDs up to the public landing page. Do not add click IDs to login or dashboard links. During validation, send the minimal payload with `validateOnly: true` using Google's API Explorer/operator tooling, then inspect the response. A synthetic ID can exercise schema validation; it does not prove ad attribution. No live API request was made during this implementation.
7. After an approved rollout, verify one authorized real paid-click new signup through receipt processing and Google Ads reporting. Confirm that its payload contains only the fields above; a returning sign-in, declined choice, DNT/GPC, failed signup and native app produce no new conversion. Check worker retries/warnings/exhausted counts and reporting delay before treating measurements as ready. Do not send artificial registrations to the production conversion action as success evidence.
8. Only after attribution is confirmed, decide whether to authorize a revised bounded pilot. Review search terms and actual costs alongside completed registrations. Define a separate paid-customer measure before using a revenue claim or customer acquisition cost.

To stop collection and uploads, set `GOOGLE_ADS_MEASUREMENT_ENABLED=false`; the cleanup worker still removes expired rows when the table is available. If cancellation is intended, also purge unsubmitted outbox rows through an authorized database operation before any later re-enable. Do not change destination IDs with unresolved events without reviewing them. Already submitted events need Google's supported adjustment/retraction process if correction is required.

## Validation

Implemented checks cover config gates, encryption/tampering/expiry, DNT/GPC/native exclusions, same-origin/body/path validation, withdrawal, actual Auth.js new-user callback wiring, returning sign-ins, bounded payloads, OAuth/Google failures, receipt processing, stable retries and atomic delivery claims. Existing SEO attribution and activation tests remain unchanged.

Commands:

```sh
npx prisma generate
npm test
npx tsc --noEmit
npm run lint
npm run test:migrations
git diff --check
```

Validation result: **377 tests passed**, TypeScript, ESLint and whitespace checks passed. A production build using `next build --webpack` passed with a synthetic loopback database URL and Ads disabled; no production service credentials were used. Webpack was selected because this environment reuses dependency directories outside the worktree and Turbopack could not resolve that layout. The built browser assets contain no Ads OAuth/key configuration or Data Manager endpoint.

The optional repository secret scanner reports three existing findings in unchanged test files (`tests/e2e/start-server.cjs` and `tests/reviewed-db-plan.test.ts`). Comparing fingerprints to the starting main confirms zero introduced findings; those unrelated files were not changed.

The migration harness replays all 24 migrations in local in-memory PostgreSQL and checks outbox uniqueness and account-deletion cascade. No production DB is used. The local Playwright UI check is `node tests/e2e/google-ads-measurement.mjs` against a separately started local app on port 3047; it mocks consent responses and rejects non-local base URLs. Browser verification was blocked here because Chromium was unavailable and its download failed. Real Google receipt/attribution validation is also pending credentials and the import action.

## Official implementation references

- [Data Manager offline conversion event requirements](https://developers.google.com/data-manager/api/devguides/events/google-ads/offline/send-events) — numeric import action, click-only identifiers and request construction.
- [Ingest events REST reference](https://developers.google.com/data-manager/api/reference/rest/v1/events/ingest) — ingestion is asynchronous and returns a request ID.
- [Request processing status reference](https://developers.google.com/data-manager/api/reference/rest/v1/requestStatus/retrieve) — processing statuses, destination receipts and warnings.
- [Data Manager API access](https://developers.google.com/data-manager/api/devguides/quickstart/set-up-access) — operator API scopes and account access.
- [Google Ads offline upload migration](https://developers.google.com/google-ads/api/docs/conversions/upload-offline) — new offline-upload access restrictions beginning June 15, 2026 direct new integrations to Data Manager.

These references were checked during the October 28 audit. They describe API requirements; they do not establish this account's current conversion settings or live results.
