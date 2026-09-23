# Run E intended commits

No commits or pushes were made. Work remains on
`fix/astra-e-walkthrough-followups`, starting at `c3c86c3`. Never commit/push
`main`. The post-run pass should use the items below and run the repository gate
before each commit. Stage only the files listed for each item; the shared files need hunk staging.

1. **Harness / evidence routing**
   - Message: `test: isolate Run E walkthrough evidence (D-5, D-6, D-7, D-8, D-12, D-13)`
   - Files: `tests/e2e/helpers/evidence.ts`, `tests/e2e/helpers/server-guard.cjs`,
     `tests/e2e/playwright.config.ts`, `tests/e2e/run-walkthrough.cjs`,
     `tests/e2e/start-server.cjs`, `tests/e2e/external.spec.ts`, `tests/e2e/README.md`.
   - Routes all evidence/log/mock/shutdown paths through
     `WALKTHROUGH_EVIDENCE_DIR`; Run D remains the default. Existing server
     isolation and loopback/browser-server configuration stay intact.
   - Verified: all Run E browser logs, final browser run, JPEG inventory,
     server-stopped proof. No writes to `walkthrough-D` in this run.

2. **E1 — configured sign-in options and errors**
   - Message: `fix: show configured sign-in options and auth errors (D-13)`
   - Files: provider availability/error hunks in `app/login/page.tsx`,
     `lib/auth-error-message.ts`, `tests/lib/auth-error-message.test.ts`;
     shared imports/phase constants and the E1 test in
     `tests/e2e/followups-e-login.spec.ts`.
   - Do not stage the callback helper/import/local variable or callback call-site
     replacements yet. Those belong to item 3.
   - Verified: E1 browser tests on both viewports (actual absent Resend, mocked
     configured providers, Configuration notice); 12 error-mapping unit cases.
   - No `auth.ts`, provider options, callbacks, cookies or secret handling changes.

3. **E2 — preserve safe return destinations**
   - Message: `fix: retain safe requested sign-in destinations (D-5)`
   - Files: remaining callback hunks in `app/login/page.tsx`,
     `lib/login-callback.ts`, `tests/lib/login-callback.test.ts`, E2 tests in
     `tests/e2e/followups-e-login.spec.ts`.
   - Verified: 15 callback unit cases; Google protected-page request, Apple and
     email boundary mocks, external destination fallback on both viewports.

4. **E3 — truthful manual-review feedback**
   - Message: `fix: explain why manual CME entries await review (D-7)`
   - Files: `components/ManualCertificateEntry.tsx`, manual review-copy import /
     `isManualEntry` / row-copy hunks in `components/CertificateList.tsx`,
     `lib/manual-certificate-review.ts`, `tests/lib/manual-certificate-review.test.ts`,
     `tests/e2e/followups-e-manual.spec.ts`.
   - Do not stage the `useId`, export or label/control association hunks in
     `CertificateList.tsx` until item 5.
   - Verified: six unit cases; real 201 NEEDS_REVIEW, correction PATCH to
     COMPLETED, dashboard 40.0 → 40.0 → 38.0 on both viewports.

5. **E4 — recovery/edit field associations**
   - Message: `fix: associate certificate recovery form labels (D-12)`
   - Files: remaining `components/CertificateList.tsx` hunks,
     `components/CertificateUpload.tsx`, `tests/app/dashboard/recovery-labels.test.ts`,
     `tests/e2e/followups-e-labels.spec.ts`.
   - Verified: four repeated-form rendering tests; ten unique list controls at
     both viewports; eight unique controls for each desktop two-card upload
     scenario; D-3 confirmed/pending session-ledger browser regression.
   - Named component exports make markup testable; upload/save/counting logic
     is unchanged. Phone continues to use its existing camera uploader.

6. **E5 — phone hit areas**
   - Message: `fix: enlarge phone account and response targets (D-8)`
   - Files: `components/console/ConsoleShell.tsx`,
     `app/dashboard/settings/SettingsClient.tsx`,
     `components/dashboard/RequirementAttestation.tsx`,
     `tests/e2e/followups-e-targets.spec.ts`.
   - Verified: phone DOM boxes ≥40×40, switch outer-edge click, account-menu
     operation, desktop before/after image comparison. Existing reminder naming
     unit test still passes; no implementation-mirroring CSS unit test added.

7. **E6 — resume submitted setup questions**
   - Message: `fix: restore submitted setup questions without resubmission (D-6)`
   - Files: `app/dashboard/setup/SetupWizard.tsx`,
     `tests/app/dashboard/wizard-draft.test.ts`,
     `tests/e2e/followups-e-wizard.spec.ts`, `tests/e2e/interactions.spec.ts`.
   - Verified: seven compatible-answer unit cases; answer/refresh, failed restore
     GET/reload, no-questions redirect, exactly one license POST, D-1 retry/skip,
     keyboard/double submit, NV MD step-3 and D-4 step-4/multi-license refresh.
   - Submitted wizard drafts cannot return to license submission. Existing
     Licenses-page editing remains available. Original initial-fetch fail-open
     behavior stays; failed restore fetches preserve draft answers.

8. **Report and evidence**
   - Message: `docs: record Run E verification for D-5, D-6, D-7, D-8, D-12 and D-13`
   - Files: `codex-review/RUN-REPORT-E.md`, `codex-review/COMMIT-PLAN-E.md`,
     `codex-review/FACT-QUESTIONS-E.md`, `codex-review/walkthrough-E/`.
   - Verified: final gate and browser logs, linked screenshot/DOM pairs, JPEG
     size inventory, request counts, visual comparison and shutdown proof.
   - Review evidence size before staging; retain the full deliverable locally
     if the repository's evidence policy stores screenshots elsewhere.

Final required gate: `npx tsc --noEmit && npm run lint && npx vitest run`.
No migration, dependency change, compliance-data change or deployment is involved.
