# Run D — new-account walkthrough

Branch: `fix/astra-d-walkthrough`. Baseline HEAD/cached origin/main: `af7eb64`.
Run date: September 17–18, 2026 (local evening / UTC logs). This replaces the
initial blocked report: the corrected Playwright pipe passed the real
fresh-user → review sign-in → dashboard smoke at both viewports.

> **Evidence location.** The `walkthrough-D/` screenshots, DOM snapshots and logs referenced below (~104 MB) are not committed; they live in the ClearCME project folder at `codex-review/d/walkthrough-D/`.

## (a) Summary

| Severity | Fixed here | Proposed | Total |
| --- | ---: | ---: | ---: |
| P0 | 0 | 0 | 0 |
| P1 | 2 | 2 | 4 |
| P2 | 1 | 4 | 5 |
| P3 | 3 | 1 | 4 |
| **Total** | **6** | **7** | **13** |

The worst findings are a silently failed conditional-answer save (D-1), desktop
file rejection with no feedback (D-2), and an upload summary that reports zero
reviews while displaying a review form (D-3). Six small client fixes are included.
Counts exclude injected errors and sandbox infrastructure failures; D-13 is
explicitly limited to the local missing-provider configuration.
No compliance facts, schemas, API contracts, authentication, billing, cron or
production data were changed. No commits, pushes, dependency upgrades or agent
installs were made. Playwright/package-lock additions were launcher-provided.

Evidence is a real running Next dev app and local Prisma sandbox, not a static
review. Screenshots and matching DOM snapshots are under `walkthrough-D/desktop`,
`phone`, and `app-shell`. Raw logs: [desktop](walkthrough-D/log-desktop.jsonl),
[phone](walkthrough-D/log-phone.jsonl), [app shell](walkthrough-D/log-app-shell.jsonl).
Every cited `.jpg` has a matching `.json` with visible text, control labels,
values, dimensions and shell visibility. Earlier failed exploratory runs remain;
final verification references below supersede harness errors in those runs.

### Scope and environment qualifications

- Desktop: 1280×800; phone: 390×844, mobile/touch; shell: phone plus
  ` ClearCMEApp/1.0.0`. Chromium emulation, not native WKWebView or physical iPhone.
- Only `.env.local` DATABASE_URL on localhost:51214 was used. Existing migration
  `20260917090000_mobile_email_code` was applied locally because the review-login
  table was missing. No migration/schema/seed was authored or changed; see
  [local migration log](walkthrough-D/local-migration.log).
- Dev server uses polling and `-H 0.0.0.0`. A run-local ephemeral secret fills both
  auth environment names; no cookie/auth code changed. The harness normalizes
  the dev bind-address redirect back to localhost after the real cookie bridge.
- Early PGlite prepared-statement cross-talk produced `08P01` and one profile
  page error. The test-only pool is now serialized. These are recorded as local
  infrastructure errors, not counted as proven production P1s. Repro was opening
  Profile / saving reminders during an earlier local pass; the profile showed
  “This page couldn’t load” with Reload, and reminders showed a retry message.
  Evidence: [profile error](walkthrough-D/desktop/251-profile-initial.jpg),
  [reminder error](walkthrough-D/desktop/254-settings-name-reminders-saved.jpg),
  `pageerror` / HTTP 500 events and `08P01` in the server log. Cross-talk is an
  inference from those logs and the absence of recurrence after serialization.
- Browser and Node boundaries deny external connections. Stripe's real local
  APIs run against an outbound transport mock. Other provider outcomes are UI
  contract mocks. No live Stripe, Google, Apple, Anthropic, Resend, Expo or Blob.
- Three human factual questions are in [FACT-QUESTIONS-D.md](FACT-QUESTIONS-D.md):
  TX schedule differs from the brief; the sandbox lacks DO rules; local NV MD
  rows include legacy/federal-looking entries. No factual sign-off is claimed.

## (b) Findings

### D-1 — P1 — failed practice answers silently discarded — FIXED (commit plan #2)

- URL/account/viewports: `/dashboard/setup`, fresh NV MD account, step 5;
  desktop and phone. Synthetic presentation-only conditional question; no
  clinical rule was inserted.
- Repro: complete steps 1–4; answer the fixture question Yes; make
  `POST /api/conditional-requirements` return 503; select “See my compliance map”.
- Expected: explain that the answer was not saved and offer recovery.
  Before: navigated to `/dashboard?onboarded=1` with no error; the chosen answer
  was lost. Network evidence: injected POST 503 in both JSONL logs.
- Before: [desktop: 200-conditional-save-failed-result.jpg](walkthrough-D/desktop/200-conditional-save-failed-result.jpg); [phone: 182-conditional-save-failed-result.jpg](walkthrough-D/phone/182-conditional-save-failed-result.jpg).
- Fixed: retain the answer, show “We couldn't save your answers. Please try
  again.”, allow retry, and offer an explicit “Continue without saving these
  answers” escape so an outage cannot trap the user in setup.
- After: [desktop: 707-conditional-save-error-with-skip.jpg](walkthrough-D/desktop/707-conditional-save-error-with-skip.jpg); [phone: 689-conditional-save-error-with-skip.jpg](walkthrough-D/phone/689-conditional-save-error-with-skip.jpg); retry:
  [desktop: 681-conditional-save-retry-success.jpg](walkthrough-D/desktop/681-conditional-save-retry-success.jpg); [phone: 663-conditional-save-retry-success.jpg](walkthrough-D/phone/663-conditional-save-retry-success.jpg); explicit skip:
  [desktop: 708-conditional-explicit-skip-dashboard.jpg](walkthrough-D/desktop/708-conditional-explicit-skip-dashboard.jpg); [phone: 690-conditional-explicit-skip-dashboard.jpg](walkthrough-D/phone/690-conditional-explicit-skip-dashboard.jpg).
- File: `app/dashboard/setup/SetupWizard.tsx`. Browser tests cover retry and
  intentional skip; no backend behavior or contract changed.

### D-2 — P1 — desktop rejected files do nothing — FIXED (commit plan #3)

- URL/account/viewports: `/dashboard/upload`, fresh signed-in account;
  desktop defect, phone checked as comparison.
- Repro: choose an 11 MiB PDF, then a `text/plain` file named `wrong.txt`.
- Expected: clear size/type feedback and another-file action. Before: desktop
  remained at the empty drop zone without an error or request. Phone already
  exposed its size error. Network: no desktop upload call for rejected files.
- Before: [desktop: 277-rejection-oversized-result.jpg](walkthrough-D/desktop/277-rejection-oversized-result.jpg) and
  [desktop: 279-rejection-wrong-mime-result.jpg](walkthrough-D/desktop/279-rejection-wrong-mime-result.jpg).
- Fixed: rejected rows get actionable size/type messages; “Choose another file”
  resets the drop zone. Accepted files still use the existing upload path.
- After: [desktop: 782-rejection-oversized-result.jpg](walkthrough-D/desktop/782-rejection-oversized-result.jpg); [phone: 764-rejection-oversized-result.jpg](walkthrough-D/phone/764-rejection-oversized-result.jpg); retry:
  [desktop: 783-rejection-oversized-retry-ready.jpg](walkthrough-D/desktop/783-rejection-oversized-retry-ready.jpg).
- File: `components/CertificateUpload.tsx`; two unit tests cover rejection
  priority/fallback, plus browser size/type/retry checks. The pre-existing
  results-banner contradiction is separately reported in D-3.

### D-3 — P1 — review-needed upload summary claims zero reviews — PROPOSED

- URL/account/viewports: `/dashboard/upload`, NV MD fixture with a 2-hour
  certificate; desktop defect, phone comparison behaves more clearly.
- Repro: upload the fixture PDF; fulfill the extraction endpoint with a valid
  certificate object whose `extractionStatus` is `NEEDS_REVIEW` and hours are 2.
- Expected: one review pending; no claim of applied hours before confirmation.
  Actual: “2.0 credits added”, “Needs review 0”, and “Compliance updated” appear
  above “Review & Confirm”. Earlier error-only results also showed a success
  banner; D-2 removes that banner when no certificate was processed.
- Evidence: [desktop: 759-extraction-review-result.jpg](walkthrough-D/desktop/759-extraction-review-result.jpg); [phone: 741-extraction-review-result.jpg](walkthrough-D/phone/741-extraction-review-result.jpg); desktop error:
  [desktop: 754-extraction-error-result.jpg](walkthrough-D/desktop/754-extraction-error-result.jpg). Network: mocked 200/NEEDS_REVIEW
  and injected 502, recorded as `external-matrix-call`; no actual AI was run.
- Proposed files: `components/CertificateUpload.tsx`, with corresponding UI
  tests. Derive pending/success/failure summaries from the certificate's
  verified state and refresh them after confirmation. Do not infer compliance
  changes from extracted hours alone. Align “hours of CME” terminology too.
- Deferred because the meaning of “applied” must agree with the existing
  confirmation/compliance contract; this run does not change that contract.

### D-4 — P2 — refreshing step 4 loses multi-state draft — FIXED (commit plan #4)

- URL/account/viewports: `/dashboard/setup`, step 4, both viewports, free user.
- Repro: NV MD primary → Yes to other licenses → add TX, CA, AZ and NY with MD
  and manual dates → refresh the tab.
- Expected: preserve choice and four additional cards. Before: Yes/No and cards
  disappeared. This is unsaved draft loss, not loss of persisted licenses.
- Before: [desktop: 299-multi-state-lost-after-refresh.jpg](walkthrough-D/desktop/299-multi-state-lost-after-refresh.jpg); [phone: 283-multi-state-lost-after-refresh.jpg](walkthrough-D/phone/283-multi-state-lost-after-refresh.jpg).
- After: [desktop: 638-multi-state-restored-after-refresh.jpg](walkthrough-D/desktop/638-multi-state-restored-after-refresh.jpg); [phone: 620-multi-state-restored-after-refresh.jpg](walkthrough-D/phone/620-multi-state-restored-after-refresh.jpg). No failed network call:
  the missing fields were omitted from sessionStorage persistence.
- File: `app/dashboard/setup/SetupWizard.tsx`; save/validate/restore the existing
  fields, retaining the four-additional-card cap. Both browser assertions pass.
  The free-tier submit still correctly returns 402 and shows an upgrade notice.

### D-5 — P2 — login drops the requested return destination — PROPOSED

- URL/account/viewports: logged out at `/dashboard/certificates/new`; both.
- Repro: visit that protected URL, land on
  `/login?callbackUrl=%2Fdashboard%2Fcertificates%2Fnew`, select Google, intercept
  the outbound sign-in request without contacting Google.
- Expected: request the original certificate page as callback. Actual:
  `POST /api/auth/signin/google` sends `callbackUrl=/dashboard`.
- Evidence: [desktop: 682-callback-protected-request.jpg](walkthrough-D/desktop/682-callback-protected-request.jpg); [phone: 664-callback-protected-request.jpg](walkthrough-D/phone/664-callback-protected-request.jpg); [desktop: 683-callback-provider-request.jpg](walkthrough-D/desktop/683-callback-provider-request.jpg); [phone: 665-callback-provider-request.jpg](walkthrough-D/phone/665-callback-provider-request.jpg).
  Exact request field is in `oauth-signin-request` in each raw log.
- Proposed file: `app/login/page.tsx`; carry forward a validated same-origin callback. Auth changes are
  outside this run's fix policy. Provider callback completion itself was not
  tested live; the observed defect is the discarded destination in the request.

### D-6 — P2 — refreshing conditional questions returns to step 4 — PROPOSED

- URL/account/viewports: `/dashboard/setup`, answered step 5, both.
- Repro: same synthetic conditional question as D-1; answer Yes, then refresh.
- Expected: return to the question with the draft answer. Actual: step 4 is
  restored; question/answer state disappears and must be reached again.
- Evidence: [desktop: 678-conditional-step5-answered.jpg](walkthrough-D/desktop/678-conditional-step5-answered.jpg); [phone: 660-conditional-step5-answered.jpg](walkthrough-D/phone/660-conditional-step5-answered.jpg); [desktop: 679-conditional-step5-refresh.jpg](walkthrough-D/desktop/679-conditional-step5-refresh.jpg); [phone: 661-conditional-step5-refresh.jpg](walkthrough-D/phone/661-conditional-step5-refresh.jpg).
  No console or failed-request cause; the persisted step is intentionally
  clamped to 4 and conditional state is not restored.
- Proposed file: `app/dashboard/setup/SetupWizard.tsx`. Reload the actual
  server questions for the already-saved license, then restore compatible
  draft answers. Review idempotence/repeated license submission before changing
  this path; the small D-4 fix deliberately covers only the step-4 draft.

### D-7 — P2 — future manual entry gives generic success, then an AI-review explanation — PROPOSED

- URL/account/viewports: `/dashboard/certificates/new`, then certificate list;
  NV MD free account, both.
- Repro: enter “Run D future”, “Fictional Run D Provider”, 2 hours, AMA PRA
  Category 1, date `2099-01-01`; save and open the list.
- Expected: explain the future date and how to correct it. Actual: HTTP 201 and
  generic “Saved” success; list says fields “couldn't be read with confidence”
  although the user typed them. The row is NEEDS_REVIEW, and the dashboard
  correctly excludes it. This is confusing feedback, not proven overcounting.
- Evidence: [desktop: 527-manual-future-result.jpg](walkthrough-D/desktop/527-manual-future-result.jpg); [phone: 511-manual-future-result.jpg](walkthrough-D/phone/511-manual-future-result.jpg); [desktop: 533-certificates-after-save.jpg](walkthrough-D/desktop/533-certificates-after-save.jpg); [phone: 517-certificates-after-save.jpg](walkthrough-D/phone/517-certificates-after-save.jpg).
  `manual-response` with case `future-date` contains the returned status/body.
- Proposed files: `components/ManualCertificateEntry.tsx` and
  `components/CertificateList.tsx`; surface the returned review state and the
  specific correction needed. Confirm policy for planned/future activities
  before changing server validation. No date/counting policy was changed here.

### D-8 — P2 — several phone tap targets are below 40 px — PROPOSED

- URLs/account: `/dashboard/settings`, `/dashboard/compliance`, NV MD user.
- Repro: on 390×844, inspect/tap account menu, reminder switches, and expanded
  requirement response buttons.
- Expected: at least 40 px usable targets per Run D rubric. Measured DOM boxes:
  account menu 30×30; reminders 44×24; “I've done this” height 32;
  “Still need it” height 34. Text/buttons remain reachable; no page-level
  horizontal overflow was observed in the completed captures.
- Evidence: [phone: 526-settings-persisted.jpg](walkthrough-D/phone/526-settings-persisted.jpg);
  [phone: 677-compliance-rows-expanded.jpg](walkthrough-D/phone/677-compliance-rows-expanded.jpg), with matching control dimensions.
  No relevant console/network error.
- Proposed files: `app/dashboard/settings/SettingsClient.tsx`, shared dashboard
  navigation/account-menu (`components/console/ConsoleShell.tsx`) and
  `components/dashboard/RequirementAttestation.tsx`. Expand hit areas
  without a visual redesign; leave taste-level spacing choices to a later pass.

### D-9 — P3 — manual-entry labels are not associated — FIXED (commit plan #5)

- URL/account/viewports: `/dashboard/certificates/new`, logged-in, both.
- Repro: inspect the five inputs/select or query each by its visible label.
- Expected: course/provider/date/hours/type names associated with controls.
  Before: DOM `labels: []`; date/hours had no accessible name. No network error.
- Before: [desktop: 048-manual-empty.jpg](walkthrough-D/desktop/048-manual-empty.jpg); [phone: 030-manual-empty.jpg](walkthrough-D/phone/030-manual-empty.jpg); after: [desktop: 519-manual-empty.jpg](walkthrough-D/desktop/519-manual-empty.jpg); [phone: 503-manual-empty.jpg](walkthrough-D/phone/503-manual-empty.jpg).
- File: `components/ManualCertificateEntry.tsx`; `useId` links five labels and
  controls without collisions if multiple forms render. Unit test verifies
  ten unique associations across two rendered forms; browser DOM confirms it.

### D-10 — P3 — reminder switches lack accessible names — FIXED (commit plan #6)

- URL/account/viewports: `/dashboard/settings`, logged-in, both.
- Repro: inspect Renewal reminders and Monthly digest switches.
- Expected: each switch announces its own name/state. Before: unnamed empty
  buttons with `role=switch`; surrounding text was not associated.
- Evidence before: [desktop: 069-settings-initial.jpg](walkthrough-D/desktop/069-settings-initial.jpg); [phone: 051-settings-initial.jpg](walkthrough-D/phone/051-settings-initial.jpg); after:
  [desktop: 542-settings-persisted.jpg](walkthrough-D/desktop/542-settings-persisted.jpg); [phone: 526-settings-persisted.jpg](walkthrough-D/phone/526-settings-persisted.jpg). DOM snapshots record the new aria-labels;
  toggles still save and persist across reload. No production network failure.
- File: `app/dashboard/settings/SettingsClient.tsx`; one aria-label line,
  plus unit verification of both names and independent checked states.

### D-11 — P3 — mobile uploader uses “credits” terminology — FIXED (commit plan #7)

- URL/account/viewports: `/dashboard/upload`, signed-in phone; desktop is the
  comparison surface and does not show this mobile hint.
- Repro: open the empty mobile uploader. Before: “AI extracts credits
  automatically”. Expected product vocabulary: “hours of CME”.
- Before: [phone: 260-rejection-oversized-before.jpg](walkthrough-D/phone/260-rejection-oversized-before.jpg); after:
  [phone: 763-rejection-oversized-before.jpg](walkthrough-D/phone/763-rejection-oversized-before.jpg).
- File: `components/MobileCameraUpload.tsx`; now “AI reads hours of CME”.
  Copy-only, no unit test added. Both uploader surfaces re-walked. No network
  error involved. Other results/recovery wording remains covered by D-3/D-12.

### D-12 — P3 — certificate recovery forms still have unassociated labels — PROPOSED

- URL/account/viewports: `/dashboard/certificates#cert-<id>`, synthetic
  NEEDS_REVIEW/FAILED row, both; desktop upload review form also affected.
- Repro: open the recovery deep link and inspect course/provider/date/hours/type
  input labels. Expected: each visible label supplies a control name.
  Actual: recovery controls still have `labels: []`/no aria-label.
- Evidence: [desktop: 658-recovery-NEEDS-REVIEW-form.jpg](walkthrough-D/desktop/658-recovery-NEEDS-REVIEW-form.jpg); [phone: 640-recovery-NEEDS-REVIEW-form.jpg](walkthrough-D/phone/640-recovery-NEEDS-REVIEW-form.jpg); upload:
  [desktop: 759-extraction-review-result.jpg](walkthrough-D/desktop/759-extraction-review-result.jpg). No network cause.
- Proposed files: `components/CertificateList.tsx` and the three recovery/edit
  cards in `components/CertificateUpload.tsx`. Apply the D-9 pattern across
  these forms in a separate reviewed change; do not claim D-9 fixed every form.

### D-13 — P1 — unavailable email sign-in is offered and silently returns to login — PROPOSED (local configuration)

- URL/account/viewports: `/login`, logged out, both. Local Resend is deliberately
  unconfigured, as required by the brief; this is not a claim that production
  email delivery fails.
- Repro: open login, enter `walkthrough-d@local.test`, select “Email me a sign-in
  link” with Resend absent from `/api/auth/providers`.
- Expected: explain that email sign-in is unavailable and offer another method.
  Actual: returns to login with a callback query and the same idle form, without
  an error, check-email transition or delivery. The providers request is 200;
  the provider is absent rather than returning a delivery error.
- Evidence: [desktop: 735-email-before-submit.jpg](walkthrough-D/desktop/735-email-before-submit.jpg); [phone: 717-email-before-submit.jpg](walkthrough-D/phone/717-email-before-submit.jpg); [desktop: 736-email-unconfigured-after-submit.jpg](walkthrough-D/desktop/736-email-unconfigured-after-submit.jpg); [phone: 718-email-unconfigured-after-submit.jpg](walkthrough-D/phone/718-email-unconfigured-after-submit.jpg).
  `local-auth-providers` records provider IDs, and visit logs record the final URL.
- Proposed files: `app/login/page.tsx` and configuration wiring in `auth.ts`.
  Make displayed methods agree with enabled providers and show recovery feedback.
  Authentication changes are excluded from this branch. The mocked configured
  provider's 503 does show a useful error, as the matrix below distinguishes.

## (c) External-call behavior matrix

All success/error/hang outcomes were driven from the UI on both viewports.
“Hang” means the screenshot after **30 seconds** of a held response, followed
by release; it does not prove an infinite spinner. The final harness uses
35 seconds to avoid the response navigating during screenshot capture.

| Boundary | Success | Error response | At 30 seconds | Scope / evidence |
| --- | --- | --- | --- | --- |
| Stripe checkout | Real local API returns mock destination; browser navigates | Inline “Unable to start checkout”; control reusable | “Opening checkout…”; disabled, no cancel | Actual `/api/stripe/checkout`, outbound HTTPS stub; `stripe-checkout-*` |
| Stripe portal | Real local API returns mock destination; browser navigates | Inline “Unable to open billing portal” | Pending billing control; no cancel | Actual `/api/stripe/portal`, outbound HTTPS stub; `stripe-portal-*` |
| Certificate extraction (Anthropic boundary) | Desktop receipt / phone refreshed-result card | Injected 502 gives visible error; phone retains upload choices; desktop now offers another-file action | Desktop “Uploading & extracting…” at 0%; phone “Reading your certificate… This usually takes about 10 seconds” | Same-origin upload/extraction response mocked; PDF fixture; no model accuracy claim |
| Blob direct upload | Mock token and provider PUT, then JSON finalization and successful receipt | Provider 400 falls back to multipart upload; mocked extraction succeeds, so the user still gets a successful receipt | Upload spinner; no cancel; resolves after release | JPEG; `blob-finalize` logs JSON vs multipart content types; every provider request fulfilled |
| Resend sign-in | Mocked UI contract reaches check-email page | 503/configuration response reaches login with “Sign-in is misconfigured on our end. Please try again shortly.” | “Sending link…” disabled | Provider discovery/sign-in route mocked; no email delivered |

Extraction evidence: [desktop: 752-extraction-success-result.jpg](walkthrough-D/desktop/752-extraction-success-result.jpg); [phone: 734-extraction-success-result.jpg](walkthrough-D/phone/734-extraction-success-result.jpg); [desktop: 754-extraction-error-result.jpg](walkthrough-D/desktop/754-extraction-error-result.jpg); [phone: 736-extraction-error-result.jpg](walkthrough-D/phone/736-extraction-error-result.jpg);
[desktop: 756-extraction-hang-30-seconds.jpg](walkthrough-D/desktop/756-extraction-hang-30-seconds.jpg); [phone: 738-extraction-hang-30-seconds.jpg](walkthrough-D/phone/738-extraction-hang-30-seconds.jpg). Review/failed recovery:
[desktop: 759-extraction-review-result.jpg](walkthrough-D/desktop/759-extraction-review-result.jpg); [phone: 741-extraction-review-result.jpg](walkthrough-D/phone/741-extraction-review-result.jpg); [desktop: 663-recovery-FAILED-reloaded.jpg](walkthrough-D/desktop/663-recovery-FAILED-reloaded.jpg); [phone: 645-recovery-FAILED-reloaded.jpg](walkthrough-D/phone/645-recovery-FAILED-reloaded.jpg).

Blob evidence: [desktop: 764-blob-success-result.jpg](walkthrough-D/desktop/764-blob-success-result.jpg); [phone: 746-blob-success-result.jpg](walkthrough-D/phone/746-blob-success-result.jpg); [desktop: 766-blob-error-result.jpg](walkthrough-D/desktop/766-blob-error-result.jpg); [phone: 748-blob-error-result.jpg](walkthrough-D/phone/748-blob-error-result.jpg);
[desktop: 768-blob-hang-30-seconds.jpg](walkthrough-D/desktop/768-blob-hang-30-seconds.jpg); [phone: 750-blob-hang-30-seconds.jpg](walkthrough-D/phone/750-blob-hang-30-seconds.jpg). Earlier blocked Blob requests in
`run-verification.log` came from a harness hostname assumption (`vercel.com/api/blob/`
versus a storage hostname); corrected reruns are authoritative.

Stripe evidence: [desktop: 738-stripe-checkout-success-result.jpg](walkthrough-D/desktop/738-stripe-checkout-success-result.jpg); [phone: 720-stripe-checkout-success-result.jpg](walkthrough-D/phone/720-stripe-checkout-success-result.jpg); [desktop: 740-stripe-checkout-error-result.jpg](walkthrough-D/desktop/740-stripe-checkout-error-result.jpg); [phone: 722-stripe-checkout-error-result.jpg](walkthrough-D/phone/722-stripe-checkout-error-result.jpg);
[desktop: 742-stripe-checkout-hang-30-seconds.jpg](walkthrough-D/desktop/742-stripe-checkout-hang-30-seconds.jpg); [phone: 724-stripe-checkout-hang-30-seconds.jpg](walkthrough-D/phone/724-stripe-checkout-hang-30-seconds.jpg); [desktop: 747-stripe-portal-error-result.jpg](walkthrough-D/desktop/747-stripe-portal-error-result.jpg); [phone: 729-stripe-portal-error-result.jpg](walkthrough-D/phone/729-stripe-portal-error-result.jpg);
[desktop: 749-stripe-portal-hang-30-seconds.jpg](walkthrough-D/desktop/749-stripe-portal-hang-30-seconds.jpg); [phone: 731-stripe-portal-hang-30-seconds.jpg](walkthrough-D/phone/731-stripe-portal-hang-30-seconds.jpg). Outbound-only proof:
[server boundary log](walkthrough-D/server-boundary.jsonl).

Email evidence: [desktop: 775-email-success-result.jpg](walkthrough-D/desktop/775-email-success-result.jpg); [phone: 757-email-success-result.jpg](walkthrough-D/phone/757-email-success-result.jpg); [desktop: 777-email-error-result.jpg](walkthrough-D/desktop/777-email-error-result.jpg); [phone: 759-email-error-result.jpg](walkthrough-D/phone/759-email-error-result.jpg);
[desktop: 779-email-hang-30-seconds.jpg](walkthrough-D/desktop/779-email-hang-30-seconds.jpg); [phone: 761-email-hang-30-seconds.jpg](walkthrough-D/phone/761-email-hang-30-seconds.jpg). In the actual unconfigured local provider state,
submitting an email returns to login rather than delivering mail; direct
check-email still renders. This is explicitly distinguished from the mocked
success/error/hang contract and is not evidence of production delivery failure.

The mocked upload response reuses a pre-existing real fixture ID for review
links. It does not insert another certificate; the phone's zero gap-change in
that mocked success is therefore a fixture artifact. The genuine manual-entry
flow, separately, demonstrated the 40→38 change.

No live Google/Apple flow or native camera/push delivery was attempted.
A failed exploratory provider interception was blocked by the Node boundary;
its local error is not counted as a provider outage.

## (d) App-shell findings

Phone UA plus `ClearCMEApp/1.0.0` was used for dashboard, setup, compliance,
settings and pricing. The shell evidence records `html[data-app-shell]`, every
`.app-hide` and `.app-only` element's computed display, visible text and redirects.
Screens: [app-shell: 008-app-dashboard.jpg](walkthrough-D/app-shell/008-app-dashboard.jpg); [app-shell: 009-app-dashboard-setup.jpg](walkthrough-D/app-shell/009-app-dashboard-setup.jpg);
[app-shell: 010-app-dashboard-compliance.jpg](walkthrough-D/app-shell/010-app-dashboard-compliance.jpg); [app-shell: 011-app-dashboard-settings.jpg](walkthrough-D/app-shell/011-app-dashboard-settings.jpg);
[app-shell: 012-app-pricing.jpg](walkthrough-D/app-shell/012-app-pricing.jpg).

The final shell test passed. No prices, upgrade buttons or visible `/pricing`
links appeared; `/pricing` ended at `/dashboard`; real checkout and portal API
requests returned 403. These logged-in pages omitted the billing UI at render
rather than leaving `.app-hide` / `.app-only` nodes in the DOM (both arrays were
empty). A disposable DOM probe against the loaded app stylesheet, removed
immediately, measured `.app-hide: display:none` and `.app-only: display:block`;
see `app-shell-css-probe` in the raw shell log. Native WKWebView behavior, Apple purchase sheets and real
physical-device accessibility are not covered by a Chromium UA test.

## (e) Accessibility and keyboard

Keyboard-only NV MD setup completed using Tab/Space/Enter, including native
state selection, MD, Confirm, No and submit. Two rapid Enter presses produced
one persisted license (see `double-submit` events). Evidence:
[desktop: 669-keyboard-double-submit-result.jpg](walkthrough-D/desktop/669-keyboard-double-submit-result.jpg); [phone: 651-keyboard-double-submit-result.jpg](walkthrough-D/phone/651-keyboard-double-submit-result.jpg). Visible in-page Back controls were used
through the NV state-change regression. Browser Back leaves the wizard page
because steps are not history entries; returning restores the draft:
[desktop: 649-browser-back-from-step4.jpg](walkthrough-D/desktop/649-browser-back-from-step4.jpg); [phone: 631-browser-back-from-step4.jpg](walkthrough-D/phone/631-browser-back-from-step4.jpg); [desktop: 650-wizard-return-after-browser-back.jpg](walkthrough-D/desktop/650-wizard-return-after-browser-back.jpg); [phone: 632-wizard-return-after-browser-back.jpg](walkthrough-D/phone/632-wizard-return-after-browser-back.jpg).

D-9/D-10 fix names/associations. D-8/D-12 remain. This was not a full WCAG or
screen-reader audit. No hydration or React key warning was found in completed
flows; raw logs retain injected request failures and the local database error.

## (f) First-time-user friction (unranked; not changed)

1. Setup asks for multiple states before revealing the free-tier limit. The
   primary license is already saved when the additional create returns 402.
   The notice explains plans, but a physician may wonder whether to start over.
   Evidence: [desktop: 639-multi-state-free-402.jpg](walkthrough-D/desktop/639-multi-state-free-402.jpg); [phone: 621-multi-state-free-402.jpg](walkthrough-D/phone/621-multi-state-free-402.jpg).
2. The interface in this checkout uses a large “hours still to log” number,
   credential rows and a pace planner; the brief's named greeting, renewal ring
   and “Hours Still Needed” popover are not rendered controls. The nameless
   avatar falls back to WA; setting Jordan Lee changes it to JL. No “undefined”
   greeting was observed. Evidence: [desktop: 512-dashboard-no-name.jpg](walkthrough-D/desktop/512-dashboard-no-name.jpg); [phone: 496-dashboard-no-name.jpg](walkthrough-D/phone/496-dashboard-no-name.jpg);
   [desktop: 543-dashboard-named-greeting.jpg](walkthrough-D/desktop/543-dashboard-named-greeting.jpg); [phone: 527-dashboard-named-greeting.jpg](walkthrough-D/phone/527-dashboard-named-greeting.jpg).
3. The first compliance visit shows an onboarding explanation before the map
   controls. “Show me my gaps”/“Got it” dismiss it. The meaning of attestations,
   topic suggestions and federal MATE still requires attention; users should
   understand that a suggestion is not a verified topic allocation.
4. Thirty-second waits still use short-duration copy and provide no cancel.
   The observed spinners recover when the held response resolves; a product
   timeout/retry policy would make a slow connection less uncertain.
5. The mobile top navigation is horizontally scrollable while the bottom uses
   Status/Detail/Add. This can make “where is Settings?” less obvious. No global
   overflow or unreachable primary button was established. Taste-only spacing,
   alignment and navigation naming were not changed.
6. Certificate lists say AI-extracted details even for manual entries; reviewed
   and applied hours need especially clear wording (D-3/D-7).

## (g) Coverage

✅ = executed with running-app evidence; ⚠️ = executed with a stated limitation;
❌ = unavailable in this sandbox. “Both” means desktop and phone, not a physical device.

| URL / flow | Coverage | Result / evidence |
| --- | --- | --- |
| `/` | ✅ Both | Loaded; public captures |
| `/pricing` | ✅ Both + shell | Plan cards; shell redirect separately checked |
| `/demo` | ✅ Both | Sample dashboard; labeled sample data |
| `/demo/compliance` | ✅ Both | Sample complete/open/conditional rows |
| `/courses` | ✅ Both | Redirects to `/`; recorded destination |
| `/courses/opioid-prescribing` | ✅ Both | Topic page loaded; course links visible |
| `/mate-act` | ✅ Both | Full page; no facts edited |
| `/methodology` | ✅ Both | Full page |
| `/support` | ✅ Both | Full page |
| `/privacy` | ✅ Both | Full page |
| `/terms` | ✅ Both | Full page |
| `/login` | ✅ Both | Providers/email form; no live provider calls |
| `/login/check-email`, direct | ✅ Both | Check-email page renders |
| Email submission → check-email | ⚠️ Both | Local Resend absent; mocked delivery contract exercised |
| `/unsubscribe`, no token and invalid token | ✅ Both | “Link not recognized”; Settings recovery link |
| Unknown URL / 404 | ✅ Both | Not-found page and HTTP 404 captured |
| Logged-out `/dashboard` | ✅ Both | `/login?callbackUrl=%2Fdashboard` |
| Logged-out `/dashboard/setup` | ✅ Both | Login with matching callback |
| Logged-out `/dashboard/compliance` | ✅ Both | Login with matching callback |
| Logged-out `/dashboard/certificates` | ✅ Both | Login with matching callback |
| Logged-out `/dashboard/certificates/new` | ✅ Both | Login with matching callback; D-5 on sign-in request |
| Logged-out `/dashboard/upload` | ✅ Both | Login with matching callback |
| Logged-out `/dashboard/profile` | ✅ Both | Login with matching callback |
| Logged-out `/dashboard/settings` | ✅ Both | Login with matching callback |
| Actual review sign-in / first landing | ✅ Both | Real JWT exchange/cookie; fresh user lands at setup |
| Provider login returns to callback | ⚠️ Both | Request loses destination (D-5); live provider prohibited |
| NV MD setup / morning Confirm regression | ✅ Both | Landing, Confirm, Edit, estimate, untick, date, change state/back; mutually exclusive states |
| TX MD setup | ⚠️ Both | Full wizard completed; displayed variable schedule, no birth-month select (FQ-D-1) |
| TX birth-month estimate changes | ❌ | Control absent in current verified-source UI; no fact changed |
| CA MD setup | ✅ Both | Variable explanation; empty date; estimate disabled; manual date works |
| NV DO setup, unset / Psychiatry | ✅ Both | Dec 31 even-year text/suggestion; complete wizard for each |
| NV DO psychiatry-only requirement filter | ❌ | No DO rule rows in local DB (FQ-D-2); did not fabricate compliance facts |
| Multi-state / five-license UI cap / free 402 | ✅ Both | Four extra cards; cap; restored draft; 402 notice |
| Refresh steps 1–4 | ✅ Both | State/degree/date restore; step 4 fixed |
| Step 5 conditional question / refresh / failure | ⚠️ Both | Synthetic question at API boundary; real UI; D-1/D-6 |
| In-page Back / browser Back | ✅ Both | Recorded; browser Back is page navigation, not previous step |
| Keyboard-only / double-submit | ✅ Both | NV MD completed; one license persisted |
| First dashboard / onboarded=1 / empty state | ✅ Both | Countdown, hours, next actions, first-run explanation |
| Named / no-name comparison | ✅ Both | Bare and Jordan Lee accounts; avatar/name persistence |
| Renewal ring / hours popover named in brief | ❌ | Not present in this checkout's dashboard; current alternatives inspected |
| Dashboard after certificate / attestation | ✅ Both | Valid 2-hour entry moves 40→38; federal record becomes met |
| Compliance rows / attest / clear / courses | ✅ Both | Real API writes/reload, expanded rows, local course destination |
| Topic suggestions / confirmation | ✅ Both | Fictional ethics title inferred by real API; zero allocated before confirmation; confirmed through UI |
| Empty certificate list | ✅ Both | Empty list and manual/upload entry points |
| Manual fields missing / 0 / negative / 1000 | ✅ Both | Missing disables save; invalid hours return 400 with feedback |
| Future completion date | ✅ Both | 201 NEEDS_REVIEW; misleading generic/AI copy (D-7) |
| Manual valid / duplicate / delete | ✅ Both | 201; 409 duplicate; confirmation then delete |
| PDF / JPEG upload | ⚠️ Both | Real browser file selection; provider boundaries mocked |
| Oversize / wrong MIME | ✅ Both | Desktop feedback fixed; phone size/API feedback |
| Extraction success / error / 30-second hang | ⚠️ Both | UI contract mocks, no live AI |
| NEEDS_REVIEW / FAILED recovery | ✅ Both | Synthetic status on own fixture; real edit/save/reload |
| Profile MATE / DEA / dates / notes | ✅ Both | Real save, reload, persisted notes; local DB glitch retried |
| Settings name / reminders | ✅ Both | Save/reload; Jordan Lee; independent switch states |
| Plan card / checkout / portal | ⚠️ Both | Real local APIs; outbound Stripe mocked |
| Sign out | ✅ Both | Account menu → home; signed back in through review bridge |
| Delete confirmation / cascade / protected redirects | ✅ Both | Disabled until DELETE; 200; user gone; all eight URLs redirect |
| Review login after deletion | ⚠️ Both | Returns 401 until helper recreates bare user; review path intentionally requires fixture user |
| Audit ZIP / certificate export / CE Broker | ✅ Free fences | 402 checked; user-visible upgrade notice; no paid artifact claim |
| Compliance print report | ✅ Both | Popup content captured; native print dialog stubbed |
| Paid ZIP containing actual stored files | ❌ | Fresh free account, no live Blob documents; no billing bypass/paid production record used |
| iOS-shell key screens | ✅ UA emulation | See shell section and final verification addendum |

Public URL screenshots use `logged-out-*`; all visits and final destinations
are indexed in the raw logs. Coverage is intentionally candid: no native
provider, absent rule dataset or absent UI control is marked as fully tested.

## (h) Diff review and confidence

The application diff is limited to five client files and six concerns, each
within roughly 40 changed lines. Setup has two separate intended commits;
use hunk staging per [COMMIT-PLAN-D.md](COMMIT-PLAN-D.md). Four focused unit
checks cover rejection messages and accessible naming. Browser checks cover
state persistence, failed-save recovery and both viewports. No schema/API/auth/
billing/compliance/cron edits; `.env.local` and `.env.prod` were not edited,
and `.env.prod` was never loaded.

Least confidence: the local requirements dataset is not production-equivalent,
particularly DO/legacy NV rows. Provider responses are deliberately simulated;
this is evidence about UI survival, not actual extraction accuracy, email
receipt, Blob permissions, Stripe configuration or native Apple/Google flows.
Synthetic conditional questions prove UI behavior but not which physicians
should receive a real question. Requested file types were tested individually;
mixed-file batches and a real camera capture were not separately exercised. Future-date copy and upload summaries should
be reviewed alongside server semantics before implementing the proposed fixes.

Harness-only limitations were corrected rather than counted as product bugs:
mutable nth-row selectors, screenshot/navigation races, Blob hostname/CORS
matching, and response-body reads after billing navigation. Historical logs
retain these failures. The guard's local pool serialization and bind-origin
normalization are test-environment adaptations only.

## Final verification addendum

- Final repository gate **passed**: `npx tsc --noEmit && npm run lint && npx vitest run`.
  **29 test files / 266 tests passed**, including four new focused checks.
  [Validation log](walkthrough-D/validation-final.log).
- [Final flow run](walkthrough-D/run-final-flows.log): 28 passing cases; six
  intermediate harness failures (same-hash navigation after a fixture status
  change, and an exact-text locator after adding the skip button). No product
  failure was inferred from those locator errors.
- [Corrected rechecks](walkthrough-D/run-final-rechecks.log): **18 passed**,
  including all six cases above, public/protected pages, conditional retry/skip,
  topic confirmation/recovery, keyboard/double-submit and reminder persistence.
- [Final provider/file cases](walkthrough-D/run-final-boundaries.log): **4 passed**
  after the last application change/restart; every success/error/hang scenario
  and rejection/retry passed on both viewports.
- [Final shell](walkthrough-D/run-app-shell-final.log): **1 passed**.
  [Final fresh-account smoke](walkthrough-D/run-smoke-final.log): **2 passed**.
  The complete harness was verified across these focused runs; this is not
  represented as one uninterrupted green full-suite invocation.
- `npm run e2e:walkthrough -- --list` succeeds: 63 project-expanded cases in
  nine files, with irrelevant project cases skipped when run. See
  [discovery log](walkthrough-D/harness-list.log) and [harness README](../tests/e2e/README.md).
- All retained JPEGs meet the 200,000-byte limit. The largest is 197,841 bytes.
  [Evidence index](walkthrough-D/EVIDENCE-INDEX.md) links the latest capture per
  scenario; [inventory](walkthrough-D/evidence-summary.json) gives counts/sizes.
  Every screenshot cited by this report has its matching DOM snapshot.
- The detached dev server was stopped through its run-owned shutdown marker.
  A fresh connection to 127.0.0.1:3000 returns `ECONNREFUSED`:
  [shutdown proof](walkthrough-D/server-stopped.json). The launcher browser and
  Prisma sandbox were left running. The final review user is bare again:
  name/licenseType/specialty null, zero licenses/certificates, confirmed in the
  [read-only inventory](walkthrough-D/local-rule-inventory.json).
- `git diff --check` passes; branch remains `fix/astra-d-walkthrough`.
  No commit, push, main checkout, remote database action or production side
  effect. Per-run auth bridge codes were redacted from the server log.
