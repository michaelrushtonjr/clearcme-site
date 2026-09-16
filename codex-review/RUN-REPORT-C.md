# Run C — transport, reminder delivery, federal training

Date: September 16, 2026. Branch: `fix/astra-c-transport-reminders-dea`. **Session implementation is complete; changes are uncommitted and unpushed.** No checkout, fetch, add, commit, merge, rebase, push, deployment, production environment read, external-service mutation, or application database operation occurred. Read AGENTS.md, CLAUDE.md, A/A2/B reports, and installed Next.js route-handler/client-component documentation before implementing. Used the supplied offline workflow; no sub-agents or new dependencies.

## Verification

Final gate: `npx tsc --noEmit && npm run lint && npx vitest run && npm run test:migrations`.

- TypeScript and lint: PASS. Existing prototype ignore was already present; no lint configuration change needed.
- Vitest: **241 tests across 23 files PASS** (195 existing A+B cases retained; 46 new C cases).
- SQL: **11 check groups PASS**, including all **21 migrations replayed from empty**, populated legacy backfills, and the actual application quota/delivery SQL. No local or remote database socket used.
- `git diff --check`: PASS. Protected fact files and dependency manifests/lockfile are unchanged.

The generated Prisma client was refreshed locally with an explicit localhost placeholder DATABASE_URL; generation does not connect to a database. Three migrations remain unapplied to the populated sandbox. Claude must reconcile them afterwards using the existing local workflow. This is not a production deployment or a claim of live service verification.

## Changes by review item

### C1 / Review #8 — transport and quotas

- Added authenticated web/mobile `handleUpload` token route. Five-minute, no-overwrite tokens cover only the user's incoming pathname, PDF/JPEG/PNG, maximum 10 MiB. The browser uses private access; this SDK's handleUpload options do not include access mode, so the configured store must be private. No Blob credentials are exposed to the browser.
- Browser prepares photos with canvas: maximum 2000 px long edge, JPEG quality 0.85, white background. SHA-256 covers the prepared bytes. Server reads only its configured private store, validates owner/path and URL, independently bounds MIME/size/read bytes, verifies the hash, and then uses the Run B certificate reservation, duplicate handling and storage helper. It attaches the verified blob without writing a second original.
- Preserved multipart web/native uploads and browser fallback with an enforced 4 MiB limit. Failed final extraction requests are not automatically resubmitted as multipart; SHA-256 and existing unique constraints handle deliberate retries. Desktop and camera clients use the shared helper. DEA photos use the same preparation, with a 4 MiB server limit and no registration-file storage.
- Replaced synchronous inflate with asynchronous streaming inflate and a shared 25 MiB decompressed-output budget across PDF objects. Oversize data aborts before AI fallback, persists NEEDS_REVIEW with the safety-limit error, and does not consume a clean slot.
- Added short extraction reservations. A database user-row lock precedes `UPDATE ... WHERE ... RETURNING`, covering both lifetime attempts and clean slots already reserved by concurrent scans. Attempts remain monotonic; clean outcomes increment the existing monotonic counter; failed/partial scans release their reservation. Two-minute leases recover capacity after terminated workers. Expired leases cannot finalize a clean result. DEA scans share this machinery, including mobile auth and ownership checks before paid work.
- Added shared POST certificate/DEA 10/minute/user in-process limiting with Retry-After. `ASTRA-TODO(C-1)` explicitly records the required KV follow-up for cross-instance enforcement.
- Audit ZIP uses JSZip's streaming API, no new library. Fully retrieved originals are spooled to temporary files so Run B's inclusion flags stay truthful. Each ZIP folder gets a lazy file stream; neither all originals nor the ZIP is buffered in RAM. Stream completion/cancellation destroys sources and cleans temporary files. Temporary originals are bounded at 256 MiB and excess fails explicitly.
- Above 40 MiB estimated archive content, counting repeated folder entries, ZIP output streams into a private blob. JSON returns a signed download link expiring after 15 minutes; a new streaming route checks authenticated owner and current export entitlement. The export button handles both response types. Small packages stream directly. Audit generation/download have 300-second function limits.

### C2 / Review #9 — durable reminders

- EmailLog now records PENDING/SENT/FAILED, attempts, lastError, cycleKey, lastAttemptAt, and a nullable sentAt. The unique conditional claim prevents overlapping cron workers from sending the same active delivery. Only successful sends become SENT. Returned transport failures and thrown exceptions become FAILED; stale PENDING leases recover after 15 minutes; retry cap is five.
- Renewal queries use threshold windows instead of exact days and derive dedupe/cycle keys from the actual license renewal date. A failed 30-day reminder remains due at 29 days. SENT still prevents duplicates. Existing opt-outs remain respected. The requested upper-bound-only rule includes overdue active licenses and can catch up several unsent thresholds.
- Monthly digest runs daily at the existing 15:00 UTC time, with a single SENT key per user/month. It retries unfinished prior-month delivery before creating the new month, at most one digest per user/run. All attempts render fresh A3 engine output.
- Email and push crons return 500 with failure counts when delivery fails. Expo HTTP failures, rejected tickets and missing tickets no longer report success. Push and digest do not read persisted ComplianceStatus; push can compute status even for a user without an email address.
- Added operator failure notifications through `lib/email.ts`; recipient comes only from ALERT_EMAIL. When unset, failures log only. Alert transport failure is caught and cannot hide the failed run. `.env.local.example` and `docs/run-c-decisions.md` document configuration.
- Federal status is shown separately in emails, outside state-renewal pacing/topic instructions, so a state renewal date does not become a federal deadline.

### C3 / Review #10 — one federal record

- Added FederalTrainingRecord with one user identity, MATE_ACT kind, the four requested bases, optional completion date/evidence, attestedAt and notes. Completion date is nullable because historical checkbox attestations did not record one; inventing a date would falsify evidence.
- Migration consolidates explicit legacy mateActCompleted flags; retains confirmed certificate-linked MATE evidence/dates; and does not infer completion from a registration document or generic opioid course. It preserves all existing license fields and all state rule facts. Certificate deletion clears the evidence reference without deleting the attestation.
- Added a profile federal-record form with basis, completion date, notes, attestation/withdrawal, DEA applicability and physician-confirmed first qualifying event. Web, mobile legacy DEA PATCH and license creation all converge on the same federal-record writer. Existing fields remain readable and are mirrored for compatibility; removal is a later coordinated release.
- Both required pages render Michael's exact approved sentence via MateActNotice → mateActDeadline in lib/mate-act.ts. Removed contradictory calculators/scenarios and the homepage's implied state-renewal MATE deadline. Retained course catalog content unchanged.
- The shared function accepts a known initial registration, explicit first qualifying renewal, or explicitly confirmed first qualifying event; an initial registration before the cutoff without the qualifying renewal, or an invalid date, returns UNKNOWN. Historical deaRegisteredAt also contained renewal issue dates. The engine therefore uses the new nullable user-level first-event field, not a guessed historical date. Details are in FACT-QUESTIONS-C.md.
- A3 evaluates one federal row and shares it across licenses, including licenses without computable state rules. Only an actual FederalTrainingRecord yields MET. A confirmed nonregistrant without a record is NOT_APPLICABLE; uncertain history remains UNKNOWN. The API exposes federalRequirements alongside the evaluation; dashboard, compliance map, snapshot and ZIP show the row. It is excluded from state pacing and per-license state sums, and added once to the user snapshot's aggregate gap.
- Old source rows explicitly named MATE Act are represented by the federal row at evaluation time, not rewritten/deleted in the database. A state requirement merely mentioning overlap with MATE remains a state requirement. Even a caller missing federal context cannot silently drop a legacy MATE row and become compliant.
- Next-action recommendations distinguish ordinary state Substance Use from MATE_ACT and link a federal-only gap to the profile, without tying it to a state renewal date.

## Deliberately not changed

- No compliance facts in lib/state-requirements.ts, lib/courses.ts, or database hours/cadences/topics. No seeds, source syncs, catalog edits, or dependency upgrades. lib/mate-free-courses.ts remains the existing catalog-derived selector.
- No populated sandbox reconciliation or production migration. No `.env.prod` read. No live Stripe, Google, Anthropic, Blob, Resend or Expo call. Tests block network and replace the service boundaries.
- No change to Apple cookies, origin, Stripe entitlements, founding grandfathering, existing duplicate/fingerprint rules, earned-vs-maximum validation, or requirement-completion eligibility.
- No native app code changes; multipart compatibility and mobile authentication remain. Native clients needing larger files must adopt direct upload or prepare a file within the server limit.
- No shared KV limiter or lifecycle reconciler. Only the explicitly requested in-process limiter/TODO is implemented. Abandoned direct-upload blobs and generated private exports require later lifecycle cleanup. Expired links revoke application download access, not the blob object itself.
- No historical email receipt reconstruction. Legacy logs are retained as SENT to preserve dedupe behavior. The old system did not record enough information to distinguish a successfully delivered email from a crash after inserting its log; operator/provider reconciliation remains necessary for suspected historical failures.
- No item stalled beyond the timebox; no blocked implementation was silently omitted. The known environment restrictions were handled without retrying prohibited git/database operations.

## Every new test and what it proves

### tests/lib/transport.test.ts — 6

1. Multiple compressed PDF streams share the same 25 MiB budget.
2. In-process limiter permits ten calls, rejects the eleventh, isolates users, and resets.
3. Signed archive token rejects tampering, another user and expiry.
4. Camera conversion sets 2000×1500 for a 4000×3000 image, q0.85 JPEG, and releases its object URL.
5. Client sends private bytes then the matching SHA-256 JSON request.
6. Token failure permits only a ≤4 MiB multipart fallback; an extraction connection failure cannot trigger another extraction automatically.

### tests/lib/extraction-quota.test.ts — 4

1. User lock precedes conditional quota UPDATE; only success creates a reservation.
2. Exhausted clean slots, exhausted attempts and temporarily reserved slots receive the appropriate reason/status.
3. Partial scans release only their lease; clean completion increments once; already-finalized IDs cannot increment again.
4. Expired leases cannot consume a clean slot after reuse.

### tests/app/api/certificates/integrity.test.ts — 5 additions, 35 retained

1. Direct private upload verifies bytes, attaches without another put, extracts the existing fixture and deduplicates a retry before another scan.
2. Cross-user paths, foreign hosts and wrong hashes cannot reserve a certificate or spend quota.
3. Multipart >4 MiB is rejected before quota/storage.
4. A 26 MiB decompression bomb persists NEEDS_REVIEW and avoids AI/clean-slot usage.
5. Large audit writes a readable streamed ZIP to a private blob and returns a future-expiring authenticated link.

Existing entitlement mocks/assertions now use reservation/finalization; existing surface fixtures explicitly provide a satisfied federal record so their original state-specific assertions still test the same thing. No baseline test was removed.

### tests/app/api/certificates/token.test.ts — 2

1. Token policy scopes owner/path, MIME, maximum size and overwrite behavior; foreign/traversal paths fail.
2. Anonymous access fails and mobile identity works.

### tests/app/api/certificates/audit-download.test.ts — 2

1. Owner receives a private no-store stream through the authenticated download route.
2. Expired, cross-user, anonymous and downgraded requests cannot read Blob.

### tests/app/api/cron/reminders.test.ts — 7

1. Thrown 30-day send persists FAILED/error/attempt, returns 500/alert, and succeeds at 29 days.
2. Overlapping runs and subsequent SENT dedupe produce one send.
3. Returned transport failure persists and stops after five sends.
4. Stale PENDING from a terminated worker is retried.
5. Digest uses fresh engine gaps despite a contradictory stored ComplianceStatus and dedupes the month.
6. Push uses engine gaps and reports rejected Expo tickets as failures/alerts.
7. Failed month-end digest retries under its original key after the calendar changes, before creating a new digest.

### tests/lib/email-alert.test.ts — 2

1. Failure notification uses the existing transport and configured ALERT_EMAIL.
2. Unset address logs only; alert failure never masks the original cron failure.

### tests/app/api/dea/federal-training.test.ts — 18

1–5. Before cutoff without renewal → UNKNOWN; cutoff day → known; later initial registration → known; earlier registration plus explicit qualifying renewal → that renewal; invalid input → UNKNOWN.
6. Legacy MATE row is replaced by one federal row; only a record yields MET; uncertain/nonregistrant cases are distinct.
7. Two licenses show the same federal status while the aggregate adds eight once, with one federal-record read.
8. Both actual pages render the exact same approved sentence, without old contradictory deadline copy.
9. Mobile DEA scan uses the shared quota, persists clean usage, does not create training evidence, and does not overwrite initial registration from a renewal issue date.
10. Failed DEA extraction releases its lease; quota denial/foreign license avoids AI.
11. Attestation upserts the user record and mirrors legacy flags; withdrawal clears both.
12. Legacy license-create attestation also writes the federal record.
13. Impossible dates and foreign evidence are rejected without changing the record.
14. Legacy issue/expiry data alone stays UNKNOWN and cannot produce all-compliant.
15. Missing federal context cannot silently ignore a legacy MATE row.
16. Calendar-overflow dates cannot normalize into a known deadline.
17. Explicit first qualifying event saves at user scope and uses the shared deadline function.
18. A state topic merely mentioning MATE overlap remains a state requirement.

### scripts/test-migrations.js — 3 added check groups, 8 retained

- Runs the actual tagged conditional quota SQL: reservation saturation, clean-slot replacement, failed/expired release, ten-attempt backstop, ungated bypass and monotonic counters. Uses fixed synthetic timestamps to avoid host-timezone-dependent fixtures.
- Runs the actual delivery claim SQL: preserves legacy SENT/timestamps/cycle keys; rejects duplicate/live concurrent claims; retries FAILED/stale PENDING; caps five attempts.
- Populated federal migration: two old flags become one record with unknown date/basis preserved; confirmed evidence/date survives; registration-only user gets no training row; unique user constraint holds; all old license/state-fact rows remain byte-for-byte equivalent; deleting evidence retains attestation.

## Additional findings / own diff review

- **Least confidence: live service and concurrency behavior.** PostgreSQL SQL tests and route mocks cover the intended transaction boundaries, but do not prove a real Prisma connection pool's race behavior, browser hydration/camera codecs, Vercel stream/proxy behavior, private-store configuration, or provider delivery timing. A real browser session and socket-backed populated sandbox were unavailable under this run's limits. No live test is claimed.
- **Legacy DEA date ambiguity is real.** Old schema prose said original registration while old UI/extraction accepted recent renewal dates. Using that field would make a confidently wrong first-event deadline. The separate confirmed event and UNKNOWN fallback deliberately require users with unverified history to answer.
- **One federal record affects overall status even if state gaps are zero.** Federal status has its own row/link and does not inflate state-renewal pace. Existing users without an applicability answer/record may now see Needs your answer; treating silence as exemption would be a false compliance claim.
- **Delivery is not exactly once across services.** SENT prevents ordinary duplicates, and database claims serialize workers. Provider acceptance followed by a DB failure/crash can still cause retry delivery. The implementation does not claim a distributed transaction. Old pre-send log ambiguity also remains visible in the migration/documentation.
- **Transport lifecycle limits remain explicit.** In-process rate limiting is per instance. Direct uploads abandoned before POST and expired generated archives can leave private objects for a later reconciler. A killed function can leave temporary inputs until the runtime filesystem is recycled; normal completion, cancellation and errors clean them. The 256 MiB temporary-input ceiling is an explicit export error, not a silently incomplete package.
- **Existing JSZip streams use an older Node stream interface.** The added large-export test exposed missing async iteration; wrapping the ZIP in a native Readable fixed the actual Blob boundary. Cancellation also destroys ZIP/input streams. The small actual-ZIP manifest tests still pass.
- **No new state-to-federal hour inference.** Ordinary SUD certificates do not make a federal record. Federal attestation does not award general CME hours or automatically satisfy separate state topic rules. Existing human-reviewed state/catalog files were not changed.

## Dependencies to install

None. Existing @vercel/blob, JSZip, Zod, Prisma and Vitest are sufficient; no manifest/lockfile change.

## Handoff

Decisions and configuration: `docs/run-c-decisions.md`. Data provenance: `FACT-QUESTIONS-C.md`. Exact whole-file groups and conventional commit bodies: `COMMIT-PLAN-C.md`.

**Three new migrations need populated-sandbox reconciliation before rollout.** Claude owns that step and the subsequent gated local commits. This session created no commits and performed no push. Stop point: requested local code, tests, reports and commit plan delivered.
