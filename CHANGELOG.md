# ClearCME — Changelog

All significant product changes, features, and data updates. Most recent first.

---

## April 13, 2026
- **Building:** Pricing page (/pricing), MATE Act standalone page (/mate-act), methodology page (/methodology), NPPES physician verification
- **Strategic:** Pricing updated to $99/yr Essential, $199/yr Pro, $149/physician/yr Group based on competitive analysis

## April 11, 2026
- **Feature:** Quick Setup wizard — new physicians guided through 3-step setup before hitting empty dashboard
- **Feature:** Demo mode on landing page — Nevada EM physician compliance preview, no login required
- **Feature:** DEA certificate upload with Claude extraction — upload DEA cert, extracts registration date, expiration, schedules; MATE Act logic applied automatically
- **Feature:** Renewal ring visualization — SVG donut chart replaces flat progress bar on dashboard
- **Feature:** Mobile bottom nav — fixed bottom navigation bar on phones
- **Feature:** Hours breakdown popover — tap "Hours Still Needed" tile for per-topic breakdown
- **Fix:** Ring color now uses effectiveHoursNeeded — shows red/amber when mandatory topics unmet even if total hours are met
- **Fix:** Opioid Prescribing CTA → Hippo OUD Decoded
- **Fix:** Compliance page subtitle → "Live status of your state license compliance"
- **Data:** NV MD corrected — ALL 40 hrs must be Category 1 (was missing), 20/40 must be in specialty (was missing) (Vera QA)
- **Data:** CA pain management requirement corrected: 8 hrs → **12 hrs** (Vera QA — critical fix)
- **Data:** TX missing requirements added: Life of the Mother Act, forensic exam CME, EMS Medical Director CME (Vera QA)
- **Data:** NH statute corrected: RSA 329:16-d repealed → RSA 126-A:97 (Vera QA)
- **Data:** SC controlled substance requirement scope corrected: applies to ALL physicians, not just prescribers (Vera QA)

## April 9, 2026
- **Feature:** AI receipt card — polished certificate upload success state with extracted data
- **Feature:** Urgency card on compliance page — "What's urgent this week" with top 2 gaps
- **Feature:** Waitlist two-step flow — captures state after email
- **Feature:** PDF compliance export — print-to-PDF compliance report
- **Feature:** Cohort urgency framing on landing page
- **Feature:** Delete certificates — trash icon + confirmation on all cert lists
- **Feature:** Upload page no longer auto-navigates after success

## April 8, 2026
- **Feature:** Real AI certificate extraction — Claude claude-sonnet-4-6 reads PDFs and images, extracts credits
- **Feature:** Onboarding checklist (3-step), pace indicator, topic-specific CTAs, trust badges
- **Feature:** Pace indicator — "⚡ X hrs/month needed" on compliance bars
- **Feature:** Sidebar navigation
- **Fix:** licenseType validation bug (was silently submitting empty string)
- **Fix:** Profile page defaults → neutral (no NV/DO pre-selected)
- **Data:** DO compliance rules seeded for all 50 states + DC (41 rules, 96 mandatory requirements)

## April 7, 2026
- **Feature:** Compliance logic fix — isCompliant requires both hours AND all mandatory topics met
- **Feature:** effectiveHoursNeeded = max(generalGapHours, mandatoryTopicGapHours)
- **Feature:** All dashboard stat tiles clickable → compliance page
- **Feature:** "Gaps" → "Incomplete" / "Requirements Pending" wording
- **Feature:** Mandatory topic summary shown on dashboard license cards
- **Feature:** Partner URLs wired into compliance CTAs (Hippo OUD Decoded, CME Outfitters)
- **Data:** NV DO HIV bias training requirement confirmed in DB
- **Infra:** Gmail integration live (gogcli + GCP project clearcme-gmail-mrjr)

## April 6, 2026
- **Feature:** Auth working (Google SSO via NextAuth)
- **Feature:** Database connected (Railway PostgreSQL)
- **Feature:** Dashboard, compliance map, upload pages live
- **Feature:** License management (add/delete)
- **Feature:** Settings page
- **Infra:** clearcme.ai live (Vercel + Cloudflare)
- **Data:** MD compliance rules seeded for all 50 states + DC (51 rules, 83 mandatory requirements)

## April 4, 2026
- **Feature:** Terms of Service page (/terms)
- **Feature:** Privacy Policy page (/privacy)

## March 31, 2026
- **Feature:** Tracker MVP — dashboard, upload, compliance pages, Prisma schema, NextAuth
- **Feature:** GitHub repo created, Vercel project connected
- **Data:** Compliance map researched: NV, CA, TX, FL, NY, IL, PA, OH, GA, WA (10 states)

## March 30, 2026 — Day 1
- **Infra:** PARA directory structure created (~/life/)
- **Feature:** Landing page with waitlist capture
- **Data:** Initial compliance map structure created
