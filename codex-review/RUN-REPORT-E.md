# Run E — approved Run D follow-ups

Date: September 18, 2026, America/Los_Angeles (JSONL timestamps are UTC).
Branch: `fix/astra-e-walkthrough-followups`; baseline HEAD `c3c86c3`.
**E1–E6 are complete. No partial or blocked items. No commits or pushes.**

Read `AGENTS.md`, `CLAUDE.md`, the six Run D findings, D-3's confirmed/pending
ledger, the walkthrough README, and installed Next.js client/search-param docs.
The run-specific instruction to stay on this prepared branch and use loopback
superseded the guide's normal main-fetch workflow. Main was never checked out,
merged, rebased onto, pushed or otherwise changed.

Only the validated `.env.local` sandbox on localhost:51214 and the fictional
`REVIEW_DEMO_EMAIL` account were used. No `.env.prod` read/load, environment-file
edit, seed, migration, dependency change or production-service call. No
compliance source file or requirement hours/cadence/topic database value was
changed. Fictional user certificates/licenses are the real-API test fixtures.
Unresolved factual questions remain in [FACT-QUESTIONS-E.md](FACT-QUESTIONS-E.md).

> **Evidence location.** The `walkthrough-E/` screenshots, DOM snapshots and logs referenced below (~27 MB) are not committed; they live in the ClearCME project folder at `codex-review/e/walkthrough-E/`.

## Verification and evidence

- Final gate passed: `npx tsc --noEmit && npm run lint && npx vitest run` —
  **35 test files / 313 tests**, including **44 added tests in five unit files**.
  [Gate log](walkthrough-E/validation-final.log).
- Final running-app suite: **27 passed, 1 intentionally skipped** across desktop
  1280×800 and phone 390×844. The skipped case is the existing desktop-only D-3
  summary on phone; its desktop regression passed. This includes eight new
  browser scenarios at both viewports and the requested D-1/D-3/D-4/NV regressions.
  [Final browser log](walkthrough-E/run-final-browser-all.log),
  [Playwright report](walkthrough-E/playwright-report.json). No page errors or
  harness-step errors occurred in that run: [error audit](walkthrough-E/browser-error-audit.json).
- Before captures were taken in this run before each relevant fix. Every cited
  JPEG has a same-name DOM JSON snapshot with visible text, names and dimensions.
  [Evidence index](walkthrough-E/EVIDENCE-INDEX.md),
  [size/pair inventory](walkthrough-E/evidence-summary.json). All **453 JPEGs**
  have matching DOM snapshots and are below 200,000 bytes; the largest is
  **173,201 bytes**.
- Real Playwright Chromium connected to the launcher browser server at loopback;
  this is phone emulation, not a physical iPhone or native Apple/Google login.
  Browser and Node boundaries deny external traffic. Configured provider,
  extraction and conditional-question cases are boundary mocks, not service
  delivery or legal-rule verification.
- Dev server stopped; browser server and Prisma were left running.
  [Shutdown proof](walkthrough-E/server-stopped.json). `git diff --check` passed.

The evidence helper, wrapper, server guard, Playwright paths and external-mock
state now honor `WALKTHROUGH_EVIDENCE_DIR`. Default remains Run D; this run used
`codex-review/walkthrough-E` throughout. README documents the setting. The
harness change is a separate intended commit in [COMMIT-PLAN-E.md](COMMIT-PLAN-E.md).

## E1 / D-13 — only configured sign-in options

`app/login/page.tsx` now uses Auth.js's existing `getProviders()` endpoint, which
reflects the actual `auth.ts` provider list. Email appears only when Resend is
present; Apple and Google follow the same list. No auth export or configuration
change was necessary. Loading and failed-provider-list states are explicit.
The absent-email sentence is the requested text. This sandbox returns Google
only, so Apple correctly disappears too; the configured-list mock exposes all
three methods.

`lib/auth-error-message.ts` centralizes safe error copy. Configuration retains
“misconfigured on our end”; OAuth start/callback, verification, access denial,
and email-delivery codes have specific guidance, with a generic unknown-code
fallback. The pre-existing account-link/sign-out recovery remains.

Verified by 12 mapping unit cases and real-page tests for missing Resend, mocked
configured providers and `?error=Configuration` on both viewports.
Before: [desktop: 005-E1-before-unconfigured.jpg](walkthrough-E/desktop/005-E1-before-unconfigured.jpg); [phone: 005-E1-before-unconfigured.jpg](walkthrough-E/phone/005-E1-before-unconfigured.jpg).
After: [desktop: 144-E1-after-unconfigured.jpg](walkthrough-E/desktop/144-E1-after-unconfigured.jpg); [phone: 132-E1-after-unconfigured.jpg](walkthrough-E/phone/132-E1-after-unconfigured.jpg).
Configured mock: [desktop: 146-E1-after-configured-mock.jpg](walkthrough-E/desktop/146-E1-after-configured-mock.jpg); [phone: 134-E1-after-configured-mock.jpg](walkthrough-E/phone/134-E1-after-configured-mock.jpg).
Configuration notice: [desktop: 145-E1-after-configuration.jpg](walkthrough-E/desktop/145-E1-after-configuration.jpg); [phone: 133-E1-after-configuration.jpg](walkthrough-E/phone/133-E1-after-configuration.jpg).

Deliberately unchanged: `auth.ts`, provider options/callbacks/cookies, Apple's
cross-site settings, and actual email/OAuth delivery. The Configuration notice
already existed at baseline; this preserves it rather than claiming it was absent.

## E2 / D-5 — retain the requested destination

`lib/login-callback.ts` accepts a single-leading-slash relative path, rejects
protocol-relative/absolute/scheme/backslash destinations and URL control
characters, and falls back to `/dashboard`. All three client sign-in calls use
it. No server redirect or auth behavior changed.

Fifteen unit cases cover the requested examples and browser-stripped whitespace
edge cases. The real protected-page redirect leads to login; an intercepted
Google POST now carries `/dashboard/certificates/new`. Apple and email mocks
carry their requested paths, and `//evil.example` falls back to `/dashboard`.
Exact request fields are `oauth-signin-request` events in both JSONL logs.
Before: [desktop: 009-E2-before-provider-request.jpg](walkthrough-E/desktop/009-E2-before-provider-request.jpg); [phone: 009-E2-before-provider-request.jpg](walkthrough-E/phone/009-E2-before-provider-request.jpg).
After: [desktop: 148-E2-after-provider-request.jpg](walkthrough-E/desktop/148-E2-after-provider-request.jpg); [phone: 136-E2-after-provider-request.jpg](walkthrough-E/phone/136-E2-after-provider-request.jpg).
Email: [desktop: 150-E2-after-resend-callback.jpg](walkthrough-E/desktop/150-E2-after-resend-callback.jpg); [phone: 138-E2-after-resend-callback.jpg](walkthrough-E/phone/138-E2-after-resend-callback.jpg).

Deliberately unchanged: provider callback completion, actual Google/Apple
network flows and server authorization. The assertions concern the outgoing
local sign-in request, not a live identity-provider round trip.

## E3 / D-7 — explain manually entered pending hours

`components/ManualCertificateEntry.tsx` reads `certificate.extractionStatus` from
the saved response. Completed entries retain their green success; NEEDS_REVIEW
shows warm text and a direct “Review details” link. The shared
`lib/manual-certificate-review.ts` gives the future-date correction when the
returned date is in the future, otherwise asks the user to check date/hours and
provider. `components/CertificateList.tsx` uses the existing `fileName ===
"Manual entry"` convention for the same row explanation, without extraction or
AI language. No schema or server validation change.

Six unit cases cover date guidance, unknown reasons and manual/extracted row
copy. Both browser runs enter 2099-01-01, receive real **201 NEEDS_REVIEW**, then
edit to 2026-09-01 and receive **200 COMPLETED**. The dashboard asserts
**40.0 → 40.0 → 38.0**: pending hours stay excluded, corrected hours count.
Before: [desktop: 023-E3-before-future-saved.jpg](walkthrough-E/desktop/023-E3-before-future-saved.jpg); [phone: 023-E3-before-future-saved.jpg](walkthrough-E/phone/023-E3-before-future-saved.jpg).
After: [desktop: 154-E3-after-future-saved.jpg](walkthrough-E/desktop/154-E3-after-future-saved.jpg); [phone: 142-E3-after-future-saved.jpg](walkthrough-E/phone/142-E3-after-future-saved.jpg).
Recovery row: [desktop: 156-E3-after-review-row.jpg](walkthrough-E/desktop/156-E3-after-review-row.jpg); [phone: 144-E3-after-review-row.jpg](walkthrough-E/phone/144-E3-after-review-row.jpg).
Corrected gap: [desktop: 158-E3-after-gap-counted.jpg](walkthrough-E/desktop/158-E3-after-gap-counted.jpg); [phone: 146-E3-after-gap-counted.jpg](walkthrough-E/phone/146-E3-after-gap-counted.jpg).

Deliberately unchanged: future/planned-activity policy, validation thresholds,
compliance arithmetic, duplicate rules and extracted-certificate guidance.

## E4 / D-12 — recovery and edit labels

`components/CertificateList.tsx`'s recovery form and
`components/CertificateUpload.tsx`'s NeedsReviewCard, ExtractionFailedCard and
“Fix something” form each own a `useId()` prefix. Every visible field label has
matching `htmlFor`/`id`; repeated rows/cards do not collide. Named exports permit
focused rendering tests; the existing card/save/ledger behavior is unchanged.

Four unit render cases each mount two forms/cards. Browser DOM checks confirm
10 unique associations for two library rows at both viewports, and 8 for two
cards in each of the three desktop upload states. Each control ID occurs once.
Before rows: [desktop: 036-E4-before-two-recovery-rows.jpg](walkthrough-E/desktop/036-E4-before-two-recovery-rows.jpg); [phone: 036-E4-before-two-recovery-rows.jpg](walkthrough-E/phone/036-E4-before-two-recovery-rows.jpg).
After rows: [desktop: 140-E4-after-two-recovery-rows.jpg](walkthrough-E/desktop/140-E4-after-two-recovery-rows.jpg); [phone: 130-E4-after-two-recovery-rows.jpg](walkthrough-E/phone/130-E4-after-two-recovery-rows.jpg).
Desktop upload pairs, before → after:

- Needs review: [desktop: 037-E4-before-two-NEEDS-REVIEW-cards.jpg](walkthrough-E/desktop/037-E4-before-two-NEEDS-REVIEW-cards.jpg) → [desktop: 141-E4-after-two-NEEDS-REVIEW-cards.jpg](walkthrough-E/desktop/141-E4-after-two-NEEDS-REVIEW-cards.jpg).
- Failed: [desktop: 038-E4-before-two-FAILED-cards.jpg](walkthrough-E/desktop/038-E4-before-two-FAILED-cards.jpg) → [desktop: 142-E4-after-two-FAILED-cards.jpg](walkthrough-E/desktop/142-E4-after-two-FAILED-cards.jpg).
- Fix something: [desktop: 039-E4-before-two-COMPLETED-cards.jpg](walkthrough-E/desktop/039-E4-before-two-COMPLETED-cards.jpg) → [desktop: 143-E4-after-two-COMPLETED-cards.jpg](walkthrough-E/desktop/143-E4-after-two-COMPLETED-cards.jpg).

Phone intentionally renders `MobileCameraUpload`, with the three desktop cards
hidden below `sm`; no CSS was forced to make a nonexistent phone flow appear.
Phone list recovery is covered above; the phone uploader is captured at
[phone: 131-E4-after-phone-camera-uploader.jpg](walkthrough-E/phone/131-E4-after-phone-camera-uploader.jpg). No mobile upload redesign.
The existing desktop D-3 browser regression and three ledger unit tests pass:
only confirmed saves count, unresolved certificates remain pending.

## E5 / D-8 — phone targets

`components/console/ConsoleShell.tsx` wraps the existing 30 px avatar in a 40 px
phone button. `app/dashboard/settings/SettingsClient.tsx` keeps the switch track
44×24 inside a 44×40 phone button. `components/dashboard/RequirementAttestation.tsx`
sets a 40 px phone minimum on the two requested response buttons. Responsive
rules preserve desktop dimensions and graphics.

| Phone target | Before (W×H) | After (W×H) |
| --- | --- | --- |
| Account menu | 30×30 | 40×40 |
| Renewal reminders | 44×24 | 44×40 |
| Monthly digest | 44×24 | 44×40 |
| I've done this (all four observed rows) | 294×32 | 294×40 |
| Still need it (all four observed rows) | 294×34 | 294×40 |

The browser measures every listed target, checks the account menu, and toggles
the phone switch at (2,2), outside its visible track. Desktop controls keep
30×30 / 44×24 and their prior response-button dimensions. There is no CSS-string
unit test; DOM geometry/click behavior and the existing reminder-naming unit
check provide more useful coverage.
Before: [desktop: 047-E5-before-settings.jpg](walkthrough-E/desktop/047-E5-before-settings.jpg); [phone: 042-E5-before-settings.jpg](walkthrough-E/phone/042-E5-before-settings.jpg).
After: [desktop: 159-E5-after-settings.jpg](walkthrough-E/desktop/159-E5-after-settings.jpg); [phone: 147-E5-after-settings.jpg](walkthrough-E/phone/147-E5-after-settings.jpg).
Attestation: [desktop: 161-E5-after-attestation.jpg](walkthrough-E/desktop/161-E5-after-attestation.jpg); [phone: 149-E5-after-attestation.jpg](walkthrough-E/phone/149-E5-after-attestation.jpg).
Desktop settings and expanded-attestation images have **zero pixels differing
by more than 30/255 in any RGB channel**, with identical dimensions:
[comparison](walkthrough-E/desktop-visual-comparison.json). Images were visually
reviewed as well as measured. Deliberately unchanged: desktop styling, control
labels, values and actions; unrelated small targets were not redesigned.

## E6 / D-6 — resume questions after licenses are submitted

`app/dashboard/setup/SetupWizard.tsx` stores an explicit `licensesSubmitted`
flag and `conditionalAnswers`. The flag is written synchronously after the
license submission phase and before fetching questions. Restoring such a draft
re-fetches the server question list and restores only current keys with `yes`
or `no` values; absent/invalid answers remain “Not sure”. An empty question list
continues to the dashboard. A loading state prevents earlier steps flashing.

**Smallest safe rule:** once submitted, this wizard has no path back to steps
1–4 and a ref guard prevents another license submission. This retains the
existing no-Back step-5 layout. License edits use the existing Licenses page;
there is no new reset/resubmit action. Successful completion or explicit D-1
skip clears the draft and prevents the persistence effect from recreating it.

On restore only, a failed/malformed question GET displays “Reload questions”
and keeps the submitted flag and draft answers intact. Initial submission
retains its existing nonblocking fallback to the dashboard if question loading
fails. This distinction avoids introducing silent answer loss in the new path.

Seven unit cases validate compatible-answer filtering. Browser evidence proves
answer → refresh → restore, 503 on restore → preserved storage → reload,
D-1 answer-save failure/retry/explicit skip, no-questions redirect, and **one
POST /api/licenses throughout refresh/recovery**, with the exact answered POST
body asserted. Existing keyboard/double-submit, NV MD Confirm/Edit/estimate/
state-change and D-4 step-4/multi-license refresh tests all pass.
Before: [desktop: 066-E6-before-refresh-loses-step5.jpg](walkthrough-E/desktop/066-E6-before-refresh-loses-step5.jpg); [phone: 061-E6-before-refresh-loses-step5.jpg](walkthrough-E/phone/061-E6-before-refresh-loses-step5.jpg).
After: [desktop: 176-E6-after-refresh-restores-answer.jpg](walkthrough-E/desktop/176-E6-after-refresh-restores-answer.jpg); [phone: 164-E6-after-refresh-restores-answer.jpg](walkthrough-E/phone/164-E6-after-refresh-restores-answer.jpg).
Restore outage: [desktop: 175-E6-after-restore-outage-keeps-draft.jpg](walkthrough-E/desktop/175-E6-after-restore-outage-keeps-draft.jpg); [phone: 163-E6-after-restore-outage-keeps-draft.jpg](walkthrough-E/phone/163-E6-after-restore-outage-keeps-draft.jpg).
Step-4 regression: [desktop: 173-E6-after-D4-step4-restored.jpg](walkthrough-E/desktop/173-E6-after-D4-step4-restored.jpg); [phone: 161-E6-after-D4-step4-restored.jpg](walkthrough-E/phone/161-E6-after-D4-step4-restored.jpg).
No questions: [desktop: 179-E6-after-no-questions-dashboard.jpg](walkthrough-E/desktop/179-E6-after-no-questions-dashboard.jpg); [phone: 167-E6-after-no-questions-dashboard.jpg](walkthrough-E/phone/167-E6-after-no-questions-dashboard.jpg).
`wizard-license-requests` and `double-submit` events in the raw logs record counts.

Deliberately unchanged: license APIs/upsert semantics, partial additional-license
failure policy, entitlement fences, all renewal/compliance facts, question
wording and the initial conditional-fetch fallback. No migration.

## Self-review and report-only observations

Least confidence is E6's persistence boundary: sessionStorage remains best effort
when blocked/full and does not make the multi-request license submission atomic.
The marker protects refresh **after** submission; a refresh before a successful
response/marker still uses existing upsert behavior. Compatibility uses the
server's stable question key, not a versioned semantic definition. The injected
question proves UI/state behavior, not which clinician should receive it.

Provider tests deliberately stop at local boundaries. They do not establish
production Resend delivery, Apple cross-site-cookie behavior, or native-device
rendering. The local requirements dataset is not production-equivalent; the
existing human fact questions remain unresolved.

New/report-only: the certificate page's general header still says “AI-extracted
credit details” even with only manual entries, and its “hours on file” header
includes pending entries (the compliance dashboard correctly excludes them).
This copy lies outside the requested row feedback; no page-wide copy or counting
policy change was added. Upload recovery labels still use their existing
“Credit Hours” wording; E4 only associates them.

Exploratory harness failures are retained in logs: a broad alert locator also
matched Next's route announcer; clicking shrinking button lists by `nth` skipped
rows; an old rounded switch corner was outside its painted hit target; and the
compliance onboarding modal appeared after an early visibility probe. Those
selectors/timing were corrected and the final run is the verification source.
An initial final-suite filename argument used shell-glob notation where
Playwright expects a regex, so it ran only regressions; the corrected final
28-case run includes all E cases. No product fix was inferred from those harness
errors. No item required an ASTRA-TODO or was left unfinished.
