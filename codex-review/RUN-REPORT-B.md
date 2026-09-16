# Run B — billing and certificate integrity

Date: September 16, 2026. Branch: `fix/astra-b-billing-and-certificates`, starting HEAD `6809da2` (Run A merge). **Session definition of done is complete.** All changes are in the working tree; no commits, fetch, branch switch, push, deployment, or application database changes were attempted. Read `AGENTS.md`, `CLAUDE.md`, both Run A reports, the existing duplicate-detection change, and the installed Next.js route-handler guide before editing.

## Verification

The exact final gate passed:

```
npx tsc --noEmit && npm run lint && npx vitest run && npm run test:migrations
```

- TypeScript: PASS. Lint: PASS, no new ignore needed (the prescribed prototype ignore was already present).
- Vitest: **195 tests in 16 files PASS** — all 131 A/A2 tests plus 64 new Run B cases.
- Migration harness: **8 cases PASS**, including replay of all **18 migrations** from empty in-memory PostgreSQL. Three Run B migrations are new.
- `git diff --check`: PASS. `lib/state-requirements.ts`, `lib/courses.ts`, `package.json`, and `package-lock.json` have no diff.
- Prisma client regenerated with an explicit localhost placeholder URL; generation opens no database connection. No dependency changes.
- Stripe, Anthropic, Blob, authentication, and Prisma boundaries are mocked in tests. The existing network-denial setup remains enabled. Expected mock failure logs are part of passing failure-path tests.

**These SQL files are not applied to the populated sandbox or production.** Claude must perform the specified populated-local-sandbox `migrate dev` reconciliation after this session. No `migrate deploy`, live blob read, real extraction, payment call, or production environment read occurred.

## B1 — Review #7

- Added persistent `StripePriceMap`, `BillingAnomaly`, and `StripeEvent` tables. Current environment prices seed the map lazily on lookup; a one-minute process cache reads persistent mappings. Retired `priceId:TIER` pairs are parsed and documented, with no invented retired IDs. Existing stored tiers are not overwritten by environment changes. Inactive historical prices still grant their mapped tier. Unknown/missing prices log an error and persist an anomaly before returning FREE.
- Reused the existing unique `Subscription.stripeSubId`; did not introduce a duplicate Stripe identity column. Added Stripe creation time for ordering. Existing rows without that time use a mocked-in-tests Stripe retrieval to compare actual subscription creation times.
- Event receipts and subscription writes commit together. Duplicate events skip effects. Per-customer and per-user transaction locks serialize processing. All `customer.subscription.*` events re-fetch Stripe state after the customer lock; checkout and invoice events also retrieve current state. Older subscription identities cannot replace newer ones, even if their events arrive later.
- Existing ACTIVE/TRIALING/PAST_DUE subscriptions return a billing portal URL from checkout. The FREE customer placeholder without a Stripe subscription still permits an initial checkout.
- Added `paymentFailureGraceUntil`: first failed-invoice event starts 14 days, retries do not extend it, delayed older failures for the same invoice can shorten it, and failures for an already-recovered older invoice do not shorten a newer invoice's grace. Recovery to ACTIVE/TRIALING clears grace. Terminal/paused states are FREE.
- Entitlements evaluate grace expiry on every read, not only webhook writes. Settings and compliance course-choice gates now use the same helper. All three export fences are regression-tested after grace expiry. The pre-existing founding-free cohort remains grandfathered.
- `docs/billing.md` explains rotation, idempotency, lapse, anomalies, and rollout. Existing PAST_DUE rows have no verified failure timestamp: migration leaves grace NULL, which fails closed. Billing support must reconcile those from verified invoices if present.

## B2 — Review #5

- Added `hoursEarned` and `activityMaxHours`; compatibility `creditHours` is written only from validated earned hours for new extractions/edits. Updated the model prompt, Zod extraction schema, deterministic patterns, malformed-JSON recovery, and confidence calculation. A maximum alone is NEEDS_REVIEW and never becomes earned hours. The A1 fixture produces 1.0 earned / 20 maximum.
- Zod validates the JSON structure and individual fields. Earned hours must be positive, <=100, and quarter-hour increments; dates must parse and not be future; provider must be non-empty. Invalid fields become null for review while valid fields survive. Full confidence requires hours, date, and provider (which also satisfies the requested title-or-provider condition). Title may be null if provider is known. Maximums use the same numeric bounds when present.
- Kept the existing `fileHash` SHA-256 column. Replaced its per-user index with a per-user unique index. A duplicate returns 409 and the existing ID, including unique-index races, without another blob or scan. The migration refuses existing same-user collisions without deleting evidence.
- Added normalized activity fingerprints and `possibleDuplicateOfId`. Completion, manual entry, and PATCH use a per-user transaction lock to serialize duplicate decisions. Legacy metadata is compared on demand for the same day/hours without blob reads or data backfills. Fingerprints normalize title/provider case and whitespace, UTC date, and earned hours.
- Minimal engine change: an unresolved duplicate is unusable evidence. Its hours remain uncertain, never counted for general hours, topic hours, or linked evidence. The four-hour fixture gives **4 counted + 4 uncertain**. Topic confirmation and ordinary edits cannot clear that flag.
- Library UI offers keep both / merge. Keep both explicitly clears exclusion. Merge keeps the original entry and deletes the duplicate; if only the duplicate has a stored document, its file/hash transfer transactionally to the surviving entry. If the target was deleted, the duplicate flag deliberately remains until explicit resolution, preventing silent double-counting. Merge retains the survivor's metadata/topic decisions; it does not combine hour claims.
- PATCH validates merged fields, re-suggests topics, and clears unconfirmed extraction flags on title/topic edits. A4 explicit topic splits and confirmation behavior remain covered by the unchanged tests. Invalid edits stay NEEDS_REVIEW; topic-only edits also downgrade invalid legacy completed records. Manual-entry bounds/copy and the review form reflect the validation result.
- Kept Counts for badges and topic confirmation. CE Broker self-report excludes unresolved duplicates; the inventory PDF labels them. Inventory totals still mean hours on file/reported hours, not engine-counted compliance hours.

## B3 — Review #6

- Added STORED / STORE_FAILED / DELETED storage status. The initial row reserves the unique file hash before storage. Storage failure leaves that row, and extraction continues. A failed original is visible in the certificate row and dashboard; review-needed rows can also reattach.
- Added `/api/certificates/[id]/reattach`, sharing the existing `/file` implementation. Known hashes must match; ownership, file type/size, per-user hash uniqueness, and both mobile/web authentication are enforced. No extraction or trial usage occurs. Missing legacy hashes are recorded when reattached.
- Shared storage helper serializes reattach/delete with other certificate writes. It removes newly uploaded blobs if the row write fails. DELETE calls Blob `del()` before removing the row. If the row delete fails after blob removal, a separate conditional update records DELETED and clears the URL. Blob deletion failure retains the row and returns an error. The delete UI displays that failure.
- ZIP `compliance.json`, `Compliance_Summary.json`, and new `manifest.json` use successful retrieval during this export for `fileStored`. Missing originals produce `MISSING-ORIGINALS.txt`. Filenames include certificate IDs so same-title/date certificates cannot overwrite each other in the archive.
- Added only the proposed privacy paragraph, wholly inside `PRIVACY-COPY-PENDING-MICHAEL`; it does not render. No other privacy copy changed.

### Privacy wording — Michael must review before enabling/merge

> When you upload a CME certificate, we may send it to Anthropic, a third-party AI provider, to extract details such as the activity title, provider, completion date, and hours of CME. Do not upload documents containing patient information. To delete an uploaded certificate and its stored original, open Certificates in your dashboard and select Delete for that certificate.

## Deliberately not changed / out of scope

- No compliance facts, requirement hours/cadences/topics, catalog entries, source syncs, or database seeds changed. No new fact question was needed.
- No backfill of file hashes from historical blobs; that requires live reads and is expressly out of scope. No historical earned-hours assertion or automatic correction: existing `creditHours` remain exactly as stored, and new earned/max columns start null for old rows. No bulk fingerprint backfill; legacy comparisons use existing metadata at request time.
- No nightly blob reconciliation. A process crash or simultaneous database/storage outage still needs operator recovery; see limitations below.
- No changes to Stripe prices, dunning configuration, subscriptions, or other live objects. The code enforces entitlement expiry; it does not automatically cancel Stripe billing or alter the price after late recovery. `docs/billing.md` explicitly separates this from a commercial policy requiring permanent loss of the founding price.
- No native application UI changes. Existing mobile authentication is preserved/extended on affected certificate routes; additive response fields remain compatible through `creditHours`.
- No changes to the reviewed remote-database plan guard, migration history already on main, Apple auth invariants, the prototype, dependencies, or other public copy.
- No item reached an implementation impasse requiring an ASTRA-TODO. The known socket/.git limits were handled using the authorized offline workflow, not retried.

## Every new test and its evidence

### `tests/app/api/stripe/billing.test.ts` — 25 cases

1. Price rotation keeps a founding subscriber ESSENTIAL from the persistent historical map.
2. Retired price configuration parses valid tiers and rejects an invalid tier.
3. Unknown price returns FREE, logs, and writes a durable anomaly.
4. Duplicate webhook does not fetch/write twice.
5. A subscription event beyond the original three handled types re-fetches state and ignores stale payload status.
6. Old cancellation cannot overwrite a newer identity.
7. Legacy identity creation time is fetched before making that decision.
8. Failed synchronization rolls back the receipt and retries successfully.
9–11. ACTIVE, TRIALING, and PAST_DUE second checkouts return portal, with no new customer/checkout.
12. A FREE customer placeholder can open its first checkout.
13. First failed invoice starts 14 days, retry cannot extend it, and the exact expiry boundary returns FREE on read.
14. A stale failure cannot revoke a recovered active subscription.
15–19. CANCELED, UNPAID, INCOMPLETE_EXPIRED, INCOMPLETE, and PAST_DUE without grace are FREE.
20. An old recovered invoice's delayed failure cannot shorten a newer delinquency.
21. A newer subscription replaces the current identity and resets old grace.
22. A concurrent receipt uniqueness conflict is acknowledged only with a committed receipt.
23–25. Audit ZIP, certificate PDF, and CE Broker export each return 402 after grace expiry before reading certificates.

### `tests/app/api/certificates/integrity.test.ts` — 35 cases

1. Real A1 text fixture traverses the upload/deterministic extractor and engine: 1 earned, 20 maximum, 1 counted.
2. Maximum-only text remains uncounted and requires review without consuming a clean extraction slot.
3–7. Model hours 0, -1, 100.25, 1.1, and string `"4"` cannot populate earned/compatibility hours.
8–12. Future date, malformed date, blank provider, missing date, and malformed topics cannot reach full confidence.
13. Malformed-JSON recovery separates earned/max and ignores obsolete `creditHours`.
14. Wrong top-level model shape remains reviewable.
15. A1 duplicate fixture gives 4 counted + 4 uncertain, including mandatory-topic counting and after topic confirmation.
16. Fingerprints normalize title/provider case and whitespace.
17. Same bytes return 409 with ID before another blob/scan.
18. Unique-hash race also returns 409 without a blob.
19. Another user's identical file does not block or reveal that row.
20. Title edit re-suggests ETHICS and removes unconfirmed opioid flags/provenance.
21. Invalid PATCH hours/date remain NEEDS_REVIEW.
22. Keep both clears exclusion; merge removes only the duplicate and its unnecessary file.
23. Blob failure preserves the extraction in a STORE_FAILED row.
24. Reattach rejects a wrong known hash, accepts the matching file over mobile auth, and consumes no extraction.
25. Reattach cleans up a new blob after a row-write failure.
26. DELETE sends the exact stored URL to `del` before the row delete.
27. Blob-delete failure keeps the row; row-delete failure records DELETED after removing the blob.
28. DELETE, PATCH, and reattach reject cross-user access without blob effects.
29. Mocked 404 versus successful retrieval produces correct flags in both compliance JSON files and ZIP manifest, plus the missing-original list.
30. New scan detects legacy metadata without reading blobs or writing a backfill.
31. Deleting the original does not silently clear a duplicate's exclusion.
32. Merge transfers the only original to the survivor without deleting the blob.
33. Failed transfer update rolls back both row changes and retains the blob.
34. CE Broker excludes a pending duplicate while the inventory PDF labels its exclusion.
35. Topic-only PATCH also downgrades an invalid legacy completed record to NEEDS_REVIEW, preventing it from continuing to count.

### `tests/app/dashboard/certificate-integrity-render.test.ts` — 4 cases

1. Library renders existing Counts for/topic confirmation alongside duplicate resolution controls.
2. Maximum-only row asks for earned hours and allows reattachment during review.
3. Dashboard surfaces missing-original recovery despite preserved extraction.
4. Proposed Anthropic privacy wording is absent from rendered HTML.

### `scripts/test-migrations.js` — 3 added cases, 5 existing cases retained

- Replays all 18 migrations from empty (existing case extended automatically).
- Same-user legacy hash collision aborts the new migration atomically, preserving every row/field.
- Resolved synthetic collision allows migration; unique hash allows multiple NULLs and same bytes across users, preserves old hours/hash, and backfills storage status only from prior URL presence.
- Stripe subscription/event identities are unique; receipt+subscription effects commit/rollback together; retired price mappings and anomaly rows persist. Grace/Stripe creation time remain null on existing defaults.

## Additional findings and own diff review

- **Most uncertainty: real service/database behavior.** All verification is offline. Mocks exercise route behavior and rollback contracts; in-memory PostgreSQL exercises SQL and constraints. They do not prove real Stripe delivery timing, Prisma/adapter concurrency under load, populated-sandbox data shape, or browser click/hydration behavior. Render tests verify visible controls; handler tests verify their actions.
- **No distributed transaction with Blob.** Ordinary failures are handled and tested, but a crash after deleting a blob and before recording DELETED can leave a stale stored URL. A database outage can prevent the DELETED fallback; a simultaneous blob-cleanup failure can leave an orphan. These failures log for recovery. The explicitly deferred reconciler is needed for eventual repair. Export retrieval flags remain truthful regardless of stale storage status.
- **Billing rollout attention.** Prices seed lazily, so preserve the two configured IDs and add retired pairs at future rotations. `active` is informational when seeded, not the entitlement/checkout gate; the persistent tier is authoritative for old IDs. Existing PAST_DUE rows need verified failure-date reconciliation. Late payment recovery on the same Stripe subscription restores its mapped tier once Stripe reports active; permanent founding-rate forfeiture requires a separately reviewed Stripe billing policy/configuration, not an inferred live action here.
- **Checkout boundary.** The requested existing-subscription check uses the local synchronized row. Concurrent first checkouts or checkout before the creation webhook arrives are not a full distributed checkout-reservation system. No claim that this prevents every possible Stripe-side duplicate under that race.
- **Legacy metadata uncertainty.** Old earned hours are not revalidated/backfilled. Legacy fingerprint comparison can flag an old mistaken hours entry, but does not silently rewrite it. Human review remains the intended resolution.
- Existing CE Broker selection bypassed the shared engine and needed the explicit duplicate filter. The inventory PDF remains an inventory (reported/on-file totals), with pending duplicates labeled. Neither becomes a new compliance evaluator.
- Archive names previously collided on title/date. Adding the ID prevents file overwrite and is necessary for truthful inclusion flags when a user elects to keep both.
- DELETE previously ignored failed HTTP responses. The narrow UI correction makes new storage failures visible.
- Merge intentionally retains existing metadata and explicit topic decisions; only an absent original is healed from the duplicate. No summing or auto-confirmation of hours occurs.

See `COMMIT-PLAN-B.md` for proposed local commits. Stop point: gate green, reports written, all changes uncommitted, migration reconciliation and privacy approval left to the authorized post-run workflow.
