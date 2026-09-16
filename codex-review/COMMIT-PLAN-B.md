# Run B — intended local commits

No commits or Git writes were attempted in this session. Stay on `fix/astra-b-billing-and-certificates`; do not fetch, switch/rebase onto main, or push during this handoff. The post-run owner controls any later push/PR.

Before **each** actual commit, run `npx tsc --noEmit && npm run lint && npx vitest run`. Also run `npm run test:migrations` for the migration commits and at the end. Regenerate the Prisma client against the staged schema as needed, using the local-only workflow. Draft migrations are not applied; reconcile the populated sandbox separately.

Several files contain B2 and B3 hunks. The exact paths below intentionally recur: stage only the described concern, not the entire final file on its first appearance. The final tree is gated; intermediate trees must be gated independently after selective staging. Tests in step 7 depend on both certificate concerns, so keep them for that step. No prototype-ignore commit is needed because main already contains the required ignore.

## 1. `fix: preserve Stripe price history and bound payment grace`

Body:

```
Persist historical price tiers and billing anomalies so price rotations cannot silently remove founding entitlements. Serialize and deduplicate webhook effects by Stripe identity, guard older subscriptions, and direct existing paid subscriptions to the portal. Enforce the 14-day failed-payment deadline on reads across all tier consumers.

Review #7. Adds draft billing SQL; no migration or live billing action was performed.
```

Exact file list:

- `lib/stripe.ts`
- `lib/entitlements.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/stripe/checkout/route.ts`
- `app/dashboard/compliance/page.tsx`
- `app/dashboard/settings/page.tsx`
- `prisma/schema.prisma` — Subscription fields and three billing models only
- `prisma/migrations/20260916100000_billing_integrity/migration.sql`
- `tests/helpers/prisma-mock.ts` — billing models and raw-query mock (shared transaction-test support)
- `tests/app/api/stripe/billing.test.ts`
- `docs/billing.md`

## 2. `chore: add certificate integrity and storage schema`

Body:

```
Add earned/maximum hours, duplicate-review metadata, and explicit original-document storage state. Reuse fileHash with per-user uniqueness and refuse unresolved historical hash collisions without changing evidence. Preserve all existing hour values.

Review #5 and Review #6. These SQL migrations are verified offline, not applied.
```

Exact file list:

- `prisma/schema.prisma` — remaining Certificate fields, enum, and indexes
- `prisma/migrations/20260916101000_certificate_integrity/migration.sql`
- `prisma/migrations/20260916102000_certificate_storage_status/migration.sql`
- `scripts/test-migrations.js`

## 3. `fix: retain and recover certificate originals`

Body:

```
Reserve certificate identity before storing the original, retain extraction after storage failure, and expose reattachment for review-needed rows. Validate known hashes and clean up failed writes. Delete the blob before the row and record the missing original when row deletion fails; show deletion errors to the user.

Review #6. Keep the legacy file URL and both authentication paths working.
```

Exact file list:

- `lib/certificate-duplicates.ts` — initially only the Prisma import and `lockCertificateUser` helper; fingerprint lookup is step 4
- `lib/certificate-storage.ts` — storage/delete helpers without the merge option/branch (added in step 4)
- `app/api/certificates/route.ts` — original-storage import, reserve-before-put, STORE_FAILED initial state, unique-race 409 handling; leave extraction/validation changes for step 4
- `app/api/certificates/[id]/route.ts` — DELETE/auth/storage failure handling; leave existing PATCH until step 4
- `app/api/certificates/[id]/file/route.ts`
- `app/api/certificates/[id]/reattach/route.ts`
- `components/CertificateList.tsx` — reattach URL/label and availability during review only
- `components/DeleteCertButton.tsx`
- `app/dashboard/page.tsx`

## 4. `fix: validate earned CME hours and resolve duplicate activities`

Body:

```
Separate participant-earned hours from activity maximums and validate extracted/manual fields at runtime. Fingerprint activity metadata, hold unresolved duplicates as uncertain evidence, and provide keep-both/merge resolution without losing the only original. Recompute topic suggestions after edits while retaining explicit confirmations and Counts for badges.

Review #5. Reuse the existing fileHash and creditHours compatibility fields; no compliance facts or historical hour values change.
```

Exact file list:

- `lib/certificate-validation.ts`
- `lib/certificate-duplicates.ts` — remaining fingerprint/legacy metadata lookup
- `lib/certificate-storage.ts` — merge option/branch, including retained-original transfer
- `lib/compliance-engine.ts`
- `app/api/certificates/route.ts` — remaining extraction, validation, and duplicate changes
- `app/api/certificates/[id]/route.ts` — remaining PATCH/validation/duplicate-resolution changes
- `app/api/certificates/cebroker-export/route.ts`
- `app/api/certificates/export/route.ts`
- `components/CertificateList.tsx` — remaining validation/max hint/duplicate UI changes
- `components/ManualCertificateEntry.tsx`

## 5. `fix: report actual original retrieval in audit exports`

Body:

```
Base fileStored on successful retrieval during this export, include a missing-original list and machine-readable manifest, and prevent identical title/date filenames from overwriting one another. Include duplicate-review state alongside the shared evaluator results.

Review #6, with Review #5 duplicate metadata.
```

Exact file list:

- `app/api/audit-export/route.ts`

## 6. `chore: stage privacy extraction wording for Michael review`

Body:

```
Propose plain-language Anthropic extraction, patient-information, and certificate deletion wording inside a non-rendering PRIVACY-COPY-PENDING-MICHAEL comment. Michael must approve before it is enabled; no other privacy copy changes.

Review #6.
```

Exact file list:

- `app/privacy/page.tsx`

## 7. `test: cover certificate integrity and retention failures`

Body:

```
Exercise the actual upload/edit/delete/reattach/export handlers with mocked external boundaries, including earned-versus-maximum fixtures, duplicate exclusion/resolution, storage failures and truthful ZIP manifests. Render the existing badges/topic confirmation alongside recovery controls and verify pending privacy copy stays hidden.

Review #5 and Review #6. Billing regressions are included with the billing implementation; migration checks are included with the schema change.
```

Exact file list:

- `tests/app/api/certificates/integrity.test.ts`
- `tests/app/dashboard/certificate-integrity-render.test.ts`

## 8. `chore: document Run B verification and handoff`

Body:

```
Record per-item changes, all new tests, green offline gates, deliberate exclusions, and remaining populated-sandbox/privacy review work. Document the distributed storage and billing-policy limits without claiming deployment or migration application.

Review #7, Review #5, and Review #6.
```

Exact file list:

- `codex-review/RUN-REPORT-B.md`
- `codex-review/COMMIT-PLAN-B.md`

After selective staging, verify that every final changed/untracked path is accounted for and that no compliance data, dependency file, environment file, generated client, or prototype file enters a commit. The current final tree has 195 passing tests and all 18 migrations replay successfully in the offline harness.
