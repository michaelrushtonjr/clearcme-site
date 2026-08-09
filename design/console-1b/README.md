# Handoff: ClearCME — Login, Logged-in App (Console), Landing Copy Changes

## Overview
Three deliverables for the ClearCME product (CME compliance tracking for physicians):

1. **Login page** — full implementation spec + screenshot (`01-login.png`).
2. **Logged-in app, "Console" direction (1b)** — full implementation spec + screenshots of all six views (`02`–`09`).
3. **Landing page — copy changes only.** No layout or visual changes; apply the copy edits in the "Landing Page Copy Changes" section to the existing live hero.

## About the Design Files
The bundled `ClearCME App.dc.html` + `support.js` are **design references created in HTML** — interactive prototypes showing intended look and behavior, not production code. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, etc.) using its established patterns and libraries — or, if no app codebase exists yet, choose an appropriate framework and implement them there. Open `ClearCME App.dc.html` in a browser to click through everything; all styling is inline on the elements, so exact values can be read straight off the markup.

Note: the prototype file also contains an earlier dashboard direction ("1a") and the landing hero mock ("3a"). **Implement only 1b and the login (2a).** 3a exists solely as the visual reference for the copy changes below. The prototype also includes 390px mobile layouts for the 1b screens (hidden behind a `showMobile` toggle in the file) — use them as the responsive reference.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final. Recreate pixel-perfectly, substituting the codebase's own primitives (buttons, inputs, nav) where they can match the spec exactly.

## Design Tokens

Fonts (Google Fonts):
- **Newsreader** (serif, optical sizing, 400–600) — display numbers, card titles, page titles
- **Plus Jakarta Sans** (400–700) — body, UI
- **JetBrains Mono** (400–600) — eyebrows/labels (letter-spaced, ~10–11px), numeric data, status chips

Colors:
- Canvas `#EFEBDF` · card surface `#FBFAF5` · table-header band `#F0ECE1` · hover row `#F6F3EA`
- Ink `#101613` (1b) / `#16201A` (login) · secondary text `#4B5349`/`#4A5148` · muted `#6E7669`/`#7B8177` · faint `#8A9086`
- Forest (primary/actions) `#22371F` · brand green `#2E4A2C` · dark panel `#101613`
- Terracotta (logo mark only) `#C4451F`
- On-dark: text `#F6F5F0`, secondary `#9AA396`, green accent `#9FBE93`/`#8FA787`, list text `#C6CFC1`/`#DDE7D7`
- Status: met/on-track green `#2E4A2C` (chip bg `#E3E7DA`), open/warn amber `#A9722A` (chip bg `#F3E3CC`), neutral `#8A9086`
- Borders: `rgba(16,22,19,.13)` cards · `.06` row dividers · `.1` section dividers · `.2` outline buttons

Radii: cards 10px, buttons 8px, pills 999px, phone frame 44px, deadline pills 8px.
Shadow (page-level frames only): `0 24px 60px -30px rgba(22,32,26,.45)`.
Progress bars: 5px tall, radius 99px, track `#E7E6DF`.
Type scale: page titles 32px Newsreader; card titles 20–22px Newsreader; hero number 54px Newsreader 500; body 13.5–14px; captions 11.5–12px; mono labels 10–11px with `.1–.16em` tracking; numerals `font-variant-numeric: lining-nums tabular-nums`.

Logo: 24–28px square, radius 6–8px, bg `#C4451F`, white "✓" — then wordmark "Clear**CME**" (700), "CME" in `#2E4A2C` on light / `#9FBE93` on dark.

---

## Screen 1: Login (`01-login.png`)

**Purpose:** Sign in; also the first brand moment. Two visible paths: magic-link/OAuth sign-in, and a no-signup demo mode.

**Layout:** Full-viewport split. Left brand panel (flex 1.15, bg `#22371F`, padding 52px 56px). Right form panel (flex 1, bg `#EFEBDF`, centered 400px column).

### Left panel (dark forest)
- Logo top-left.
- 64px below: Newsreader 46px `#F6F5F0`, max-width 440px: **"Your CME compliance, handled."**
- Sub (15.5px, `#B4C4AD`, lh 1.6, max 400px): "Every state you're licensed in, every mandated topic, every deadline — checked against state board sources and kept current."
- Three bullets (7px dot `#9FBE93`, 14.5px `#DDE7D7`):
  - "All 50 states and DC, plus DEA registration"
  - "Reads your certificates and files the hours for you"
  - "Free to start · every requirement verified by a physician"
- Pinned to bottom (`margin-top:auto`): **live status preview card** — bg `#101613`, radius 12px, padding 20px 22px, max 420px. Header row: mono 10px "WHAT YOU'LL SEE INSIDE" (`#8FA787`) / "LIVE STATUS" (`#6E7669`). Big line: Newsreader 32px "20.0" + "hours still to log · 3 credentials" (13.5px `#9AA396`). Divider `rgba(255,255,255,.12)`, then three rows (13px `#C6CFC1` left, mono 11.5px right):
  - California — MD · `32.0 / 50 · ON PACE` (`#8FA787`)
  - New York — MD · `1 / 2 TOPICS` (`#E3BE84`)
  - DEA — federal · `MATE 6.0 / 8` (`#E3BE84`)

### Right panel (form)
- Newsreader 30px "Welcome back" + 14px `#6B7268` "Sign in to see where every license stands."
- Card (bg `#FBFAF5`, radius 14px, padding 26px, 12px gap):
  - " Continue with Apple" — bg `#16201A`, white text, radius 10px, 13px padding, hover bg `#000`
  - "G Continue with Google" — bg `#FDFCF8`, 1px border `rgba(22,32,26,.18)`, hover border `#2E4A2C`; "G" in Newsreader 600 `#C4451F`
  - "OR" divider (mono 10px between 1px lines)
  - EMAIL label (mono 10px) + input (radius 10px, placeholder "you@practice.com")
  - Primary: **"Email me a sign-in link"** — bg `#2E4A2C`, hover `#22371F`
  - Helper (12px `#7B8177`, centered): "No passwords — we send a link that signs you in."
- **Demo entry** below card: dashed border `rgba(46,74,44,.35)`, radius 12px, padding 16px 18px, hover bg `#F4F1E7`. Left: "New here? See it with sample data first" (14px 600) + "Pick a state, see the requirements — no sign-up." (12.5px `#7B8177`). Right: "→" in `#2E4A2C`. Routes into the app with sample data (see DEMO DATA pill below).
- Footer (12px `#7B8177`, centered): "By signing in you agree to our **Terms** and **Privacy Policy**. Your certificates are encrypted in transit and at rest."

**Behavior:** Magic-link auth (no password field anywhere). Email button → confirmation state ("check your email"). OAuth buttons → provider flows. Demo card → app in demo mode.

---

## Logged-in App — "Console" (1b)

**Shell:** 60px top bar, bg `#22371F`: logo; nav items (13.5px, padding 8px 14px, radius 8px — active bg `rgba(255,255,255,.14)` text `#F6F5F0` 600, inactive `#B4C4AD`, hover bg `rgba(255,255,255,.09)`): Dashboard · Compliance · Certificates · Licenses · Upload · Settings. Right: **DEMO DATA** pill (mono 10.5px `#9FBE93`, 1px border `rgba(159,190,147,.4)`, pill radius — demo mode only) + 30px avatar (bg `#3D5A38`, initials). Content scrolls below; page padding 30px 32px 44px on `#EFEBDF`.

Sample-data persona used throughout: Waldo Rushton ("WR"), MD in California + New York + DEA registration; 35.0 hrs filed, 20.0 still to log.

### Screen 2: Dashboard (`02-1b-dashboard.png`)
**Purpose:** One glance = where do I stand; one interaction = am I on pace.

**Header row** (space-between, align flex-end):
- Left: eyebrow "COMPLIANCE STATUS · 3 CREDENTIALS"; hero stat Newsreader 54px "20.0" + "hours of CME still to log" (17px `#4B5349`); three **deadline pills** (bg `#FBFAF5`, border, radius 8px, padding 9px 14px): mono 9.5px state label (NEW YORK in amber `#A9722A`, CALIFORNIA and DEA in `#22371F`), then date 13.5px 600 + relative months mono 11px `#8A9086` ("Sep 30, 2027 · 14 months", "Feb 1, 2028 · 19 months", "Jun 30, 2028 · 23 months").
- Right buttons: "Add certificate" (outline: border `rgba(16,22,19,.2)`, bg `#FBFAF5`) + "Export record" (filled `#22371F`, hover `#101613`). Both radius 8px, padding 11px 18px, 13.5px 600.

**Body grid** `1.5fr 1fr`, gap 20px:

*Left — Requirement ledger card:* header "Requirement ledger" (Newsreader 20px) + mono "SOURCES CHECKED JUL 12 2026". Three groups, each with a band row (bg `#F0ECE1`, mono 11px): "CALIFORNIA — MD / RENEWS FEB 1 2028 · 18.0 LEFT", "NEW YORK — MD / RENEWS SEP 30 2027 · 2.0 LEFT", "FEDERAL — DEA REGISTRATION / RENEWS JUN 30 2028 · 2.0 LEFT". Requirement rows: 6px status dot · name 14px 500 + note 11.5px `#8A9086` · 88px progress bar · hours mono 12.5px · status chip mono 10.5px 600 right-aligned (ON PACE/CURRENT muted, MET green, OPEN amber, N/A gray). Row data:
- CA: General hours 32.0/50 ON PACE · End of life care 12.0/12 MET · Substance use 6.0/8 OPEN · Geriatric medicine n/a N/A
- NY: Infection control 3.0/3 MET · Child abuse identification 0.0/2 OPEN
- DEA: MATE Act training 6.0/8 OPEN ("The 6.0 hours you filed for California count here too.") · Registration renewal — CURRENT

*Right rail:*
1. **Pace planner** (bg `#101613`, radius 10px, padding 22px): header mono "PACE PLANNER" `#8FA787` / "20.0 hrs left"; Newsreader 40px pace value + "hours / month"; range slider 0.5–6 step 0.5 (default 2.0, accent `#2E4A2C`); divider; "You'd finish {Month Year}" (mono 14px 600) and "Last deadline — Jun 30, 2028". **Verdict banner** (radius 8px, padding 12px 14px, 13.5px 600) recomputed live: finish = ceil(20 / pace) months from now. Tiers: ≤14 mo → green tint `rgba(120,170,110,.18)`/`#B5D0AB` "Everything closes before New York on Sep 30, 2027 — your earliest deadline."; ≤19 → amber tint "New York slips past Sep 30, 2027. California and the DEA renewal still clear."; ≤23 → amber "Only the DEA renewal still clears. New York and California both slip."; else red tint `rgba(200,90,60,.2)`/`#EEA98F` "Too slow — every deadline slips." Disclaimer 11.5px `#6E7669`: "A planning estimate from the hours you've filed. You're always responsible for what your board requires."
2. **Next actions** card: numbered rows (mono number, 13.5px 600 title, 11.5px sub, "→"), click navigates:
   - 1 "Log 2 hours of child abuse identification" / "New York · one-time requirement, still open" → Compliance
   - 2 "Finish the substance use requirement" / "Closes California and DEA MATE together · 6.0 of 8.0 filed" → Compliance
   - 3 "Confirm your geriatric medicine history" / "Only applies above 25% elderly patients" → Settings

### Screen 3: Compliance (`03`–`05`)
**Purpose:** The full audit-grade record per credential, plus course matching to close gaps.

- Header: eyebrow "FULL RECORD", title "Compliance detail" (Newsreader 32px); right: "Audit ZIP" (outline) + "Compliance report" (filled).
- **Credential tabs** (mono 11.5px 600, radius 7px): CALIFORNIA · NEW YORK · DEA · FEDERAL. Active: bg `#22371F` white; inactive: bg `#fff`, border `rgba(16,22,19,.18)`.
- **Stat cards** ×4 (grid): HOURS FILED 35.0 "across 6 certificates" · STILL TO LOG 20.0 (amber) "across 3 credentials" · TOPICS MET 2/5 "1 not applicable" · NEXT DEADLINE 431d "New York · Sep 30 2027". Values mono 24px 600.
- **Requirement table**: dark header band (bg `#22371F`) with credential title (Newsreader 22px `#F6F5F0`) + subtitle + "SOURCES CHECKED JUL 12 2026" + status chip (ON TRACK green / ACTION NEEDED amber). Column band (bg `#F0ECE1`, mono 10px): REQUIREMENT / RULE / PROGRESS / STATUS. Each row includes a source line (mono 10px `#A2A79B`), e.g. "Source: Medical Board of California · verified Jul 12, 2026". Per-tab content mirrors the ledger data above; titles/subtitles:
  - California — MD · "Renews February 1, 2028 · 50 hours every 2 years" · ON TRACK
  - New York — MD · "Renews September 30, 2027 · mandated topics only" · ACTION NEEDED
  - DEA registration — federal · "Renews June 30, 2028 · one-time training, attested at renewal" · ACTION NEEDED
- **"Fill what's left" course-match card**: header "Fill what's left" (Newsreader 20px) + "Accredited courses matched to your open gap, cheapest first" + amber gap label (mono, per tab: "SUBSTANCE USE · 2.0 HRS LEFT" / "CHILD ABUSE ID · 2.0 HRS LEFT" / "MATE ACT · 2.0 HRS LEFT"). Course rows: name 14.5px 600 + optional cross-credit badge (pill, bg `#E3E7DA`, `#2E4A2C`: "COUNTS IN 2 PLACES" / "COUNTS IN 3 PLACES") + provider line "· AMA PRA Category 1 ·" + fill tags (mono 9.5px, bg `#F0ECE1`) like `CA SUBSTANCE` `DEA MATE`; right: hrs, price (FREE / $19 / $29, mono 600 `#22371F`), "View course →" filled button. CA/DEA tabs share the two SUD courses; NY shows two child-abuse-ID courses. Footer strip (bg `#F6F3EA`, 12px): "Matched from vetted, accredited providers only. Course completion still comes back to you as a certificate — upload it and the gap closes."

### Screen 4: Upload (`06-1b-upload.png`)
**Purpose:** Certificate intake with a visible read → confirm pipeline; nothing auto-counts.

Two-column grid (min-height 470px):
- Left: **dropzone** (card, centered: "↑" tile 46px bg `#EDF1EA`, "Drop files here" Newsreader 22px, "PDF, JPG or PNG · up to 10MB each. Encrypted in transit and at rest.", "Browse files" filled button) + **"HOW A CERTIFICATE BECOMES AN HOUR"** card with numbered steps: 01 "You add the file / Photo, scan or PDF — however the provider sent it" · 02 "We read the hours and topic / Usually about ten seconds per certificate" · 03 "You confirm the match / Only then does it count toward a requirement".
- Right: **PROCESSING QUEUE (3 FILES)** — rows with status dot + filename + detail + hrs + state (mono): `cardiology-update-2026.pdf` FILED (green, "Read — 8.0 hrs · matched to California general") · `opioid-prescribing-cert.pdf` REVIEW (amber, "Read — needs your confirmation on the topic match") · `grand-rounds-may.jpg` WORKING (gray, "Reading the certificate…"). Below: LAST FILED MATCH block ("Cardiology Update 2026 · Feb 2, 2026" → "California — general hours **+8.0**"). Footer bar (bg `#F6F3EA`): "Nothing counts toward a requirement until you confirm the match." + "Review 1 match" button.

### Screen 5: Certificates (`07-1b-certificates.png`)
Eyebrow "35.0 HOURS ON FILE", title "Certificates", "Add certificate" button. Table columns ACTIVITY / PROVIDER / DATE / HRS / APPLIED TO; applied-to tags are mono pills (bg `#EDF1EA`, `#22371F`) like `CA END OF LIFE`, `CA GENERAL`, `NY INFECTION` — one cert ("Opioid Prescribing & SUD") shows two tags (`CA SUBSTANCE` + `CA GENERAL`), demonstrating one certificate splitting across requirements. Six rows, see prototype for exact data.

### Screen 6: Licenses (`08-1b-licenses.png`)
Title "Licenses". Three-card grid:
- **CA — MD** (light card): chip ON TRACK; facts: Cycle requirement "50 hours / 2 years", Mandated topics "3 (1 open)", Practice setting "Outpatient specialty"; "Edit license →".
- **NY — MD**: chip ACTION NEEDED; facts: "Mandated topics only", "2 (1 open)", "Outpatient specialty".
- **DEA — FEDERAL** (dark card, bg `#101613`): chip MATE OPEN (amber); masked number `BW••••563` (mono `#8FA787`); facts: Registration "Expires Jun 30, 2028", MATE Act training "6.0 of 8 hours", Schedules "II–V"; footnote: "Federal, not state — one training requirement that your California hours already count toward."
- **"+ Add a credential"** dashed tile: "A state license or a DEA registration. We map its requirements and re-check your filed hours against them."

### Screen 7: Settings (`09-1b-settings.png`)
Max-width 860px. Cards:
- **One-time topics** (header chip "1 UNCONFIRMED" amber): End of life care ✓ 2026 · Substance use — open, buttons "I've done this" (filled) / "Still need it" (outline) · Geriatric medicine ✓ N/A ("marked not applicable to your practice").
- **Reminders**: toggles (38×22 pill, on = `#22371F`) — "Renewal reminders / 90, 60, 30 and 7 days out, with your hours and what is left" · "Monthly digest / One note per license: hours filed, topics open, and the pace that finishes on time".
- **Plan**: CURRENT "Pro — $199/year" + Manage link; "Unlimited state licenses, cross-state hour reuse, DEA MATE tracking, and audit-ready exports. 30-day money-back guarantee."

### Mobile (reference in prototype, `showMobile` toggle)
390px layouts exist for Status (hero number + deadline pills + pace planner + ledger cards), Detail (per-requirement cards), and Add (camera-first upload + queue), with a 3-tab bottom bar STATUS / DETAIL / ADD. Follow them for responsive breakpoints.

## Interactions & Behavior
- Top-bar nav switches views client-side; active state as specified. Row hover bg `#F6F3EA`; button hovers darken one step (`#22371F` → `#101613`; `#2E4A2C` → `#22371F`).
- Pace planner slider updates pace value, finish month, and verdict banner live (no debounce needed; pure arithmetic).
- Next-action rows navigate to the relevant screen (Compliance/Settings).
- Compliance tabs swap the requirement table, header, chip, and course list; stat cards stay global.
- Demo mode: identical UI + DEMO DATA pill; entered from the login demo card.
- Upload: queue states WORKING → REVIEW → FILED; user confirmation gates the REVIEW → FILED transition.

## State Management
- `activeView` (dashboard/compliance/certificates/licenses/upload/settings), `activeCredential` (CA/NY/DEA), `paceHrsPerMonth` (0.5–6), `demoMode`.
- Derived: totals (hours filed/remaining per credential), finish date = now + ceil(remainingHrs / pace) months, verdict tier vs. deadline list.
- Data fetches: credentials + requirements (with source + verified date per requirement), certificates (with per-requirement allocations), course matches per open gap, upload queue (poll or push while WORKING).

## Assets
No raster assets. Logo is CSS (colored square + ✓ + wordmark). Fonts from Google Fonts (see tokens).

## Files
- `ClearCME App.dc.html` — interactive prototype: landing hero (3a), login (2a), app directions 1a + **1b**. Open in a browser; requires `support.js` beside it.
- `support.js` — prototype runtime (not for production).
- `screenshots/01-login.png` … `09-1b-settings.png` — captures referenced above.

---

# Landing Page Copy Changes (copy only — no layout/visual changes)

Reorder the hero's reading order: the brand line becomes the h1, the guarantee becomes the serif subhead. Keep the existing ring gauge, sticky note, dark state ticker, Live pill, and orange accent exactly as they are.

1. **H1 →** `Your CME compliance, handled.` — with "handled." emphasized (italic, accent color, underline, matching current accent treatment).
2. **Serif subhead (directly under h1) →** `Compliant for your next renewal — or your money back.` — with "or your money back." italic in brand green. (The guarantee moves here from the h1.)
3. **Supporting paragraph →** `Under 60 seconds of setup. ClearCME maps your state's requirements, reads your certificates, and shows exactly what's missing — and the cheapest accredited way to fill it.` — "Under 60 seconds of setup." bold.
4. **Primary CTA →** `See your gaps in 60 seconds` · **Secondary link →** `How the guarantee works →`
5. **Trust row (mono caps under CTAs) →** `ALL 50 STATES + DC` · `MD & DO` · `BUILT BY A PHYSICIAN`
6. **Sticky note →** `↳ exactly what's missing, in plain English.`
7. **Live pill →** `Live — auto-updated when state boards change rules`
8. **Placement note:** move the "$99 vs $500 penalty" cost-benefit panel below the fold — the guarantee subhead should be the only urgency moment above the fold.

Reference render: the `3a` section at the top of `ClearCME App.dc.html`.
