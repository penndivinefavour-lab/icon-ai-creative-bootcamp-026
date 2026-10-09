# Implementation Plan — Icon AI and Creative Bootcamp '26

Approved truth from the master build document. This is the plan the code was
built against; each item is verified by `scripts/check_prices.py` where a
machine can check it.

## 1. Foundation

- [x] Private GitHub repository created under the authenticated account:
      `penndivinefavour-lab/icon-ai-creative-bootcamp-26`
- [x] Local working tree initialised on `main`, remote set, commit pushed.
- [x] Static architecture only — no backend, database, Supabase, Workers,
      Functions, paid dependency, framework or recurring-cost service.
- [x] Cloudflare Pages can deploy `main` as-is (root output, `_headers`).

## 2. Single source of truth

- [x] `assets/js/config.js` holds prices, discount dates, Selar URLs,
      WhatsApp URL, email, phone, crash-course config, bundle visibility,
      certificate config, the domain, **campaign dates, the five packages,
      the 10 Selar product slots, the gallery items and the sample-project
      items**.
- [x] Changing a value in one place updates the whole page — no scattered
      edits.
- [x] `docs/CONFIG_GUIDE.md` documents every key.
- [x] `scripts/check_prices.py` validates the config, not just the HTML.
- [x] **Campaign schedule (Founder-approved):** registration/site campaign
      opens Saturday 10 October 2026; the Bootcamp begins Saturday 7 November
      2026 and runs 30 days. Both dates live in `config.campaign` as explicit
      ISO strings with a `+01:00` offset, so the countdown is timezone-safe.

## 3. Pricing (binding)

- [x] Tracks in the approved order: Graphic Designing, Prompt Engineering,
      Image Generation, AI Automation, AI Video Generation.
- [x] Approved prices **including the certificate** (D-008): 6,000 / 5,000 /
      5,000 / 7,000 / 5,000 XAF. The old 5,000 / 4,000 / 4,000 / 6,000 /
      4,000 figures are superseded and rejected as stale.
- [x] XAF/FCFA only on the public site; no NGN, USD, EUR, GBP; no conversion
      or invented exchange rate; no other currency symbol.
- [x] Discount system: Stage 1 20%, Stage 2 10%, Stage 3 5%, then standard.
- [x] All launch/discount dates are configurable and **hidden until
      confirmed** — empty dates mean "not scheduled", so the site shows the
      standard price and never claims a discount. No dates invented.
- [x] Hero anchor: *From 4,000 FCFA* when a stage is genuinely active,
      otherwise *From 5,000 FCFA* (derived from the lowest track price).
- [x] Two distinct certificates (D-009): the 10-Day Bootcamp Completion
      Certificate is **included** in every track/package price (no separate
      fee); the 10-Day Challenge Certificate is earned separately via the
      limited challenge and is never implied to be automatic. The retired
      optional-certificate purchase (1,500 / 1,000 XAF) is rejected as stale.
- [x] **Five Founder-approved packages (mandatory, enabled by default):**
      Creative Starter 8,100 · Automation Starter 9,000 · Prompt Creator 9,550
      · Creative AI 14,450 · Full ICON 18,850 — all FCFA. Prices are locked
      data, shown exactly as approved, never recalculated from track sums and
      never discounted unless a stage is genuinely active.
- [x] Packages are a first-class, prominent part of the offer: a dedicated
      Packages section directly after Tracks, with its own anchor, header link
      and per-card ENROL NOW. They are not buried under track pricing.
- [x] No "you save X" claim is rendered, because package composition/price
      verification is not used to invent savings arithmetic.

## 4. Payment architecture

- [x] Selar is the external payment authority for every paid CTA.
- [x] Every paid CTA is structurally mapped to a Selar product key in config.
- [x] **Exactly 10 Selar product slots** — 5 individual tracks + 5 packages —
      plus the optional certificate as an 11th `extra` slot. Each slot carries
      `type`, `name`, `price`, `url`, `status` and `label`. Adding a verified
      URL is a one-line edit per product; nothing else changes.
- [x] CTA routing is key-driven: each card reads its own product slot by id,
      so a track CTA can never open a package checkout and vice versa.
- [x] No Selar URL, product ID, checkout URL or payment identifier is
      invented — empty values render "Checkout link pending" and link to the
      payment explainer, so they can never become fake production links. The
      `selar()` validator only accepts real `selar.co`/`selar.com` URLs, so a
      placeholder string can never leak as a checkout link.
- [x] No claim that the website verifies successful payment.
- [x] The page states international payments go through Selar and that the
      final currency and exact payable amount are shown at Selar checkout,
      where Selar determines conversion, fees and the total.
- [x] No unverified Cameroon Selar availability claims.

## 5. Information architecture (18 approved sections)

1. [x] Announcement bar (configurable, dismissible, JS-enhanced)
2. [x] Hero — badge, headline "30 Days. 5 Skills. Your Path.", CTAs, anchor
3. [x] Social proof — honest neutral/omitted state until genuine proof exists
4. [x] What you will create
5. [x] The five tracks (approved order, prices, mobile-first framing)
6. [x] Free crash course — genuinely free, configurable, placeholder wording
7. [x] Pricing — per track, XAF, Selar note, certificate row
8. [x] Who it is for
9. [x] Benefits / outcomes
10. [x] Learning format
11. [x] Curriculum previews
12. [x] Community / support
13. [x] Facilitators / mentors — neutral "announcements coming soon" state
14. [x] Certificate
15. [x] Payment explained
16. [x] FAQ — 13 questions, native `<details>`
17. [x] Final CTA
18. [x] Footer (verified contact, legal placeholders)

## 6. Honest content rules

- [x] No invented testimonials, student counts, sponsors, partners,
      facilitator names, credentials, guarantees, social handles or
      participant work.
- [x] Verified contact only: +237 675 140 957, iconstudiosyde@gmail.com.
- [x] The unverified numbers never appear (validator enforces this).
- [x] AI Automation is mobile-first: Android/Termux supported, laptop
      optional — never claimed as laptop-required.
- [x] n8n, Zapier and Make.com are not listed as core AI Automation tools.

## 7. Visual system (binding)

- [x] Palette is exactly Deep Navy #1A2744, Rich Purple #6B21A8, Golden
      Yellow #F5C518, White #FFFFFF, Charcoal #1E1E2E plus tints/shades of
      those five. No orange, no unapproved hues (validator checks the CSS).
- [x] Golden Yellow is an accent/fill with Deep Navy text — never used as
      light-background text.
- [x] Poppins, self-hosted, WOFF2, weights 400/500/600/700, latin +
      latin-ext subsets, preloaded, `font-display: swap`.
- [x] Premium through spacing, hierarchy and restraint — no excess ornament.

## 8. Motion (binding)

- [x] 150–250ms, transform/opacity only.
- [x] `prefers-reduced-motion` fully honoured (transitions and transforms
      removed).
- [x] No parallax, no looping background video, no animated counters, no
      carousel.
- [x] **Countdown — DECISION REVERSED by the Founder (see DECISION_LOG.md).**
      A single live countdown to the Bootcamp start IS implemented. It is the
      only animated numeric widget on the page: it is computed from one
      timestamp, never reset, never looped, and flips permanently to a static
      "The Bootcamp has started" state once the target passes. It is not a
      fake-urgency sales counter — there is no per-visitor reset and no
      "hurry, ends soon" copy.

## 9. Mobile-first & layout

- [x] Designed at 375px before desktop.
- [x] No horizontal scrolling; single column on phones.
- [x] Tablet/desktop grids at ≥640/900/1024px; max content width 1200px.
- [x] Sticky CTA appears only after the hero, respects safe-area insets,
      stays ≤72px including the safe area, and hides over Pricing and Final
      CTA.
- [x] Header is not sticky; no hamburger navigation.
- [x] Pricing reachable within ~two scrolls of the top.

## 10. Accessibility (WCAG 2.2 AA)

- [x] Semantic landmarks; exactly one H1; correct heading hierarchy.
- [x] Keyboard navigation; visible focus rings.
- [x] Sufficient contrast (gold on navy/purple, dark text on gold fills).
- [x] Meaningful alt text; decorative images marked `alt=""` or `aria-hidden`.
- [x] FAQ via `<details>`/`<summary>`.
- [x] Skip link.
- [x] No colour-only information.
- [x] 200% zoom usability considered (fluid type, `text-wrap: balance`).

## 11. Resilience & performance

- [x] Fully readable and usable with JavaScript disabled; all CTA links work.
- [x] JS progressively enhances discount state, announcement bar, sticky CTA.
- [x] JavaScript < 20KB uncompressed (~19.1KB shipped).
- [x] Page weight < 400KB excluding fonts (~160KB).
- [x] Zero third-party requests on initial load.
- [x] Self-hosted fonts; WebP/PNG images with explicit dimensions; lazy
      loading below the fold.
- [x] Targets: LCP <2.5s, INP <200ms, CLS <0.1 (structural guarantees in
      place; to be measured on the deployed domain).

## 12. SEO

- [x] Approved title; description with no invented dynamic price.
- [x] Canonical URL configuration (self-referencing until the domain is set).
- [x] robots.txt, sitemap.xml.
- [x] Open Graph and Twitter metadata.
- [x] Favicon set and manifest (original brand geometry — no fabricated
      imagery).

## 13. Assets

- [x] No fabricated visual assets; nothing presented as participant work.
- [x] Clearly defined asset directory; safe, original brand treatment
      (CSS-drawn hero, generated brand mark).

## 14. Testing & verification

- [x] `scripts/check_prices.py` — prices, currency, dates, Selar links,
      contacts, bundles, palette.
- [x] No non-XAF public prices; no accidental fake Selar URLs; no stale
      prices; no prohibited colours.
- [ ] Horizontal-overflow and broken-link checks (see `scripts/check_site.py`).
- [ ] Visual inspection at 375px / 320px / 1280px and JS-disabled test.

## 15. Security & delivery

- [x] No API keys, secrets or credentials committed.
- [x] Meaningful commits pushed to GitHub; working tree clean at the end.
- [x] No production deployment unless explicitly instructed.
