# Run D walkthrough

Requires the installed Playwright/Chromium, Node with `util.parseEnv`, and the
existing Prisma dev database on **localhost:51214**, with current migrations
already applied. This harness does not seed or migrate. It resets only the
fictional `REVIEW_DEMO_EMAIL` account (`@local.test`) and that address's login
attempt records. Its fixtures are not real CME certificates.

```sh
export REVIEW_DEMO_EMAIL=walkthrough-d@local.test
export REVIEW_DEMO_CODE=WALKTHRU-RUN-D
# Optional launcher-owned browser; omit for a normal local Chromium launch.
export PW_WS_ENDPOINT=ws://127.0.0.1:3333/
npm run e2e:walkthrough -- smoke.spec.ts --project=desktop --project=phone
npm run e2e:walkthrough
```

The wrapper uses a free port 3000, falling back to 3100, and aligns the auth
origins. Playwright starts/stops the guarded dev server. It uses
`WATCHPACK_POLLING=true` and listens on `0.0.0.0` so the connected browser can
reach it. No existing server is silently reused. If a sandbox blocks signals,
create `codex-review/walkthrough-D/stop-server`; the run-owned server preload
exits its processes within a second. Do not stop the launcher browser or Prisma.

For an already running **guarded** server, use the CLI directly (the npm wrapper
owns its port selection):

```sh
WALKTHROUGH_SERVER_EXTERNAL=1 node node_modules/@playwright/test/cli.js test \
  --config tests/e2e/playwright.config.ts --project=desktop --project=phone
```

Set `WALKTHROUGH_BASE_URL`, `NEXTAUTH_URL`, and `AUTH_URL` to the same loopback
origin when changing ports. External-server mode requires the same server
preload and mock credentials as `start-server.cjs`; never point it at production.

## Coverage and evidence

Run the smoke first. For a guided run, select these files in order:

1. `walkthrough.spec.ts`: public URLs, protected redirects, unconfigured email.
2. `setup.spec.ts`: NV MD, TX MD, CA MD, NV DO with/without Psychiatry, refresh,
   browser Back, named account, five-license form and free-tier 402.
3. `interactions.spec.ts`: keyboard-only setup, double-submit, conditional
   save/refresh/retry/explicit skip, login return destination, attestations.
4. `lifecycle.spec.ts`: dashboard, manual certificates, profile, settings,
   export fence, sign-out, account deletion and fresh fixture recreation.
5. `certificate-details.spec.ts`: topic suggestions, review/failed extraction
   recovery, compliance print report and all three free export API fences.
6. `rejections.spec.ts`, `external.spec.ts`: file validation and provider cases.
7. `app-shell.spec.ts --project=app-shell`: dashboard/setup/compliance/settings,
   pricing redirect, hidden web billing UI and Stripe API 403s.

Each project runs serially because it resets the same account. Desktop is
1280×800. Phone uses 390×844 with touch/mobile emulation. App shell adds
` ClearCMEApp/1.0.0` to the phone UA. These are Chromium emulations, not a real
WKWebView, camera, native sheet, VoiceOver or physical iPhone test.

`Evidence` appends full-page JPEGs capped at 200,000 bytes, matching DOM/control
snapshots, and `log-<viewport>.jsonl` under `codex-review/walkthrough-D/`.
It records console errors/warnings, page errors, failed requests, HTTP 4xx/5xx
and mutations. Failed exploratory attempts remain in the evidence; use the
report's final verification references. Review images as well as assertions.

## Isolation and mocks

`createFreshUser()` reads DATABASE_URL only from `.env.local`, validates the
host/port, then imports the app Prisma client. It creates only email and
emailVerified; `{name: 'Jordan Lee'}` adds the named-provider comparison.
`signIn()` uses the real review verify → JWT exchange → web-cookie bridge.
The server supplies an ephemeral secret in both local auth environment names;
no application auth code or cookie policy changes. A dev bind-address redirect
is normalized back to localhost after the bridge sets the real cookie.

Browser routing and the Node preload deny non-loopback connections. Resend,
Anthropic and Blob keys are empty in the server child. Stripe receives a dummy
key: requests reach the real local checkout/portal APIs, then its outbound HTTPS
transport is mocked. Other provider scenarios use Playwright boundary responses;
they test UI contracts, not provider delivery or extraction accuracy. A
35-second delay provides a stable screenshot at 30 seconds, then resolves.
`WALKTHROUGH_SERVICES=stripe,blob` limits the external matrix during a rerun.

The preload serializes the local Prisma dev driver's pool (max 1) to avoid
observed PGlite prepared-statement cross-talk. No production code imports it.
Fixtures are generated with the already installed Sharp dependency by
`node tests/e2e/helpers/make-fixtures.cjs`. No installs were made by the agent.

All browser specs are `.spec.ts`; Vitest remains `tests/**/*.test.ts`.
Run the final repository gate independently:

```sh
npx tsc --noEmit && npm run lint && npx vitest run
```
