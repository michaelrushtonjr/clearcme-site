# Run A migration repair — September 16, 2026

The local migration-history and duplicate-key blockers are resolved on `fix/astra-a-trust-core`. All 14 migrations are registered in the sandbox's `public` schema, both Run A migrations applied successfully through `prisma migrate dev`, and Prisma reports no schema difference. Nothing was pushed or deployed.

## What was wrong

1. The migration directory began in April with tables that depended on an earlier, unrecorded base schema. The sandbox had application tables but no migration ledger.
2. The direct local database URL did not supply an independent shadow database. PGlite's database-name/schema isolation does not provide a safe substitute for a separate server connection. It also retains `search_path` across socket clients. This caused misleading “already exists” and nonempty-schema errors during replay and registration.
3. The May completion migration used an index name longer than PostgreSQL's 63-byte limit. Its truncated name differed from the name Prisma expects today.
4. FL, LA, MI and NV each had two MD requirements classified as `OTHER_MANDATORY`. They were separate obligations with distinct descriptions, not redundant records to delete.

## Repair

- Generated `00000000000000_baseline` with `migrate dev` against an isolated local instance, using the schema at `7822bdd^` (before the first recorded migration). Existing historical SQL files remain unchanged.
- Generated the completion index rename through historical replay and made it accept a database whose index already has the expected name. It does not change the index columns or uniqueness rule.
- Added a local runner that reads `.env.local`, rejects remote/redirecting URLs and destructive commands, explicitly establishes the target search path, and supplies a disposable shadow server on another port. It uses the installed Prisma packages without upgrades. It never answers a reset prompt.
- Compared the reconstructed pre-Run-A migration history with the existing sandbox: **no difference**. Only then registered those already-present schema migrations using `migrate resolve --applied`. Their historical cadence/practice-context data backfills were not executed against existing records.
- Michael explicitly approved `requirement-key-resolution-a.json` in this task. The unpublished identity migration now applies exactly those eight description-based keys. It checks the original row ID, parent rule ID, state, license type, topic and description; a changed mapping or any unapproved shared-topic row fails before the backfill. The migration runs in a transaction.
- Applied the identity and certificate-eligibility migrations with `migrate dev`. No rule sync or legacy seed was run.

The mapping is structural only. In particular, preserving the old Nevada bioterrorism row is **not** a finding that it remains a valid requirement. Its compliance facts still require the existing verification process. No hours, cadence, topic, applicability permission, description, retirement flag, or completion link was altered.

## Verification

- All **83 requirements** now have nonempty unique keys; **zero collisions** remain.
- Compared all original columns and rows in the **16 original application tables** with a private pre-repair backup: **identical**. Only the intended new columns/defaults and migration ledger were added.
- All **14 migration checksums** match the checked-in SQL; all are finished and none failed.
- `migrate status`: database up to date. `migrate diff` against `schema.prisma`: no difference. Repeating the baseline helper safely reports already registered.
- **110 offline tests across 11 files**, TypeScript, lint, and the redacted secret scan passed.
- The separate SQL integration command replays all 14 migrations in an in-memory PGlite PostgreSQL engine. It proves five cases: empty replay; unknown-collision rollback; stale-mapping rollback; preservation of all eight identities and synthetic linked completions; historical certificate suggestions without invented extractor provenance. It loads no environment files and uses no network.
- The 17 new offline tests cover local hosts, remote and query-parameter redirection rejection, unsafe CLI commands and override rejection, separate shadow ports, ordinary dev arguments, and credential redaction.

Machine-readable local evidence is in `local-migration-verification-a.json`. The private backup is outside the repository in the temporary `clearcme-migration-repair-*` directory, with owner-only permissions; it contains local account/session data and must not be committed. Temporary investigation schemas were removed after confirming the original data was unchanged.

During isolated baseline generation, the bundled PGlite socket implementation also returned P1017 while probing a nonexistent migration ledger. Initializing an **empty** Prisma ledger in that disposable instance allowed `migrate dev` to generate/apply the baseline. No fictitious applied rows were inserted. The existing application database was baselined using Prisma's `resolve` command after schema comparison.

## Local commands

```sh
# Already completed on this sandbox; safe to repeat after registration.
npm run db:baseline-local

# Normal development operations now get a separate disposable shadow server.
npm run db:local -- migrate status
npm run db:local -- migrate dev --name your_change
npm run db:local -- migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code

# Additional isolated SQL tests, separate from the offline Vitest gate.
npm run test:migrations
```

The baseline helper intentionally refuses an existing schema that differs from reconstructed history, failed migrations, or mismatched checksums. It registers history; it cannot repair arbitrary data/schema drift. On a new populated environment, inspect the diff before deciding how to reconcile it. Do not reset the sandbox to silence a mismatch.

## Remaining work and review limits

- Production has not been inspected. Its operator must compare schema/history, review its own requirement identities, and register only migrations already represented there before deploying. The eight local row IDs are not a production inventory; unrecognized collisions continue to block. Prepending a baseline does **not** make an existing production ledger automatically ready for deployment.
- Cadence/category verification remains in `FACT-QUESTIONS-A.md`; none of the 339 missing cadence facts were guessed.
- The read-only native reference confirms the Apple bundle ID and Google iOS client ID. Both missing audience settings were added to `.env.local`, and their public configuration values are documented in `docs/mobile-auth.md`. Production settings and the native wrapper's exchange-code update/release remain outstanding; the iOS reference was not edited and no live sign-in was performed.
- Credential revocation still needs confirmation from the credential owner. Removing a literal and passing a scan cannot verify revocation.
- Run B still requires Run A review/merge and the retired Stripe `priceId:TIER` list. Run C requires B review/merge, an upload transport decision, and the verified MATE deadline wording. The standing instructions prohibit this task from merging or pushing.

My least confidence is the uninspected production state and native release coordination, rather than local migration execution. The original ten migration files were preserved; the two Run A drafts were unpublished when this task amended the identity migration. Do not edit these migration SQL files after applying them elsewhere.

References: Prisma's [baselining workflow](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) explains registering already-present changes, and its [shadow database documentation](https://docs.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database) describes replay and separation. Commands and configuration here were checked against the installed Prisma 7.6.0 CLI/types.
