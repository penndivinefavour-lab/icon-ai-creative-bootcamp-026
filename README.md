# Icon AI and Creative Bootcamp '26 — Landing Page

Official landing page for **Icon AI and Creative Bootcamp**, produced to the
approved master build document.

> **Campaign:** 30 Days. 5 Skills. Your Path.
> **Badge:** ICON Studios AI + Creative Bootcamp '26
> **Cohort:** 500 creatives · **Duration:** 30 days · **Tracks:** 5

---

## Repository

| | |
| --- | --- |
| GitHub | `https://github.com/penndivinefavour-lab/icon-ai-creative-bootcamp-26` |
| Branch | `main` |
| Visibility | private |
| Deployment | Cloudflare Pages (static — from `main`) |

GitHub is the **source of truth**. Cloudflare Pages can deploy the `main`
branch directly: the site is purely static, with no Workers, no Functions, no
databases and no other server infrastructure.

---

## What is here

```
index.html                  The landing page (18 approved sections)
legal/                      Privacy / Terms / Refund placeholders
assets/css/styles.css       Mobile-first stylesheet (approved palette only)
assets/css/fonts.css        Self-hosted Poppins @font-face (WOFF2 subsets)
assets/js/config.js         SINGLE SOURCE OF TRUTH — Founder edits this
assets/js/main.js           Progressive enhancement (shipped, minified build)
assets/js/main.src.js       Readable source of main.js (for maintenance)
assets/fonts/*.woff2        Self-hosted Poppins 400/500/600/700 (latin, latin-ext)
assets/img/                 Original brand mark, favicons, OG cover (PNG)
scripts/check_prices.py     Price & content validator — run after every change
scripts/make_assets.js      Regenerates the brand PNG assets
assets/img/hero-art.svg     Original hero artwork (approved palette, SVG)
site.webmanifest            PWA manifest
robots.txt · sitemap.xml    SEO
_headers · wrangler.toml    Cloudflare Pages config
docs/CONFIG_GUIDE.md        Full guide to assets/js/config.js
```

---

## Quick start

Serve locally (any static server works):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Validate against the approved business rules:

```bash
python3 scripts/check_prices.py
```

Regenerate the brand assets (only if the mark changes):

```bash
node scripts/make_assets.js
```

---

## The single source of truth

**`assets/js/config.js`** holds every Founder-controlled value: prices,
discount dates, Selar links, WhatsApp link, email, phone, the crash-course
offer, bundle visibility and the domain.

Change a value there and it is live — no other file needs editing.
Full documentation: **[`docs/CONFIG_GUIDE.md`](docs/CONFIG_GUIDE.md)**.

`scripts/check_prices.py` reads that file and fails loudly if an approved
rule is broken.

---

## Binding rules implemented

These are enforced by `scripts/check_prices.py`, not just by convention.

1. **XAF/FCFA only.** No NGN, USD, EUR or GBP anywhere, no `$`, `€`, `£`
   amounts, and no exchange-rate mentions.
2. **The five tracks, in the approved order, at the approved prices —**
   certificate-inclusive (D-008): Graphic Designing 6,000 · Prompt Engineering
   5,000 · Image Generation 5,000 · AI Automation 7,000 · AI Video Generation
   5,000 XAF. The earlier 5,000/4,000/4,000/6,000/4,000 figures are superseded
   and rejected as stale by the validator.
3. **Discount stages are exactly 20% / 10% / 5%** and are active only between
   confirmed start/end dates. While dates are empty (as shipped), standard
   prices are shown and no discount is ever claimed.
4. **Hero anchor:** *From 4,000 FCFA* when a stage is genuinely active,
   otherwise *From 5,000 FCFA* — derived automatically from the lowest track
   price (5,000 standard, 4,000 at 20% off).
5. **Two distinct certificates (D-009):** the **10-Day Bootcamp Completion
   Certificate** is *included* in every track and package price — no separate
   fee is ever quoted. The **10-Day Challenge Certificate** is earned
   separately through the limited 10-Day Challenge and is never implied to be
   automatic with registration. Its fee is `PRICE_PENDING_VERIFICATION` until
   the Founder confirms it; it is never invented. The retired optional
   certificate purchase (1,500 / 1,000 XAF) is rejected as stale.
6. **Five Founder-approved packages** — Creative Starter 8,100 · Automation
   Starter 9,000 · Prompt Creator 9,550 · Creative AI 14,450 · Full ICON
   18,850 FCFA. Locked data: shown exactly as written, never recalculated from
   track sums. Enabled and prominent in a dedicated Packages section. No
   "you save X" claim is rendered.
7. **Exactly ten Selar product slots** — 5 tracks + 5 packages. Each slot
   carries `type`, `name`, `price`, `url`, `label`. (The former certificate
   slot was removed once certificates became inclusive.)
   Adding a verified link is a one-line edit per product; each CTA reads its
   own slot by key, so a track button can never open a package checkout.
8. **Selar is the payment authority.** A paid link is published only when its
   URL is a verified Selar product page. Otherwise the button reads
   "Checkout link pending" and links to the payment explainer — an empty or
   mistyped value can never become a fake checkout link. The site never
   claims to verify payments and never shows a converted amount.
9. **Campaign dates are approved:** registration opens Saturday 10 October
   2026, the Bootcamp starts Saturday 7 November 2026. The countdown is a
   schedule announcement — timezone-safe, never reset, never looped — and
   flips permanently to "The Bootcamp has started" at the target. See
   `docs/DECISION_LOG.md` (D-001/D-002) — this reverses the original
   no-countdown rule.
10. **Contact:** `+237 675 140 957` and `iconstudiosyde@gmail.com` only. The
    unverified numbers never appear.
11. **Palette:** Deep Navy `#1A2744`, Rich Purple `#6B21A8`, Golden Yellow
    `#F5C518`, White `#FFFFFF`, Charcoal `#1E1E2E` — plus tints and shades of
    those five only. No orange, no unapproved hue.
12. **AI Automation is mobile-first:** Android/Termux supported, laptop
    optional — the page never claims a laptop is required. n8n, Zapier and
    Make.com are not listed as core curriculum tools.

---

## Accessibility (WCAG 2.2 AA)

- Semantic landmarks, exactly one `<h1>`, correct heading order.
- Skip link, visible focus rings on every surface (gold on dark, purple on
  light).
- FAQ built with native `<details>`/`<summary>` — keyboard and screen-reader
  friendly with no scripting.
- All CTAs are real links, so the whole page works with **JavaScript
  disabled**; JS only *enhances* pricing state, the announcement bar and the
  sticky CTA.
- `prefers-reduced-motion` disables every transition and transform.
- Targets ≥ 48×48px; single column on phones; no horizontal scrolling.
- Information is never conveyed by colour alone (✓/✗ glyphs and text labels
  accompany every status).

---

## Performance budget

| Metric | Target | This build |
| --- | --- | --- |
| JavaScript (uncompressed) | < 20 KB | **~19.95 KB** |
| Page weight (excl. fonts) | < 400 KB | **~230 KB** |
| Third-party requests | 0 | **0** |
| Fonts | self-hosted | Poppins WOFF2, latin + latin-ext |
| LCP / INP / CLS | <2.5s / <200ms / <0.1 | structural only — see below |

Fonts are preloaded and swapped with `font-display: swap`; images carry
explicit dimensions; nothing below the fold blocks rendering. The LCP/INP/CLS
figures must be measured on the deployed domain — see *Known limitations*.

---

## Cloudflare Pages deployment

1. In Cloudflare Pages, choose **Create a project → Connect to Git**.
2. Select this repository, branch `main`.
3. Framework preset: **None**. Build command: leave **empty**. Output
   directory: `.` (the repository root).
4. Deploy. `_headers` applies the caching rules automatically.

No environment variables, secrets, Workers or Functions are required.

---

## Known limitations (launch gates)

These must be resolved by the Founder before the site is production-ready.
The build deliberately **fails safe** on each of them.

- **Selar product URLs are not yet verified.** All ten paid CTAs (5 tracks +
  5 packages) render as "Checkout link pending" pointing at the payment
  explainer. No payment can be taken until the verified URLs are added to
  `config.js` — one per product slot.
- **WhatsApp link not supplied.** Free/community CTAs and the floating
  WhatsApp button fall back to the verified email/phone.
- **The final domain is unconfirmed**, so the canonical tag is
  self-referencing (`href="/"`) and `site.url` is empty. Set it in
  `config.js` (and the sitemap host) when the domain is known.
- **Gallery and sample projects are empty by design.** The Founder supplies
  the real images; until then both areas show a clearly-labelled empty state.
- **Crash-course offer is placeholder wording** pending Founder confirmation.
- **Facilitators are unannounced.** The section renders a neutral
  "announcements coming soon" state; no names or credentials are invented.
- **No social proof.** The strip states plainly that results will be
  published as they arrive.
- **Legal pages are placeholders** and must be reviewed and approved.
- **No Cameroon-specific Selar availability claims** are made anywhere.

---

## Scripts

The three validators are also runnable together as `npm test`.

| Script | Purpose |
| --- | --- |
| `npm run preview` | Serve the site locally (port 8080, `PORT=xxxx` to change it) |
| `npm test` | Runs all three checks below in one pass |
| `python3 scripts/check_prices.py` | Validate prices, currency, dates, links, contacts and palette |
| `python3 scripts/check_site.py` | Validate HTML structure, heading order, overflow rules and links |
| `python3 scripts/check_secrets.py` | Scan the working tree for tokens, keys and credentials |
| `node scripts/make_assets.js` | Regenerate favicons / OG cover from the brand geometry |
| `node scripts/visual_audit.js` | CDP layout audit: overflow, sticky-CTA state, screenshots |
| `node scripts/audit_full.js [port]` | Full responsive audit at 320/375/390/414/768/1280px + no-JS pass |
| `node scripts/audit_behaviour.js [port]` | CTA routing, assistant answers, countdown, overlap checks |
| `node scripts/minify.js src out` | Regenerate the shipped `main.js` from `main.src.js` (under 20KB) |
| `node scripts/audit_geometry.js [port]` | Floating WhatsApp vs sticky CTA geometry, footer occlusion |
| `node scripts/audit_text.js [port]` | Invisible-text / contrast audit across all cards |
| `node scripts/audit_regression.js [port]` | Regression tests for the announcement-bar, hero-price and tel-link bugs |
| `node scripts/diagnose.js` | Quick page diagnostic (DOM counts, console errors) |

> After editing `assets/js/main.src.js`, regenerate the shipped file with
> `node scripts/minify.js assets/js/main.src.js assets/js/main.js`.

---

## PC HANDOFF / CONTINUATION GUIDE

> **Read this first if you are picking up development on a PC.** It describes
> the state of the project at the last commit and what still needs Founder
> input. Do not rebuild the site — it is working and tested.

### Project purpose

The official landing page for **Icon AI and Creative Bootcamp ’26**
(ICON Studios): a 30-day, mobile-first AI + creative skills programme of five
tracks and five packages, marketed to a 500-creator cohort. The site is a
conversion-focused campaign page: hero + countdown, tracks, packages, pricing,
curriculum, community delivery, 10-day programme, 10-day challenge, affiliate
programme, FAQ assistant, and repeated Enrol CTAs.

**Hosting target: Cloudflare Pages (static).** The repository root *is* the
deployed output — no build step, no Workers, no Functions, no databases.
Keep it that way: do not introduce a backend, API, Supabase, or any paid /
recurring dependency. The site must stay **mobile-first, lightweight and
dependency-free** (see the performance budget above).

### Architecture in one minute

- `index.html` — the whole page: 18+ sections, semantic, accessible.
- `assets/js/config.js` — **the single source of truth.** Every
  Founder-controlled value lives here (prices, dates, links, copy, gallery,
  assistant knowledge base). Nothing business-critical is hard-coded in HTML.
- `assets/js/main.src.js` — readable source of the progressive enhancement.
- `assets/js/main.js` — the **shipped**, minified build (~19.95 KB, budget
  20 KB). The page loads this, *not* the source. **After any edit to
  `main.src.js`, regenerate it:**
  `node scripts/minify.js assets/js/main.src.js assets/js/main.js`
- `assets/css/styles.css` — mobile-first, approved palette only.
- `assets/img/` — original brand assets (SVG mark, hero art, PNG
  favicons/OG cover). Regenerate with `node scripts/make_assets.js`.
- Static JS sections are duplicated as `<noscript>` fallbacks generated from
  config, so the page is fully usable with JavaScript disabled.

**Working conventions that must be preserved:**
exactly one `<h1>`; XAF/FCFA only, never another currency; no invented links,
prices, dates, testimonials or people; every paid CTA reads *only its own*
config product slot by id (a track button can never open a package checkout);
`prefers-reduced-motion` support; targets ≥ 48×48px; no horizontal
scrolling at 320px.

### Setup from a fresh clone

```bash
git clone https://github.com/penndivinefavour-lab/icon-ai-creative-bootcamp-26.git
cd icon-ai-creative-bootcamp-26
npm install                 # optional — only for the browser audits (ws)
node scripts/serve.js       # then open http://localhost:8080
```

Requirements are minimal: **Node.js** (any modern version) and **Python 3**
(for the validators). The site itself has **no runtime dependencies** —
`npm install` only fetches the `ws` package used by the optional browser
audits. The three validators (`npm test`) need nothing extra.

### Exact commands

| Task | Command |
| --- | --- |
| Preview | `node scripts/serve.js` (or `npm run preview`); `PORT=3000 node scripts/serve.js` to change port |
| Full test suite | `npm test` (runs all three validators below) |
| Prices / business rules | `python3 scripts/check_prices.py` |
| HTML structure / overflow | `python3 scripts/check_site.py` |
| Secret scan | `python3 scripts/check_secrets.py` |
| Responsive audit 320–1280px + no-JS | `node scripts/audit_full.js 8080` |
| CTA routing + assistant + countdown | `node scripts/audit_behaviour.js 8080` |
| Invisible-text / contrast audit | `node scripts/audit_text.js 8080` |
| Sticky-CTA / WhatsApp-float geometry | `node scripts/audit_geometry.js 8080` |
| Rebuild shipped JS | `node scripts/minify.js assets/js/main.src.js assets/js/main.js` |
| Regenerate brand assets | `node scripts/make_assets.js` |

The browser audits drive Chromium/Chrome over CDP. They need the `ws` package
(`npm install`) and a browser binary — the resolver checks `CHROME_BIN`, then
the usual Linux/macOS/Windows install paths. Set `CHROME_BIN` if yours is
elsewhere. If neither is available the Python validators still run.

### Files to inspect first

1. **`assets/js/config.js`** — everything business-related starts here.
2. `docs/DECISION_LOG.md` — the *why* behind every approved choice
   (D-001…D-012). Read before changing any price, date or claim.
3. `docs/CONFIG_GUIDE.md` — what each config key means and what the
   validator enforces about it.
4. `index.html` — section structure and the `<noscript>` fallbacks.
5. `assets/js/main.src.js` — rendering logic for every dynamic section.
6. `scripts/check_prices.py` — the encoded business rules; extend it when
   you add Founder-controlled data.

### Current state at handoff

- **Branch:** `main`. **Working tree:** clean. Everything is committed and
  pushed; nothing exists only on the mobile workspace.
- **All tests pass:** 53 price checks, 12 site checks, secrets scan clean
  (42 files), plus the browser audits below.
- **Responsive audit passes at 320 / 375 / 390 / 414 / 768 / 1280px** and with
  JavaScript disabled: zero horizontal overflow, one `<h1>`, no invisible
  text, no console errors, sticky CTA within its 72px cap, floating WhatsApp
  button never overlaps it.
- **Three layout/contact defects were found by a rendered-page audit and
  fixed** (see "Bugs fixed in this recovery phase" below); each has a
  regression test in `scripts/audit_regression.js`.

### Bugs fixed in this recovery phase

These were present in the rendered page at the starting commit, not visible
from the source alone:

1. **Announcement bar crushed the hero (320–414px).** The long campaign
   sentence shared one flex row with the link and the close button, so the
   `<p>` was squeezed to ~103px and wrapped into a ~244px-tall column. The bar
   grew to 269px and pushed the white header *down into the navy hero*, which
   read as a broken two-tone band at the top of the page. Fixed by stacking
   the text above the actions under 640px (`flex-wrap`, `order: -1`).
2. **Hero price collided with its suffix (320–375px).** The gold price is
   17px inside a 15px/1.45 line box, so the wrapped suffix overlapped the
   price glyphs by 22px. Fixed with a taller line box plus `display: block`
   for the suffix under 640px; desktop keeps the original single-line layout.
3. **Every `tel:` link was dead.** `phoneE164` held a masked placeholder
   (`+237****0957`) and the three markup links were hardcoded copies of it,
   with no `data-tel` hook — so `applyContact()` never bound them. Fixed the
   config value to the dialable E.164 number and routed all three links
   (plus the three legal pages) through `data-tel`, so the number is now
   edited in one place.

### Known bugs / failures

**None open.** All validators and audits are green at the handoff commit.
Things a PC agent should still be aware of:

- The audits depend on a Chromium binary being available; if the PC lacks one,
  `audit_*.js` cannot run (the Python validators are unaffected).
- `main.js` is a generated artefact. Editing it directly will be silently
  overwritten by `minify.js` — always edit `main.src.js`.
- The LCP / INP / CLS figures are structural estimates and must be re-measured
  on the deployed domain before declaring performance victory.

### Known unfinished work (by design — waiting on the Founder)

These render as clearly-labelled empty / pending states. **Do not invent
content for them.**

- 10-day timetable: the section is timetable-ready and shows an empty state;
  dates will derive from the configured 7 Nov 2026 start.
- Image Generation gallery and Sample Projects: architecture ready, empty by
  design (add entries in config; never fill with random AI images).
- Facilitators, testimonials / social proof, sponsors: neutral states.
- Legal pages: placeholder content, `noindex`.

### Founder-controlled values still to be supplied

Every one of these is a config placeholder today — **none is invented.**

| Value | Location in `config.js` | Current state |
| --- | --- | --- |
| 10 verified Selar URLs | `payment.products[*].url` | all 10 empty; CTAs show "Checkout link pending" |
| Verified WhatsApp destination | `community.whatsappUrl` | empty; falls back to email/phone |
| Waitlist group link | `community.waitlistUrl` | empty |
| Private Telegram community URL | `community.telegramUrl` | empty (placeholder copy only) |
| Private Google Drive fallback URL | `community.driveUrl` | empty |
| Affiliate terms (commission %, payout, eligibility, tracking, schedule) + application URL | `affiliate.terms`, `affiliate.applyUrl` | placeholders |
| 10-Day Challenge fee + application URL | `challenge.challengeFee`, `challenge.applyUrl` | `PRICE_PENDING_VERIFICATION` |
| Final domain | `site.url` (+ sitemap host) | empty; canonical is self-referencing |
| Gallery images & sample projects | `gallery.items`, `projects.items` | empty arrays |
| Crash-course final details | `crashCourse` | placeholder wording |
| Package price re-verification | `pricing.packages` | see note below |

**Package price note (D-007):** the five package prices (8,100 / 9,000 / 9,550
/ 14,450 / 18,850 FCFA) were approved under the *old* track prices. Track
prices have since become certificate-inclusive, and **Creative AI (14,450)
already cost more than its three tracks bought individually**. The prices were
kept as last-approved and no savings claim is made anywhere. **The Founder
should re-confirm or re-price the packages** — this is a decision, not a
bug, so do not change the numbers without explicit approval.

### Recommended next steps for the PC agent

1. `git pull` and run `npm test` — confirm a green baseline.
2. When the Founder sends Selar URLs, paste each into its own
   `payment.products[id].url` slot in `config.js`. Verify with
   `node scripts/audit_behaviour.js` that each CTA activates its own product
   only. Nothing else needs to change.
3. Fill `community.whatsappUrl`, `waitlistUrl`, `telegramUrl`, `driveUrl`,
   the `affiliate` terms, and the `challenge` fee as they arrive.
4. Populate `gallery.items` / `projects.items` with real Founder images
   (WebP/AVIF, explicit dimensions, lazy loading).
5. Build the 10-day timetable from the confirmed schedule.
6. Set `site.url` and the sitemap host when the domain is known; review the
   legal placeholders.
7. Re-run `npm test` + `node scripts/audit_full.js` after every change, and
   regenerate `main.js` whenever you touch `main.src.js`.
8. Deploy to Cloudflare Pages only when the Founder explicitly asks.

---

## License

All rights reserved, ICON Studios.
