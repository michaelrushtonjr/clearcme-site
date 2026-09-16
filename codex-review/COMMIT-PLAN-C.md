# Run C — local commit plan

No commits were attempted or created in this session. Stay on `fix/astra-c-transport-reminders-dea`; do not change main or push. Claude owns the later commits and populated-sandbox reconciliation.

Run `npx tsc --noEmit && npm run lint && npx vitest run && npm run test:migrations` with the complete Run C working tree before **every** commit. Stage exactly the whole files below; no hunk splitting. The shared schema and cross-item consumer files make these review groups dependent: the verified gate applies to the complete working tree, not isolated intermediate commits. Keep all groups together for branch review; no intermediate rollout is claimed. In particular, the schema introduces required EmailLog fields before the later reminder group, and archive/profile consumers reference the later federal group.

The single schema file contains all three models, so its foundation commit necessarily cites all three review items. Shared consumer files belong to one group only. No dependency installation or separate ESLint-ignore commit is needed.

## 1. refactor: add persistence for Run C operations

Commit body:

Add extraction leases, durable delivery state and the single federal training record without changing verified state or course facts. Keep legacy fields readable and preserve historical dedupe protection. These shared schema foundations serve Review #8, Review #9 and Review #10; populated-sandbox reconciliation remains required.

Exact whole-file list:

- `prisma/schema.prisma`
- `prisma/migrations/20260916110000_extraction_reservations/migration.sql`
- `prisma/migrations/20260916111000_email_delivery/migration.sql`
- `prisma/migrations/20260916112000_federal_training/migration.sql`
- `tests/helpers/prisma-mock.ts`

## 2. fix: reserve extraction quotas before concurrent scans

Commit body:

Lock the user row and atomically reserve scan capacity before extraction so concurrent requests cannot reuse the final free slot. Keep lifetime counters monotonic, release failed scan leases and retain a recoverable lease after worker termination. Add the requested per-instance rate limit and its KV follow-up. Review #8.

Exact whole-file list:

- `lib/entitlements.ts`
- `lib/upload-rate-limit.ts`
- `tests/lib/extraction-quota.test.ts`

## 3. fix: upload certificates directly to private blob

Commit body:

Scope private client uploads to the authenticated user, verify the uploaded SHA-256, and converge on Run B reservation/extraction logic. Resize photos, preserve a bounded multipart fallback and abort oversized PDF decompression into manual review. Review #8.

Exact whole-file list:

- `app/api/certificates/route.ts`
- `app/api/certificates/upload-token/route.ts`
- `app/dashboard/upload/page.tsx`
- `components/CertificateUpload.tsx`
- `components/MobileCameraUpload.tsx`
- `lib/certificate-storage.ts`
- `lib/certificate-upload-blob.ts`
- `lib/certificate-upload-client.ts`
- `lib/upload-limits.ts`
- `lib/bounded-inflate.ts`
- `tests/app/api/certificates/token.test.ts`

## 4. fix: stream audit archives with expiring private downloads

Commit body:

Stream verified originals through JSZip without buffering the archive, preserve truthful inclusion manifests and send large archives through short-lived authenticated private downloads. Extend transport and certificate integrity regressions across the upload/export boundaries. Review #8.

Exact whole-file list:

- `app/api/audit-export/route.ts`
- `app/api/audit-export/download/route.ts`
- `components/dashboard/AuditExportButton.tsx`
- `lib/audit-export-storage.ts`
- `tests/app/api/certificates/audit-download.test.ts`
- `tests/app/api/certificates/integrity.test.ts`
- `tests/lib/transport.test.ts`

## 5. fix: share one federal MATE training record across licenses

Commit body:

Use one attested federal record and the approved shared deadline text across profile, public page, engine, notifications and exports. Keep uncertain legacy registration history unknown, preserve legacy read compatibility, and avoid adding the federal obligation to state pacing or totals repeatedly. DEA scans also use the shared extraction meter. Review #10 and the DEA boundary of Review #8.

Exact whole-file list:

- `app/api/compliance/route.ts`
- `app/api/dea-certificate/route.ts`
- `app/api/licenses/route.ts`
- `app/dashboard/compliance/page.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/profile/ProfileClient.tsx`
- `app/dashboard/profile/page.tsx`
- `app/mate-act/page.tsx`
- `app/page.tsx`
- `components/FederalTrainingForm.tsx`
- `components/FederalTrainingStatus.tsx`
- `components/MateActNotice.tsx`
- `lib/compliance-adapters.ts`
- `lib/compliance-engine.ts`
- `lib/compliance-snapshot.ts`
- `lib/federal-training.ts`
- `lib/mate-act.ts`
- `lib/next-action.ts`
- `lib/requirement-display.ts`
- `tests/app/api/compliance-surfaces.test.ts`
- `tests/app/dashboard/certificate-integrity-render.test.ts`
- `tests/app/dashboard/status-render.test.ts`
- `tests/app/api/dea/federal-training.test.ts`

## 6. fix: persist reminder delivery outcomes and retries

Commit body:

Replace exact-day delivery with stable renewal windows and durable pending/sent/failed claims. Retry failed or stale deliveries, use current engine output, expose failures through HTTP 500 and optional operator alerts, and retry monthly digests daily without ordinary duplicates. Keep federal status separate from state renewal instructions. Review #9; notification rendering also reflects Review #10.

Exact whole-file list:

- `.env.local.example`
- `app/api/cron/email-reminders/route.ts`
- `app/api/cron/monthly-digest/route.ts`
- `app/api/cron/renewal-reminders/route.ts`
- `lib/email.ts`
- `lib/email-delivery.ts`
- `vercel.json`
- `tests/app/api/cron/reminders.test.ts`
- `tests/lib/email-alert.test.ts`

## 7. test: verify Run C migrations and document handoff

Commit body:

Prove populated legacy backfills and the actual application quota/delivery SQL in offline PostgreSQL. Record Michael's decisions, the unresolved legacy date provenance, full verification evidence and exact whole-file commit groups. No production facts or services were changed. Review #8, Review #9 and Review #10.

Exact whole-file list:

- `scripts/test-migrations.js`
- `docs/run-c-decisions.md`
- `codex-review/FACT-QUESTIONS-C.md`
- `codex-review/RUN-REPORT-C.md`
- `codex-review/COMMIT-PLAN-C.md`

