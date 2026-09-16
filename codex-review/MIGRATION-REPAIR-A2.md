# A2 migration repair — blocked locally

Run: September 16, 2026. Branch: `fix/astra-a-trust-core`. **The sandbox reconciliation and current backup comparison are not complete.** No database row, constraint, or migration ledger was changed in this run.

## Exact steps attempted

1. Parsed `.env.local` with dotenv and passed its DATABASE_URL through `localDatabaseUrl()`; printed only `localhost:51214`. Never read `.env.prod` or connected to a remote database.
2. Attempted a read-only `pg.Client` connection (three-second connection timeout) to count `public."MandatoryRequirement"` rows. Connection failed with `EPERM` before any SQL ran.
3. Ran `npm run db:local -- migrate status`. The local runner could not open its disposable shadow listener: `listen EPERM: operation not permitted 127.0.0.1`.
4. Located the existing private backup via `/private/tmp/clearcme-repair-workdir`. Its `sandbox-before.json` remains outside the repository. No account/session data was printed or copied into this report.
5. Stopped database operations at the sandbox boundary. Did not reset, resolve, replay, seed, or manually edit the ledger. Did not run `migrate deploy`. `migrate diff` and the 16-table comparison remain unexecuted because local database sockets are denied.

## Checked-in changes

- Rewrote the unpublished `20260910060000_requirement_identity_retirement` migration to add only nullable `requirementKey TEXT` and `retiredAt TIMESTAMP(3)` columns.
- Moved the eight approved decisions into an environment-independent `state:licenseType:topic:description` → key object. No local row IDs or rule IDs remain in the mapping or migrations.
- Added `scripts/backfill-requirement-keys.js`. Default/`--dry-run` prints every row-to-key decision, collisions, unresolved collisions, invalid/duplicate computed keys, and stale mappings. `--inventory` requires no mapping. Apply locks the relevant tables in a serializable transaction, re-reads identities, validates the plan, then changes only `requirementKey`. Any failure rolls back.
- Added `20260916090000_requirement_key_constraints`. It requires the backfill first; NULLs or duplicate keys abort its transaction. This new SQL is a **draft verified in in-memory PostgreSQL**, not a migration generated/applied by `prisma migrate dev` in the populated sandbox; that required step is blocked by `EPERM`.
- `// ASTRA-TODO(A2-2)` in the backfill script tracks the unfinished sandbox work.

## Offline evidence (completed)

`npm run test:migrations` passes all five retained cases:

1. All 15 migrations replay from an empty in-memory PostgreSQL database.
2. Constraints reject NULL keys; unapproved collisions reject backfill atomically, keeping completion links.
3. Stale description mappings reject backfill atomically.
4. All eight approved decisions apply with deliberately different environment IDs, preserve all other requirement fields and synthetic completion links, accept the constraints, and reapply without writes.
5. Historical certificate suggestions still do not invent extractor provenance.

These tests do **not** establish the current state of the populated local sandbox. The earlier `local-migration-verification-a.json` is Run A evidence, not an A2 verification. Do not relabel its checksums as current.

## Remaining local steps (not executed)

Restore execution access to the existing `.env.local` sandbox, then inspect its schema and migration ledger before deciding how to reconcile the unpublished migration rewrite. Run A reports that the old migration already installed the columns, keys, NOT NULL constraint and unique index. Replaying the new nullable-column migration on top of that state would duplicate columns. A normal `migrate dev` may detect the changed checksum and suggest a reset; **do not reset**. No `resolve --rolled-back` was performed; do not assume it accepts a successfully finished migration or reverses SQL.

Preserve the existing application rows, keys, and completion links while reconciling that local-only history. Generate/verify the new constraints migration with `migrate dev` against the sandbox using the existing separate shadow runner. If constraints already match, register only changes that have been independently verified as present. The exact repair cannot be truthfully specified as completed without reading that ledger.

Once the nullable-column stage is represented and before installing constraints in an environment that lacks them, the local script sequence is:

```sh
env -u DATABASE_URL node --env-file=.env.local scripts/backfill-requirement-keys.js --inventory
env -u DATABASE_URL node --env-file=.env.local scripts/backfill-requirement-keys.js --dry-run --mapping=codex-review/requirement-key-resolution-a.json --plan=/private/tmp/requirement-keys-a2-plan.json
env -u DATABASE_URL node --env-file=.env.local scripts/backfill-requirement-keys.js --apply --mapping=codex-review/requirement-key-resolution-a.json --plan=/private/tmp/requirement-keys-a2-plan.json
```

The same mapping decisions are structural, not renewed approval of old compliance facts. Inspect the inventory for that environment. A changed identity or mapping invalidates the reviewed backfill plan. `--allow-remote` is an explicit future operator capability; no remote inventory or application occurred in A2.

Final required evidence: `migrate status` clean, `migrate diff` empty, every original column/row in the 16 tables equal to the private pre-repair backup, all eight description-mapped keys present, no NULL/duplicate keys, and every finished migration checksum equal to the corresponding file. Commit locally only after the full gate passes; do not push.

## Amendment (Claude, 2026-09-16): constraints migration is self-backfilling

`prisma migrate deploy` applies every pending migration in one pass, so a constraints migration that depends on a separately-run script would fail on first deploy. `20260916090000_requirement_key_constraints` now backfills NULL keys itself with the same deterministic rule the planner and backfill script use (`STATE:LICENSE:TOPIC`, plus `:slug(description)` when a topic repeats under one rule) and aborts atomically if two siblings would still share a key. `scripts/backfill-requirement-keys.js` remains an operator tool for inventory and for the rare identical-description case. Verified: `npm run test:migrations` (5 cases, including deterministic keys == the reviewed mapping), and a rehearsal against an in-memory copy of production's 102 rules / 318 requirements: 0 NULLs, 318 distinct keys, 36 slugged, no ambiguity. Production's collision groups (18: DC, DE, IL, KY, MA, MI, NV, PA, UT × MD/DO) differ entirely from the sandbox's 8, which is why an environment-specific mapping file was the wrong design.
