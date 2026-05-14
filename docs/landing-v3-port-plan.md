# ClearCME Landing Page v3 — Port Plan

Source spec: `landing-v3-sage.html` handoff from Michael, 2026-05-13.
Status: awaiting actual source HTML file for exact CSS/data URI/component port.

## Recommended implementation

Port the static HTML design into the existing Next.js app rather than dropping in raw HTML.

Primary target:
- `app/page.tsx` for page composition
- `app/globals.css` or a landing-specific CSS module for design tokens + section styling
- new reusable components under `components/landing/`

## Sections to implement in order

1. Sticky nav
2. Renewal-date marquee
3. Hero with CSS-built dashboard mockup, squiggle underline, highlighter swash, live badge, sticky note, and math strip
4. State preview wired to existing `lib/state-requirements.ts` data rather than 10-state inline object
5. What’s included asymmetric feature grid: 4-2 / 2-4 / 3-3
6. Guarantee panel with Compliance Promise and $1,000 stamp
7. Before / With comparison cards
8. Multi-state physician card stack
9. Pricing tiers: Free / Essential / Pro
10. FAQ using native `<details>`
11. Founder quote panel
12. Final CTA
13. Footer

## Design tokens

Port source `:root` tokens:
- `--ink #1E2920`
- `--ink-2 #3F4A40`
- `--ink-3 #6B7568`
- `--bg #F4EFE3`
- `--bg-2 #ECE4CF`
- `--paper #FFFDF6`
- `--line #DDD4BD`
- `--line-soft #ECE3CA`
- `--primary #3F5F33`
- `--primary-2 #2A4123`
- `--pop #DD6B40`
- `--pop-2 #B85631`
- `--warm #C9933C`
- `--cool #4D8C7F`
- `--rose #B85F5F`
- `--mauve #8B7AB8`

Typography:
- Fraunces for display/headings/brand mark
- Inter for body/UI
- JetBrains Mono for numbers/eyebrows/mono labels

## Brand/copy rules

- Say “hours of CME,” never “credits.”
- Be confident and specific, not hedged.
- Reassurance-first; urgency only when real.
- Founder voice is warmer than product voice.
- Do not name competitors or mention spreadsheets/state-board portals/tools by name.
- Protect the Guarantee sentence: “We’ve never paid this out.” Remove it if the Compliance Promise is ever paid.
- Marketing page is state-licensure focused only. No specialty-board or MOC language.
- Preserve the density/asymmetry/rotations/mixed typography/marquee/hand-drawn marks; these are intentional, not decoration to simplify away.

## Wire-up decisions

Pending Michael decisions before launch:
1. CTA route: `/login` everywhere or separate signup/signin.
2. Dashboard sample: keep fictional “Dr. R. Patel · Nevada,” anonymize to “Sample physician,” or use real screenshots.
3. Founder avatar: initials “MR” or real headshot.
4. Confirm operational ability/process for $1,000 Compliance Promise.
5. Confirm Stripe can fulfill 30-day full refunds without proration/fee deduction.
6. Track refund rate; >5–8% should trigger onboarding/product review.

## Accessibility/performance/SEO requirements

- Add `prefers-reduced-motion` guard for marquee, reveal transitions, ring fill, and dashboard hover rotation.
- Add visible `:focus-visible` styles for cream and dark surfaces.
- Keep marquee `aria-hidden="true"`.
- Use native select controls for state picker and native details/summary for FAQ.
- Self-host or optimize Google fonts before launch if feasible.
- Add canonical link, Twitter Card metadata, real OG image, and structured data for Organization/Product/Offer.
- Add analytics hooks for hero CTA, pricing CTA per tier, state picker interaction, and FAQ opens.

## Implementation note

Do not start the faithful visual port until `landing-v3-sage.html` is available locally, because the source contains the exact CSS, data URI SVGs, dashboard mockup rules, and copy that should not be approximated.
