# Run D commit plan

Branch: `fix/astra-d-walkthrough`. **No commits or pushes were made.** The
post-run pass should stage each concern separately. In particular, split the
two `SetupWizard.tsx` changes by hunk; do not bundle them into one fix.
All application changes are client-only and each concern is below roughly
40 changed lines. No compliance facts, migration files, APIs, auth, billing or
cron changes belong in any commit.

## 1. Harness

Message: `test: e2e walkthrough harness (Run D)`

Body:

> Add repeatable fresh-account walkthroughs with desktop, phone and iOS-shell
> emulation, bounded screenshot evidence, raw error/request logs, and isolated
> provider success/error/hang scenarios. Use the real local review-auth bridge
> and deny external connections. Keep Playwright specs outside Vitest's glob.
> Exercise Run D findings D-1 through D-13 and retain explicit coverage limits.

Files: `tests/e2e/**`, `tests/fixtures/certs/run-d-fictional.pdf`,
`tests/fixtures/certs/run-d-fictional.jpg`, `package.json`, `package-lock.json`.
The launcher supplied the Playwright dependency/lock additions; the agent
added the npm script and did not install or upgrade packages.

Tests: smoke; public/protected sweep; setup variants; keyboard/double-submit;
conditional failure/retry/skip; lifecycle; certificate topic/recovery/export;
file rejection; provider matrix; app-shell. Use `tests/e2e/README.md`.
Verification logs and exceptions are listed in the primary report. Mock
provider tests demonstrate UI contracts, not provider delivery or AI accuracy.

## 2. Conditional-answer failure feedback (D-1)

Message: `fix: make failed setup answers recoverable`

Body:

> D-1: a failed conditional-answer POST previously navigated away silently.
> Keep the answers and show a retryable error. Offer explicit continuation
> without saving so an outage does not prevent reaching the dashboard.

Files: only the `finishConditionalStep` and step-5 error-card hunks in
`app/dashboard/setup/SetupWizard.tsx`.

Tests/verification: `interactions.spec.ts` holds a fictional conditional
question at the boundary, returns 503, checks visible feedback and retained
answer, retries with 200, and separately chooses the explicit skip path.
Re-walked at both viewports after restarting the dev server. Browser state
checks are the practical regression test; no mirror-of-implementation unit
snapshot was added.

## 3. Rejected upload feedback (D-2)

Message: `fix: explain rejected certificate files and allow retry`

Body:

> D-2: oversized and unsupported desktop files were silently ignored by the
> drop zone. Show a rejected row with an actionable reason and a choose-another
> action, while preserving accepted-file processing. Suppress the success
> summary when no certificate was processed.

Files: `components/CertificateUpload.tsx`,
`tests/app/dashboard/upload-rejections.test.ts`.

Tests/verification: two unit tests cover size/type priority and fallback
messages. `rejections.spec.ts` selects an 11 MiB PDF and text/plain file,
checks errors and resets the desktop drop zone; phone comparison re-walked.
Provider success/error/hang scenarios also exercise the upload result path.
The separate existing summary inconsistency remains proposed as D-3.

## 4. Multi-state draft persistence (D-4)

Message: `fix: restore multi-state setup choices after refresh`

Body:

> D-4: step 4 did not persist its Yes/No choice or additional license cards.
> Save and validate those draft fields in the existing sessionStorage record,
> retaining the four-additional-license cap.

Files: only the restore/persist/effect-dependency hunks in
`app/dashboard/setup/SetupWizard.tsx`.

Tests/verification: `setup.spec.ts` creates four additional cards, reloads,
asserts all four remain, and verifies the unchanged free-tier 402 path.
Both viewports re-walked. Morning NV MD Confirm/Edit/estimate regression and
other primary-license scenarios repeated. Step-5 refresh is separately D-6.

## 5. Manual-entry label associations (D-9)

Message: `fix: associate manual CME fields with their labels`

Body:

> D-9: visible manual-entry labels did not name their controls. Use stable
> per-form IDs for all five associations without changing form behavior.

Files: `components/ManualCertificateEntry.tsx`,
`tests/app/dashboard/manual-labels.test.ts`.

Tests/verification: unit test renders two forms and verifies ten unique label
associations. Both-viewports lifecycle re-walk confirms DOM labels, invalid
hours feedback, future review state, valid save and duplicate feedback.
Recovery forms remain separately proposed in D-12.

## 6. Reminder switch names (D-10)

Message: `fix: give reminder switches accessible names`

Body:

> D-10: the reminder switches exposed their state but no accessible name.
> Associate each with its existing visible label using aria-label.

Files: `app/dashboard/settings/SettingsClient.tsx`,
`tests/app/dashboard/reminder-labels.test.ts`.

Tests/verification: unit test checks both names and independent checked states.
Both-viewports lifecycle verifies toggling and persistence after reload.
Tap-target sizing remains separately proposed in D-8.

## 7. Mobile upload terminology (D-11)

Message: `fix: use hours of CME in the mobile upload hint`

Body:

> D-11: use the established hours-of-CME wording in the empty mobile uploader.

File: `components/MobileCameraUpload.tsx`.

Verification: both upload surfaces re-walked after restart. Phone screenshot
shows “AI reads hours of CME”; desktop upload behavior is unchanged by this
mobile-only string. No unit test for a copy-only substitution.

## 8. Evidence and handoff

Message: `docs: record Run D walkthrough findings and evidence`

Body:

> Record D-1 through D-13, fixed versus proposed changes, provider behavior,
> app-shell observations, accessibility/friction notes, factual questions,
> coverage limits and final validation. Replace the earlier blocked report.

Files: `codex-review/WALKTHROUGH-REPORT-D.md`,
`codex-review/FACT-QUESTIONS-D.md`, `codex-review/COMMIT-PLAN-D.md`, and evidence
under `codex-review/walkthrough-D/` (screenshots, DOM snapshots, logs and
verification artifacts). Exclude ephemeral `server.pid`, `stop-server` and
`mock-modes.json` control files from the commit. The old failed-run logs are
historical evidence, not current failures or asserted product bugs.

Final gate: `npx tsc --noEmit && npm run lint && npx vitest run`; exact final
result and server shutdown are recorded in the primary report/validation log.
The only database setup action was applying an already-existing additive
migration to the local sandbox; no schema migration is shipped by this plan.
