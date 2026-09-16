# Run C decisions and operating notes

Approved by Michael on September 16, 2026. Branch: `fix/astra-c-transport-reminders-dea`.

## Decision 1 — direct private Blob uploads

Use the installed `@vercel/blob` client SDK with `handleUpload` at `/api/certificates/upload-token`. Tokens authorize only the authenticated user's incoming pathname, PDF/JPEG/PNG, up to 10 MiB, no overwrite, and five minutes of validity. The client sets `access: "private"`; the installed handleUpload API has no access parameter, and the backing store must be private. See [Vercel client upload documentation](https://vercel.com/docs/vercel-blob/client-upload).

The browser downsizes images to a 2000 px long edge and JPEG quality 0.85 before computing SHA-256. The certificate POST reads the configured private store, verifies owner/path, size, MIME type, URL and hash, then uses the existing unique reservation/extraction/storage machinery. PDFs are unchanged. Hashes identify the bytes actually uploaded, including resized photos.

Multipart remains available to the native wrapper and browser fallback, bounded to 4 MiB to fit the server transport. A failed token/upload request falls back only for files under that bound. The final extraction POST is never automatically repeated via multipart after an ambiguous connection failure. DEA registration scans stay multipart, get the same image preparation and 4 MiB bound, and do not store registration documents.

Extraction attempts reserve a short database lease and atomically increment the lifetime attempt counter. A user row lock precedes the conditional UPDATE, so two workers cannot read the same available final slot. Clean outcomes increment the existing monotonic clean counter; failed/partial outcomes release only the lease. Two-minute leases recover capacity after a killed function. Outstanding leases occupy free clean slots; a competing scan receives 429, while exhausted lifetime quotas still receive 402. Paid/grandfathered users remain ungated and metered.

POST certificate and DEA uploads share a per-user 10/minute in-process limiter. `ASTRA-TODO(C-1)` records the need for KV to enforce this across Vercel instances. No distributed limiter is claimed.

ZIPs use JSZip's Node streaming API. Originals are spooled into a private temporary directory to verify inclusion before writing the manifests; lazy file streams permit repeated by-requirement/by-year entries without keeping originals or the ZIP in memory. Temporary input storage has a 256 MiB ceiling. Larger input sets fail explicitly. Exports estimated above 40 MiB, counting repeated folder entries, stream to a private blob; the response provides an authenticated, signed download URL valid for 15 minutes. The downloader checks ownership, expiry and current export entitlement and streams with no-store headers. No new dependency is required.

Follow-up: a lifecycle reconciler should remove abandoned `certificates/<user>/incoming/` objects and expired `audit-exports/` objects. Link expiry revokes application downloads, not the underlying private object. Existing authenticated certificate deletion continues to remove attached originals. No live Blob writes, lifecycle changes or cleanup were executed in this session.

## Decision 2 — approved MATE wording

Render the following verbatim on the profile page and `/mate-act` (supplied by Michael; regulatory wording is not inferred from model memory):

> One-time DEA requirement. Eight hours of training on treating and managing patients with opioid or other substance use disorders must be completed by the date of your first DEA registration or renewal on or after June 27, 2023. It is attested once and is not repeated at later renewals. Physicians board-certified in addiction medicine or addiction psychiatry (ABMS), and those who graduated from a U.S. medical school within five years of June 27, 2023 with the required curriculum, are deemed to have met it. — Source: DEA Diversion Control Division, MATE Act FAQ (https://www.deadiversion.usdoj.gov/faq/MATE_Act_faq.html).

[Primary source: DEA MATE Act FAQ](https://www.deadiversion.usdoj.gov/faq/MATE_Act_faq.html). Both pages use `MateActNotice`, which reads `mateActDeadline()` in `lib/mate-act.ts`. No alternative deadline sentence is generated from an expiration date. An initial registration before the cutoff, without the first qualifying renewal, returns UNKNOWN. Invalid dates do too.

`FederalTrainingRecord` is unique per user and holds the attestation, basis, optional actual completion date and certificate evidence, and notes. Completion date is nullable because older attestations did not record one; the migration never invents a completion date. The requested `GRADUATED_AFTER_2023` enum identifier is retained as an internal code; the UI describes the qualifying curriculum using the approved wording above.

The profile independently records DEA applicability and the physician-confirmed first qualifying event in `User.hasDeaRegistration` and `User.deaFirstQualifyingAt`. Legacy `deaRegisteredAt` was also filled from renewal certificate issue dates, so it is not authoritative for this deadline. Legacy issue/expiration dates remain readable; a DEA scan does not silently replace the first registration date or create a training record. See `codex-review/FACT-QUESTIONS-C.md`.

The migration merges explicit old `mateActCompleted = true` flags into one record per user, preserving an unknown basis as OTHER. Explicit certificate-linked MATE attestations retain their completion date and evidence link. A registration certificate or generic opioid course alone does not create a federal training record. Legacy fields remain readable and are mirrored on new attestations/withdrawals for one release. Remove them in a separately coordinated native/web follow-up.

The A3 engine evaluates one federal row, displayed on every license and excluded from state-renewal pacing and summed state gaps. User-level email totals add the federal gap once. Only the federal record can produce MET. A known registration without a confirmed event/attestation stays UNKNOWN. Old source rows explicitly named MATE Act are represented by this row; ordinary state requirements mentioning overlap remain state requirements. No state requirement or course facts are changed in storage or source.

## Reminder delivery and configuration

Add `ALERT_EMAIL` to the deployment configuration with Michael's recipient address. It is optional in `.env.local.example`: when unset, failures log and the cron returns 500 without attempting an operator email. Alerts use the existing `lib/email.ts` transport; no recipient value was guessed or configured here.

Renewal reminders use each 90/60/30/7 threshold as an upper-bound window, with a stable license/date cycle key. This follows the requested rule and can catch up several unsent thresholds, including overdue active licenses. Opt-outs remain respected. Each delivery is claimed PENDING before rendering/sending, marked SENT only after success, or FAILED with the error. Retry limit is five attempts; a stale PENDING lease is retryable after 15 minutes. SENT rows block subsequent delivery. Exhausted failures require operator review and remain in EmailLog.

The monthly digest cron now runs daily at 15:00 UTC, with one SENT digest per user/calendar-month key. Prior-month unfinished delivery is retried before starting a new digest, at most one digest per user/run, using current engine data. Both email crons and push return failure counts with HTTP 500 for any failure. Push also treats rejected/missing Expo tickets as failures. Push ticket acceptance is not proof of eventual device delivery.

Legacy EmailLog rows retain SENT dedupe protection and their old timestamp. They have no provider receipt; suspected historical crashes after log insertion require provider-log reconciliation. This migration cannot determine which old log rows were inserted before a failed send. Also, delivery accepted by a provider immediately before a database write failure can be duplicated on retry: the database and external mail service do not share a transaction.

## Migration handoff

Three hand-written migrations must be reconciled/applied in the populated local sandbox by Claude:

1. `20260916110000_extraction_reservations`
2. `20260916111000_email_delivery`
3. `20260916112000_federal_training`

They are tested from empty and with populated synthetic legacy data using in-memory PostgreSQL. They were not applied to the socket-blocked local database or to production. Use the existing local/reviewed database workflow; no reset, seed, deploy or remote database operation was run. No public production rollout is authorized by this run.
