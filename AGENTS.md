<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ClearCME site — agent guide

Next.js (App Router) on Vercel; Railway Postgres; NextAuth v5 beta; Stripe.
**Push to `main` deploys production immediately.** Before ANY commit:
`npx tsc --noEmit && npm run lint` must pass. Revert an autonomous ship:
`ssh root@24.199.104.219 '/srv/agents/agents/coo/revert.sh <SHA>'` (or Vercel
Instant Rollback).

## Compliance data — the load-bearing rule

`lib/state-requirements.ts` and `lib/courses.ts` are the product's core promise.
A wrong entry can cost a physician a license renewal — worse than any downtime.

- **Never edit compliance facts from memory or secondary sources.** Every
  change needs a primary source (state board site, statute, admin code) with
  a quoted line, and independent verification per the fleet pipeline
  (Vera flags → Roz confirms → COO ships; humans follow the same bar).
  Confidence rubric: `claude-agents/shared/confidence-rubric.md` in the
  ClearCME project folder — nothing below 90 ships autonomously.
- Full 51-jurisdiction audit baseline with citations (July 2026):
  `~/Documents/Claude/Projects/ClearCME/audit-50/` (MASTER-AUDIT-REPORT.md).
- Commit formats: `compliance: <STATE> <what> (Vera <date> / Roz confirmed <date>)`
  or `catalog: <add|remove|replace|fix> <course> (Scout <date> / COO verified <date>)`.
  One finding per commit, minimal diff.

## state-requirements.ts conventions (learned the hard way, July 2026)

- Renewal schedule kinds are `fixed | birth-based | variable` only. There is
  NO issue-month kind — issue-month states (CA MD, NH) MUST use
  `variableRenewal` with explanatory text; using `birthBasedRenewal` there
  computes WRONG deadline suggestions for users.
- Do not "fix" entries that look odd but are verified correct: TX birth-month
  IS correct; MD (Maryland) renews by LAST-NAME cohort; NV MD is June 30 odd
  years (not birthday); NV DO is Dec 31 even years under the AB 56 transition
  (old annual 35-hr rules govern the Dec 31 2026 renewal, 40-hr biennial after).
- Vendor/aggregator claims are the top error source — the federal DEA MATE
  Act is routinely misattributed as a state mandate. Keep it federal-only.
- Known open questions live in
  `~/Documents/Claude/Projects/ClearCME/audit-50/PRODUCT-DIFF-state-requirements-2026-07-04.md`
  (P2 section) — don't resolve them ad hoc; they're queued for Roz.

## courses.ts conventions

- Every course: deep link to the SPECIFIC activity (never a provider catalog
  page), AMA PRA Category 1 explicitly stated on the live page, price verified
  ("free" must be free without membership unless labeled).
- Dead links: pull-fast/restore-cheap policy — entries are removed after 2
  consecutive dead days and watched 14 days for recovery (restore from git
  history). A daily link checker + Scout + COO handle this; see
  `claude-agents/README.md` in the ClearCME project folder.

## Style / product facts

- Founder byline: **Michael Rushton, DO** — never MD.
- Copy says "hours of CME," never "credits" (except where a board's own term
  is quoted). Design tokens: `clearcme-design-system.md` (Editorial Sage).
- Public compliance claims (homepage marquee, /mate-act, microsites) must
  match `state-requirements.ts` — when you change data, grep `app/` for
  hardcoded copies of the old fact.

## Start from current main — always

`git -C <repo> fetch origin main && git log --oneline -5 origin/main` before you
edit anything. On 2026-07-25 a session edited a **June** copy of
`app/api/stripe/webhook/route.ts` and re-implemented a fix that had shipped
weeks earlier as `c3a7246`. A stale checkout looks exactly like a missing
feature. The fleet's shared clone now hard-resets on every run
(`shared/refresh-repo.sh`); a human or Claude Code session has no such guard.

## Environment and database — two live footguns

- **`.env` does NOT point at production.** It targets a local prisma-dev
  sandbox. The real Railway connection string is in **`.env.prod`**
  (host `maglev.proxy.rlwy.net`). Anything you run that touches data —
  `prisma migrate`, a script, a one-off query — hits the wrong database by
  default and silently appears to succeed. Load `.env.prod` explicitly.
- **Never run `npm run db:seed` against production.** `prisma/seed.js` still
  contains pre-audit compliance data, including the Nevada bioterrorism
  requirement that AB 56 repealed. Re-seeding prod would reintroduce
  requirements the fleet spent July removing, and users would see them.
- Migrations reach prod via `npx prisma migrate deploy` against the Railway
  URL — **writing a migration is not shipping it.** In July, two migrations sat
  unapplied for ~2 weeks while the code that needed them was live; the email
  crons failed quietly per-user with no public breakage and no alert. If your
  change adds a migration, say so explicitly in your handoff.

## Auth invariants — expensive to rediscover

Apple Sign-In took three debugging rounds. Don't undo any of this in `auth.ts`:

- Apple posts back **cross-site** (`form_post`), so Auth.js's default
  `SameSite=Lax` check cookies are not sent and state/PKCE/nonce fail
  **silently**. Check cookies are `SameSite=None` in production only.
- The **`callback-url` cookie needs `SameSite=None` too** — otherwise a
  successful login lands on `/` and reads as a failure when it was actually a
  success.
- Origin is the **apex** domain: `NEXTAUTH_URL=https://clearcme.ai`, Vercel
  primary domain = apex, `next.config` 308s www → apex. Splitting origins
  splits host-scoped cookies and breaks sessions.
- `/api/auth/providers` reveals the effective `NEXTAUTH_URL` — the fastest way
  to diagnose an origin problem.
- **The Apple client secret JWT expires 2026-12-25.** Regeneration key and
  instructions are tracked by the fleet (`shared/expiries.txt`); fleet-watch
  starts reminding 2026-11-25.

## Two auth paths, not one

Several API routes accept **both** a NextAuth session and a mobile JWT via
`getMobileUserId` (`lib/mobile-auth`) — including `app/api/licenses/route.ts`,
`app/api/certificates/route.ts`, and `app/api/certificates/export/route.ts`.
Any route-level change — auth, entitlement, validation — must be placed
**after** the mobile-or-session userId resolution, or it covers only the web.
This is the easiest way to ship a check that appears to work and doesn't.

## Billing and entitlements

- Tier lives on the `Subscription` model (`tier: SubscriptionTier`, default
  `FREE`). `c3a7246` derives entitlement from price **only while** status is
  active/trialing/past_due; cancelled/unpaid/expired fall back to FREE. Don't
  loosen that — it closes the "cancels in Stripe but keeps Pro" hole.
- **As of 2026-07-25 the paid tiers are almost entirely unenforced.** The only
  tier check in the product is `hasFullCourseChoice` in
  `app/dashboard/compliance/page.tsx`. Certificate extraction, all exports, and
  license count are ungated despite being advertised as paid. If you are adding
  enforcement, the spec is
  `~/Documents/Claude/Projects/ClearCME/tier-fence-spec-2026-07-25.md`.
- **There are THREE export surfaces**, and fencing one while missing the others
  is the obvious failure: `app/api/audit-export/`,
  `app/api/certificates/export/`, `app/api/certificates/cebroker-export/`.
- Existing in-product upsell pattern to reuse rather than reinvent:
  `components/dashboard/GapCourseFeed.tsx` (`showUpgradePrompt` prop).

## Cron routes

Vercel Cron invokes **GET**. A route that exports only POST returns 405 and
fails silently forever — this is not hypothetical; the push-reminder route did
exactly that from creation until 2026-07-06. All four routes under
`app/api/cron/` currently export GET. Keep it that way. Schedules live in
`vercel.json`; auth is a bearer `CRON_SECRET` (value in `.env.prod`).

## Who else writes to this repo

An autonomous agent (the "COO", on a droplet) ships to **`lib/state-requirements.ts`
and `lib/courses.ts` only**, several commits a day, with its own verification
gates. It is not aware of your working branch.

- Don't hand-edit those two files casually — you are racing an agent that has
  a stricter evidence bar than you do.
- Expect unfamiliar commits on `main` between your fetch and your push. Rebase,
  don't force.
- Its ship log and the human decision record live in the ClearCME project
  folder under `claude-agents/shared/` — but note those files are **runtime
  state on the droplet**; the local copies are frozen templates and drift. Read
  the droplet copies over SSH if you need current state.
