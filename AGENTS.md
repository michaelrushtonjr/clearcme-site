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
