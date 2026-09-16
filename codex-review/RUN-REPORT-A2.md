# Run A2 — follow-up report

Date: September 16, 2026. Branch: `fix/astra-a-trust-core`, existing HEAD `71a101e`. **Code changes are complete; the run is partial because local commits and populated-sandbox reconciliation are blocked by environment permissions.** Nothing was pushed or deployed, no branch was created/switched, and no application database was changed.

Read `AGENTS.md`, `CLAUDE.md`, `RUN-REPORT-A.md`, and `MIGRATION-REPAIR-A.md` first, plus the installed Next.js fetching-data and route-handler guides. The required `git fetch origin main` failed writing `.git/FETCH_HEAD`; main was not checked out, merged, rebased, or pushed. Work proceeded from the specified existing follow-up branch.

## Changes by review item

### Review #A2-1 — preserve verified cadences

- When source cadence is absent/incomplete and a matching row exists, `sourceRows()` retains its cadence, intervalYears, lookbackYears, firstRenewalOnly, attestationAllowed and notes verbatim. No UNVERIFIED-CADENCE prefix is added. Missing-source questions still go through the existing fact-question logger.
- New requirements without explicit cadence alone receive CONDITIONAL plus the unverified marker. Explicit cadence replaces a prior unverified marker. Direct planner input silent on cadence cannot change the protected fields.
- Added shared `--allow-remote` handling: default refusal, credential-free target-host logging, and a mandatory matching dry-run plan for remote apply. Sync dry-run uses the existing offline `--existing` snapshot; `--plan=<file>` saves the full plan, license scope and SHA-256 source checksum. Apply rejects changed source or license scope before constructing Prisma. The checksum covers the TypeScript source, source loader, planner and sync entrypoint.
- The MD and legacy verified-MD wrappers already forward CLI arguments to the common entrypoint, so they inherit the guard without separate duplicated logic. The seed's hard localhost refusal remains untouched.
- Transcribed 28 matched MD cadence records from the deleted script at `c367a36`, using its literal values and deterministic `req()` defaults. Only cadence/intervalYears metadata is installed; original notes/hours/topic text remain intact. Inherited DO entries in CT/MA/KY explicitly exclude this MD-only metadata. Runtime comparison against HEAD proves every original source field and every DO entry unchanged.
- The exact list and historical notes are below and in `FACT-QUESTIONS-A.md`, under **Transcribed cadences — re-confirm**. UT MD suicide prevention has no current match and was not reintroduced.

Sync operator workflow (not executed against any database here): dry-run with `--license=MD --existing=<snapshot.json> --plan=<plan.json>`; apply with the reviewed `--plan=<plan.json>`. A nonlocal DATABASE_URL also requires `--allow-remote`. The reviewed snapshot must represent the intended target. Sync's requested source-checksum gate does not independently guarantee that the target database still equals that snapshot; the apply path reads current rows transactionally per state.

### Review #A2-2 — portable requirement identity backfill

- Old unpublished identity migration now only adds nullable key and retirement columns.
- New description-keyed mapping preserves the same eight approved decisions without environment IDs.
- New backfill supports inventory, full default dry-run, explicit apply, collision/stale-mapping/duplicate checks, table locks, and a single serializable transaction. Only requirementKey is written. Remote apply requires `--allow-remote` and a reviewed plan whose checksum includes script, current row identities and mapping. The selected schema is set explicitly from the validated URL.
- Added `20260916090000_requirement_key_constraints`; its header requires the backfill first and NULLs/duplicates abort the transaction.
- Updated SQL integration tests to exercise the three-step structure and all five prior cases, using different environment IDs and checking a repeat backfill.
- **Blocked:** local database connection returned EPERM, and `npm run db:local -- migrate status` failed opening the local shadow listener with EPERM. The new constraints SQL is a draft tested in in-memory PostgreSQL, not generated/applied with `migrate dev` in the populated sandbox. No reset, migration resolve, ledger edit, backfill, constraint application, or production operation occurred.
- `MIGRATION-REPAIR-A2.md` records exact attempted steps and the remaining local workflow. The original private backup was located but could not be compared against an inaccessible database. Current clean status/diff, all 16 original tables unchanged, and eight present keys therefore remain **unverified for A2**. `// ASTRA-TODO(A2-2)` records this in the backfill script.

### Review #A2-3 — NV DO psychiatry-only filter

- Added optional practice context to LicenseInput and a small adapter helper implementing the old route's per-field `license value ?? profile value ?? ""` fallback. Empty license strings deliberately retain their old behavior.
- Dashboard (including missing-rule adapter calls), compliance page, API, snapshot and audit export load profile specialty/practiceArea and pass resolved context. Snapshot also supplies the existing notification/push consumers. API loading stays after mobile-or-session user resolution.
- Restored exactly the predicate found in `c367a36:app/api/compliance/route.ts`: NV + DO + CULTURAL_COMPETENCY + description/notes containing `psychiat`, with no `psychiat` in resolved specialty/practiceArea. The engine returns NOT_APPLICABLE, zero gap, and the reason `psychiatry-only requirement; not your specialty`.
- Compliance detail renders that reason instead of claiming the physician manually marked it not applicable. Other manual N/A copy remains unchanged.
- The certificate-library direct engine invocation evaluates no mandatory requirements and needs no specialty lookup; all actual requirement-evaluating surfaces are covered.

## Exact transcribed values (pending Vera/Roz re-confirmation)

The table includes the old script's notes verbatim for review. Notes were **not** copied over existing source text. `null (omitted)` means no intervalYears field was added.

| State | Matching MD source topic | Cadence | intervalYears | Deleted-script notes (verbatim) |
| --- | --- | --- | --- | --- |
| CT | Infectious diseases / HIV | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Risk management | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Sexual assault | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Domestic violence | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Cultural competency | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Behavioral health | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| MA | Risk management | EVERY_RENEWAL | null (omitted) | Required each renewal cycle. |
| MA | Board regulations review | EVERY_RENEWAL | null (omitted) | Required each renewal cycle. |
| MA | Opioid education and pain management | EVERY_RENEWAL | null (omitted) | Required each renewal cycle if prescribing controlled substances. |
| MA | Implicit bias in health care | ONE_TIME | null (omitted) | One-time if not completed previously. |
| MA | End-of-life care | ONE_TIME | null (omitted) | null |
| MA | Child abuse recognition and reporting | ONE_TIME | null (omitted) | One-time training; no fixed CME hour value in ClearCME rule data. |
| MA | Domestic and sexual violence | ONE_TIME | null (omitted) | One-time training; no fixed CME hour value in ClearCME rule data. |
| MA | Alzheimer's disease / dementias | ONE_TIME | null (omitted) | If serving adult populations and not previously completed. |
| MA | EHR proficiency | ONE_TIME | null (omitted) | Course or demonstration-of-proficiency pathway may satisfy. |
| MA | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| UT | Controlled substance prescribing | EVERY_RENEWAL | null (omitted) | Required every renewal if prescribing controlled substances. |
| UT | SBIRT | ONE_TIME | null (omitted) | One-time beginning after Jan. 1, 2024; satisfies controlled-substance CE for the cycle taken. |
| UT | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| WV | Risk assessment and responsible prescribing / controlled substances | EVERY_RENEWAL | null (omitted) | For 2026 renewal if prescribing, administering, or dispensing controlled substances in WV; post-2026 becomes initial-license/one-time logic for new prescribers/dispensers. |
| WV | Nutrition education | CONDITIONAL | null (omitted) | HB 4951 effective June 12, 2026; board implementation/hour details pending. |
| WV | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| KY | KASPER / pain management / addiction | EVERY_N_YEARS | 3 | Every 3-year CME cycle if authorized to prescribe or dispense controlled substances. |
| KY | Addiction medicine | EVERY_N_YEARS | 3 | Every 3-year CME cycle if DEA-licensed to prescribe buprenorphine. |
| KY | Domestic violence | EVERY_N_YEARS | 3 | Within 3 years if primary care physician. |
| KY | Pediatric abusive head trauma | EVERY_N_YEARS | 5 | Within 5 years for EM, FM, pediatrics, radiology, urgent care. |
| KY | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |


Unmatched: UT MD `Suicide prevention training`, `EVERY_RENEWAL`, intervalYears null, notes `Required every renewal.` No unambiguous current source entry exists; no entry was added.

## Deliberate limits and additional findings

- **KY conflict:** the authorized historic Domestic violence cadence is EVERY_N_YEARS/3, while current source prose explicitly says one-time, not recurring. Transcribed only the authorized fields; preserved current prose and queued the conflict in FACT-QUESTIONS-A.md. Re-confirm before applying sync. No regulatory conclusion was inferred.
- **WV conflict:** historic prescribing notes predict a post-2026 sunset; current verified prose says recurring. Preserved current notes, transcribed EVERY_RENEWAL, and recorded the obsolete notes for the fleet.
- **DO inheritance:** three affected states inherit the MD seed; unguarded transcription would have silently assigned MD cadence metadata to DO. The narrow exclusion preserves their previous output exactly.
- Current source topic-to-enum mapping and hours parsing remain as before. No unrelated classification changes, total-hour edits, old-row removals, or course changes were made.
- Existing keyword topic flags remain suggestions; no grandfathering or confirm-all prompt was introduced. The token-query session route remains 410; verified-email linking is untouched.
- No dependency changes, external service calls, production environment reads, or remote database scripts. No live sync was run. Existing historical reports are retained as history, not rewritten as A2 verification.

## Tests added or replaced and what each proves

Final mandatory gate: **TypeScript PASS; lint PASS; 131 Vitest tests PASS across 13 files.** `npm run test:migrations`: **five cases PASS**, including all 15 migrations from empty. `git diff --check`: PASS.

### `tests/lib-rule-sync.test.ts`

Replaced the old missing-cadence test, which expected the defective behavior, with four regressions:

1. Missing source cadence preserves all six existing fields (EVERY_N_YEARS/6 fixture), logs a question, and emits zero writes.
2. Planner-level source silence ignores attempted changes to protected cadence fields.
3. A genuinely new missing-cadence topic creates CONDITIONAL with UNVERIFIED-CADENCE.
4. Explicit cadence replaces an unverified cadence, removes the notes prefix, sets intervalYears, and yields no writes on the next plan.

### `tests/reviewed-db-plan.test.ts`

1. Nonlocal targets require opt-in; only the host is logged; localhost passes; query-parameter host redirection fails.
2. Apply requires a saved dry-run plan with matching source checksum and license scope; missing plans, changed source, wrong scope and non-dry-run files fail.

### `tests/backfill-requirement-keys.test.ts`

1. Inventory includes every collision; dry-run includes every proposed row/key and unresolved groups.
2. Description mapping succeeds with different row IDs and parent-rule IDs.
3. Duplicate computed keys and stale mapping entries block application.
4. Identical-description siblings remain ambiguous and cannot be resolved by inventing a discriminator.
5. A simulated second-write failure rolls back after the first write and never commits.
6. Changed identities/mapping invalidate the checksum; already-backfilled current keys permit idempotent reapplication.
7. Review-checksum rejection rolls back the locked transaction before any UPDATE.

### `tests/lib/compliance-engine.test.ts`

One compound regression tests the exact specialty predicate: NV DO EM becomes NOT_APPLICABLE with the required reason; psychiatry specialty or practice area evaluates normally; CA, NV MD and non-psychiatry cultural text remain normal; matching notes alone trigger the same predicate.

### `tests/app/api/compliance-surfaces.test.ts`

Four tests each exercise the real API handler, email snapshot and actual generated ZIP through mocked boundaries:

1. License EM specialty overrides a psychiatrist profile.
2. Null license specialty falls back to psychiatrist profile.
3. Null license practice area falls back independently to profile practice area.
4. Empty license fields do not fall back to the profile.

The tests also assert that profile queries select both fields.

### `tests/app/dashboard/status-render.test.ts`

Four rendering tests: dashboard EM, dashboard psychiatrist, compliance EM, compliance psychiatrist. They verify license-first behavior, profile fallback, the displayed status, profile field loading, and the EM exclusion reason on compliance detail.

### `scripts/test-migrations.js`

All five retained SQL cases: empty replay; missing-backfill/unapproved-collision rollback; stale mapping rollback; all eight mapped identities preserve non-key fields and linked completions across different IDs plus idempotent reapplication; unchanged historical certificate suggestion/provenance migration. No network or environment file is used by this command.

### Additional executed verification

Compared runtime STATE_REQUIREMENTS before/after through the installed TypeScript transpiler: exactly 28 authorized MD metadata additions, all original MD values equal, and every one of the 51 DO entries equal. No local database claim is inferred from this source comparison.

## Commit status and intended separation

**No A2 commits were created.** After a successful full commit gate, `git add` failed creating `.git/index.lock` with `Operation not permitted`; `git commit` was not reached. The session grants `.git` read-only access and does not permit approval escalation. All changes remain in the working tree on the original branch. No push was attempted.

The requested separate commits still need to be made, with a fresh full gate before each:

1. `fix: preserve verified cadence during rule sync` — sync/planner/shared plan guard and their tests. Body: why protected fields and reviewed remote plans are required; Review #A2-1.
2. `compliance: CT/MA/UT/WV/KY MD explicit cadence transcribed from sync-verified-md-rules.js @c367a36 (pending Vera/Roz re-confirmation)` — only source metadata/DO inheritance protection and FACT-QUESTIONS-A.md. Body: authorized literal transcription, no existing fact fields overwritten; Review #A2-1.
3. `fix: separate requirement identity backfill from schema migrations` — migrations, portable mapping, backfill, unit/SQL tests, MIGRATION-REPAIR-A2.md. Body: eliminate sandbox-ID coupling, enforce atomic portable mapping, explicitly state remaining local verification; Review #A2-2.
4. `fix: restore NV DO psychiatry specialty applicability` — engine, adapters, call sites and surface tests. Body: restore old predicate and profile fallback; Review #A2-3.
5. `chore: document A2 validation and execution blockers` — this report. Body: completed checks and outstanding environment-limited steps; Review #A2-1/#A2-2/#A2-3.

## Own diff review / least confidence

The code paths and in-memory migration behavior are covered, and the unchanged NV golden snapshot still passes. My main uncertainty is the inaccessible populated sandbox: the old finished migration's checksum now differs, the new constraint migration is pending, and history needs deliberate reconciliation without resetting or replaying historical data changes. Do not mistake the green offline checks for completed sandbox repair or deployment readiness.

The historic KY cadence/current-prose contradiction is the other material review item. Its transcription was explicitly requested; the fact itself remains pending re-confirmation. The remote apply path is boundary-tested without any live database access. Source plans require current source checksums, but sync does not freeze the target inventory between dry-run and apply. The specialty filter intentionally preserves the exact old substring predicate, including how missing and empty profile fields behave.

Stop point: all authorized work possible within this session's filesystem/network permissions is in the working tree. A2's definition of done remains unmet specifically for local commits, populated-sandbox migration reconciliation, current status/diff, and the 16-table backup comparison.

## Sandbox reconciliation and commits (Claude, 2026-09-16, outside the Codex sandbox)

The populated local sandbox already carried the columns, NOT NULL constraint, and unique index from the pre-rewrite identity migration, and all 83 rows had keys with zero NULLs. Because the rewritten pair (nullable columns + separate constraints migration) yields the identical final schema, the ledger was reconciled without replaying SQL: the `20260910060000_requirement_identity_retirement` row's checksum was updated to the rewritten file's SHA-256, and `20260916090000_requirement_key_constraints` was registered with `prisma migrate resolve --applied` through the local runner. Result: `migrate status` reports 15 migrations, database up to date; `migrate diff --from-config-datasource --to-schema` reports no difference; backfill dry-run against the sandbox reports no writes. No application row was modified. Commits below were created by Claude from the working tree Astra left, in the separation Astra requested, after the full gate passed.
