# Run A — trust core repair report

Run date: September 10, 2026 (UTC); migration/configuration follow-up September 16, 2026. See [MIGRATION-REPAIR-A.md](MIGRATION-REPAIR-A.md) for the verified repair. Branch: `fix/astra-a-trust-core`. Started from fetched `origin/main` at `c367a36`; local `main` remains `2cb63b8`. All commits are local. Nothing was pushed, merged, deployed, or sent to another person.

## Result and rollout blockers

The Run A code and offline verification are complete, with **110 passing tests across 11 files**, a matching NV snapshot, TypeScript passing, and lint passing without warnings. The branch is **not ready to deploy** until the remaining production, fact-verification and native-release checks below are resolved. The local migration blockers have been repaired. Runs B and C were not started: they require the preceding merges and Michael's additional inputs.

1. **Local migration history repaired.** Reconstructed the missing base schema from Git, reconciled a truncated completion-index name, and added a local-only runner with a separate disposable shadow server and explicit search path. After a zero-difference comparison, registered existing history without replaying old data backfills. Both Run A migrations applied via `migrate dev`; all 14 migrations are finished, checksums match, and Prisma reports no schema difference. Production history has not been inspected or changed.
2. **Local requirement identities resolved with Michael's explicit approval.** The eight-row mapping for FL/LA/MI/NV MD preserves all IDs, facts and completion links. All 83 existing requirements have unique keys. The migration still rejects unapproved collisions and stale mappings atomically. Production's identities require a separate inventory. All original columns/rows in the 16 application tables match the pre-repair backup.
3. **339 source mandatory-topic entries lack explicit cadence.** The current source sync writes no inferred cadence: it uses the required CONDITIONAL/UNVERIFIED-CADENCE marker. The evaluator leaves those rows UNKNOWN even after an applicability answer until the source cadence is verified. No actual rule sync was executed. The 278 historical non-EVERY_RENEWAL regex results and category questions are in `FACT-QUESTIONS-A.md`.
4. **Native rollout coordination is required.** The local `APPLE_BUNDLE_ID` and `GOOGLE_IOS_CLIENT_ID` now match the read-only iOS reference. Verify production audiences and update the iOS web-view bridge before this server change ships. The read-only wrapper still uses the retired `?token=` flow. That flow now deliberately returns 410. Details are in `docs/mobile-auth.md`.
5. **Credential revocation remains Michael's action.** The embedded Railway password was removed from the seed, but revocation was not checked or performed and history was not rewritten.

## Changes by item

### A1 — offline harness

Added Vitest with the TypeScript `@/` alias, a shared mocked Prisma boundary, blocked fetch/HTTP/HTTPS/TCP boundaries, fixtures, and the requested `test` command. All five fixtures exist, including the two certificate fixtures reserved for Run B. The launcher had not installed dependencies or made the branch; I did both. Vitest 5 conflicted with the existing Node 20 types; a Vitest 4.1 install hit an npm resolver error. Pinning Vitest 4.0.18 avoided upgrading existing direct dependencies. Added Zod for the later validation work and Google Auth Library for A5. Regenerated the stale Prisma client locally.

The only baseline lint errors were the two documented prototype errors. The prescribed ignore was committed separately as `chore: ignore design prototype in lint`; the prototype was not edited.

### A2 — non-destructive rule sync

Added `requirementKey`, its compound uniqueness constraint, and `retiredAt`. The backfill derives the base key from state/license/topic, applies only the eight explicitly approved local discriminators, and fails loudly on any unapproved collision or stale mapping. Source siblings use description slugs; matching existing identities survive source additions/removals. `planSync` is pure and emits only creates, updates, and retires. Writes use one serializable transaction per state and upsert by the natural key. Existing completion IDs remain attached to the same requirement rows. Removed requirements are retired, never deleted; evaluation and applicability/settings queries exclude retired rows.

All three sync entrypoints now use the same verified TypeScript source and transactional writer. The legacy hand-maintained subset was removed as an alternative write path. Added only optional type fields to `lib/state-requirements.ts`; **none of its values changed**, and `lib/courses.ts` was not edited. Missing cadence retains existing attestation permission, retains existing interval/lookback information, and records the required unverified marker. Historical regex code lives only in an audit module and is never used by synchronization.

An exact offline diff needs an existing-state snapshot: `node scripts/sync-rules-from-source.js --dry-run --license=MD --existing=/path/to/rules.json`. The JSON is a `ComplianceRule[]` with `mandatoryRequirements`; `[]` means an explicitly empty baseline. No snapshot means the command refuses instead of pretending it knows database state. Tested MD and DO plans for all 51 jurisdictions with DATABASE_URL unset: 168 MD creates / 167 DO creates for an empty baseline, with variable-cycle Kansas skipped. Plans include rule and requirement diffs. No Prisma client is constructed in dry-run mode.

### A3 — one status evaluator

`evaluateLicense` and the surface adapters now drive the dashboard, compliance map, API, email snapshot, push reminders, audit ZIP, next-action recommendations, and the printable compliance report's status. UNKNOWN cannot produce the audit-ready claim. Unanswered conditional requirements stay unknown even with topic hours; expired lookback evidence is EXPIRED/ACTION_NEEDED; zero-hour rows require evidence; undated lookback evidence stays unknown; NEEDS_REVIEW hours are uncertain; Kansas/missing rules are NOT_COMPUTED. License-specific completions take precedence over global completions. Existing special-case fulfillment logic remains in the shared helper used only by the engine.

The ZIP contains `compliance.json` alongside the existing `Compliance_Summary.json`, with identical engine statuses and full evaluations. Dashboard and compliance page rendering is tested as well as their adapters. API, email snapshot, and actual ZIP generation have integration tests. No live delivery or blob retrieval was used.

### A4 — eligibility and topic attribution

Added empty-default `acceptedCreditTypes` without populating any state. Unspecified eligibility counts only the requested AMA PRA Category 1 / AOA Category 1-A fallback; other credit categories remain uncertain. The UI displays pending eligibility hours separately. The certificate library's “Counts for” badges now derive from the same counted-certificate IDs and cycle windows.

Added suggestions, explicit extractor provenance, and JSON hour allocations. Historical non-manually-verified flags become suggestions in the migration; extractor provenance is never invented for old records. New keyword-only matches do not count. Extractor-assigned flags require title/topic keyword evidence. Generic prescribing no longer implies opioids. Manual confirmation records explicit topic hours, rejects unknown topics/over-allocation, and does not certify an unreviewed extraction just because its topic was confirmed. Without an explicit split, a certificate contributes to the first confirmed topic only. Extractor flags and certificate-linked attestations share that same allocation, closing a second route to double counting.

The certificate row offers “Looks like it may count toward … — confirm?” with hour inputs. The confirmation PATCH supports both mobile bearer and web session authentication after user resolution. Certificate validation, earned-vs-maximum extraction, duplicate handling, and retention changes remain Run B work.

### A5 — mobile identity and session bridge

Google uses `OAuth2Client.verifyIdToken` with configured web/iOS audiences and strict boolean verified email. Apple already used JWKS verification, but had a hardcoded audience fallback and no verified-email linking check; it now requires the configured bundle audience, RS256, expiry, subject, issuer, and a verified email claim. Accounts resolve by provider subject first. Verified-email links and new user/account creation run transactionally; an existing different subject for that provider is rejected. The matching web OAuth linking path also checks verified email. Apple's cross-site cookie configuration is unchanged.

The bridge uses a POST Authorization header followed by a 32-byte, hashed, 60-second exchange code. Consumption and database-session creation share a transaction; concurrent/repeated consumption yields only one session. Cookies remain Auth.js database-session compatible. Legacy bearer URLs return 410 with a token-free log message. No new table is needed because this uses `VerificationToken`. Tests use locally signed RSA JWTs and mocked key retrieval, exercising the actual signature/audience/expiry verification code.

### A6 — embedded credential and scanner

Removed the seed's literal password and required environment configuration plus a localhost guard. Added `.gitleaks.toml` and a dependency-free redacting scanner exposed as `npm run secrets`; it is deliberately outside the mandatory gate. The current tracked-tree check passes. No files were deleted and no history was rewritten.

The whole working-tree sweep excluded `.git`, dependencies/build output, binary content, and `.env.prod*`. It checked the requested `.env.check` and `.env.vercel` files (both untracked). `droplet-state-backups/` and `ops/` do not exist in this checkout. There were 11 untracked hits, including 3 potential credential values; those files were not changed and their values were not copied. The production environment file was never read. The complete tracked-hit inventory follows; fingerprints are redacted SHA-256 prefixes, not credentials.

| File | Line | Kind | Fingerprint | Disposition |
| --- | --- | --- | --- | --- |
| `AGENTS.md` | 81 | database-url | `d3a667a35590` | Host/local/example reference; no credential value flagged |
| `AGENTS.md` | 82 | railway-host | `b1a88296f158` | Host/local/example reference; no credential value flagged |
| `scripts/apply-effective-dates.mjs` | 12 | database-url | `94faf8da6aeb` | Host/local/example reference; no credential value flagged |
| `scripts/seed-do-remaining-states.js` | 9 (before fix) | database-url | `67b05cb8f78b` | Removed from code; Michael must verify revocation |

## Additional findings and deliberate limits

- The fetched branch contained verified compliance/catalog updates after the reviewed `2cb63b8`; this work starts from `c367a36`, preserving those updates.
- The spec's PA child-abuse and TX trafficking concerns are present for both MD and DO: the old regex returned INITIAL_LICENSE_ONLY and FIRST_RENEWAL_ONLY respectively. NV MD suicide returned INITIAL_LICENSE_ONLY; NV DO suicide returned EVERY_N_YEARS. These are audit outputs, not proposed facts.
- September 16 follow-up: all 14 migrations now replay in an isolated in-memory PostgreSQL engine, and Prisma shadow replay plus application to the populated local sandbox succeed. This resolves the local prerequisite for later migration work; production still requires its own history/schema comparison.
- Raw legacy seeds other than the repaired sync entrypoints remain obsolete and may not supply the new required key. They must not be used to bypass the verified-source workflow.
- General certificate PATCH validation and the audit export's URL-based `fileStored` flag remain Run B items. No blob deletion, retention, Stripe, upload transport, reminder retry, or federal MATE data-model changes were attempted in Run A.
- September 16 follow-up used disposable Prisma dev instances and the verified `.env.local` localhost sandbox. Temporary investigation schemas were removed. The intended new columns and migration ledger are now applied; comparison with the backup confirms all pre-existing application fields and rows are unchanged.
- No browser session or live end-to-end sign-in was used. Server-rendered UI tests cover status language; visual/mobile interaction QA and an actual migration rollout remain review tasks.

## My diff review / least confidence

The local migration boundary is now verified through SQL replay, successful Prisma application, schema/checksum checks, and a complete before/after data comparison. Production state remains uninspected and must be reconciled independently before deployment. The cadence fallback is also deliberately conservative: after a sync, all 339 source requirements without explicit cadence remain unknown pending verification, which is a substantial visible change requiring the Vera/Roz queue to be addressed.

Topic allocation now shares one path for extracted flags and linked evidence. This is safer than counting the same hours twice, but legacy multi-topic records without recorded splits can show fewer fulfilled topics. Manual confirmations and migration-provided suggestions provide the repair path. Existing state-specific fulfillment exceptions were preserved rather than reinterpreted; independent regulatory verification remains outside this code repair.

Auth tests exercise actual local signatures, wrong audiences, expired tokens, linking behavior, and exchange races. They cannot validate production environment configuration or the native app release sequence. The old wrapper will intentionally fail its web-view bridge until updated. Automatic linking for verified third-party Google email follows the requested policy; Google notes that verified non-Gmail/non-Workspace addresses may warrant an additional ownership challenge, which is a future policy decision rather than silently changing the requested flow. See the official references in `docs/mobile-auth.md`.

## Every added test and what it proves

All cases below passed in the final recorded run. Test names describe the assertion; parameterized cases are listed individually so no fixture or surface is implicit. The golden snapshot records the full synthetic NV MD `LicenseEvaluation`.

### `tests/app/api/auth/mobile-exchange.test.ts`

- exchange stores only a hash and yields one HTTPS session; reuse is 401.
- concurrent redemption permits only one session.
- expired code returns 401.
- old JWT query bridge is 410 and never creates a session.
- exchange requires the Authorization header.

### `tests/app/api/auth/mobile-providers.test.ts`

- google: cryptographically valid token with wrong audience returns 401.
- google: expired signed token returns 401.
- google: unverified email returns 403 without linking.
- google: new user and provider account are created.
- google: verified existing email links without duplicate user.
- google: returning subject wins over an email lookup.
- google: conflicting linked subject cannot be taken over by email.
- apple: cryptographically valid token with wrong audience returns 401.
- apple: expired signed token returns 401.
- apple: unverified email returns 403 without linking.
- apple: new user and provider account are created.
- apple: verified existing email links without duplicate user.
- apple: returning subject wins over an email lookup.
- apple: conflicting linked subject cannot be taken over by email.
- web linking uses strict Google boolean / Apple boolean-or-string verification.

### `tests/app/api/certificates/confirmation.test.ts`

- confirmation stores explicit topic splits without certifying unreviewed extraction.
- overallocated topic hours fail without a write.

### `tests/app/api/compliance-surfaces.test.ts`

- API, email snapshot and actual ZIP preserve UNKNOWN.
- API, email snapshot and actual ZIP preserve EXPIRED.

### `tests/app/dashboard/status-render.test.ts`

- dashboard renders unanswered status without the audit-ready assertion.
- dashboard keeps Kansas visible as not computed.
- compliance renders unanswered status without the audit-ready assertion.
- compliance keeps Kansas visible as not computed.

### `tests/harness.test.ts`

- alias resolves to the offline Prisma mock and fixtures retain duplicate evidence.
- unmocked network access fails.

### `tests/lib-rule-sync.test.ts`

- non-destructive sync planner identical rerun emits zero writes.
- non-destructive sync planner removed source row retires its identity.
- non-destructive sync planner only create, update, retire operations exist, and duplicate identities fail loudly.
- non-destructive sync planner adding a sibling retains the existing requirement ID key.
- non-destructive sync planner missing cadence never uses prose to assert a renewal frequency.
- non-destructive sync planner sync writes and retirement use the same serializable transaction.
- description updates do not change an existing attestation permission.

### `tests/lib/certificate-topics.test.ts`

- topic suggestions: Responsible opioid prescribing.
- topic suggestions: Controlled-substance prescribing.
- topic suggestions: Pain management.
- topic suggestions: Implicit bias.
- topic suggestions: End-of-life care.
- topic suggestions: Domestic violence.
- topic suggestions: Child abuse recognition.
- topic suggestions: Elder abuse.
- topic suggestions: Human trafficking recognition.
- topic suggestions: Infection control.
- topic suggestions: Patient safety.
- topic suggestions: Medical ethics.
- topic suggestions: Cultural humility.
- topic suggestions: Substance use disorders.
- topic suggestions: Suicide prevention.
- topic suggestions: Safe antibiotic prescribing.
- topic suggestions: Prescribing insulin.
- topic suggestions: Cultural history of medicine.
- topic suggestions: Child development.
- topic suggestions: Traffic accident triage.
- extractor assignments require keyword evidence; suggestions alone are insufficient.
- unspecified categories count only AMA Category 1 / AOA 1-A; other hours are uncertain.
- explicit accepted types override the fallback.
- unrecorded manual multi-topic hours go to the first confirmed topic only.
- explicit splits count once and cannot exceed certificate hours.
- linked attestations cannot reuse the same certificate across different topics without a split.
- a confirmed certificate link and extracted flag share one topic allocation.

### `tests/lib/compliance-engine.test.ts`

- dashboard unanswered conditional is UNKNOWN, never audit-ready.
- dashboard expired attestation is EXPIRED and ACTION_NEEDED.
- dashboard zero hours without evidence stays unknown.
- dashboard NEEDS_REVIEW hours are uncertain.
- compliancePage unanswered conditional is UNKNOWN, never audit-ready.
- compliancePage expired attestation is EXPIRED and ACTION_NEEDED.
- compliancePage zero hours without evidence stays unknown.
- compliancePage NEEDS_REVIEW hours are uncertain.
- api unanswered conditional is UNKNOWN, never audit-ready.
- api expired attestation is EXPIRED and ACTION_NEEDED.
- api zero hours without evidence stays unknown.
- api NEEDS_REVIEW hours are uncertain.
- notification unanswered conditional is UNKNOWN, never audit-ready.
- notification expired attestation is EXPIRED and ACTION_NEEDED.
- notification zero hours without evidence stays unknown.
- notification NEEDS_REVIEW hours are uncertain.
- auditZip unanswered conditional is UNKNOWN, never audit-ready.
- auditZip expired attestation is EXPIRED and ACTION_NEEDED.
- auditZip zero hours without evidence stays unknown.
- auditZip NEEDS_REVIEW hours are uncertain.
- synthetic NV MD golden evaluation.
- Kansas and missing rules are NOT_COMPUTED.
- retirement preserves history without evaluating the retired requirement.
- unknown is retained even when another requirement is due and hours are full.
- next action asks for answers when hours gap is zero.
- a lookback requirement cannot be met by undated attestation.

### `tests/lib/secrets.test.ts`

- credential scan finds database, Stripe, Resend and Blob values without echoing secrets.
- local sandbox and placeholder values do not fail the future secrets gate.
- legacy seed requires the environment and guards the database hostname.

### September 16 migration checks

`tests/local-prisma.test.ts` adds 17 offline cases: three local hosts accepted; remote hosts, hostname suffix spoofing, unsupported protocol, two query-parameter redirects and malformed URLs rejected; deploy/reset/db-push and URL/config overrides rejected; ordinary development arguments accepted; shared shadow ports rejected before connection; and database URLs redacted from logs.

`npm run test:migrations` adds five isolated SQL checks: all 14 migrations replay from empty; unapproved collisions roll back; stale approved mappings roll back; all eight approved identities preserve existing fields and linked completions; and historical certificate suggestions do not invent extractor provenance. Details and local verification evidence are in `MIGRATION-REPAIR-A.md`.

## Handoff

Read this report, `MIGRATION-REPAIR-A.md`, `FACT-QUESTIONS-A.md`, and `docs/mobile-auth.md`. Local migration history and approved duplicate keys are resolved. Reconcile production history/identities independently, verify cadence/category facts, verify the Railway credential is revoked, and coordinate the native bridge configuration/release. Review the auth and compliance-engine diffs before any merge. No post-run push or PR creation was performed.
