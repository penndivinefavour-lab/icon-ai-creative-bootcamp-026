# Site Configuration Guide — Icon AI and Creative Bootcamp '26

**File:** `assets/js/config.js`
**Validator:** `python3 scripts/check_prices.py`

`config.js` is the **single source of truth** for every Founder-controlled
value. The landing page reads it at runtime, so a change here appears on the
site immediately — no other file needs editing. The validator reads it too,
so any change that breaks an approved rule is caught before it ships.

---

## How to edit

1. Open `assets/js/config.js`.
2. Change a value. Use only `//` line comments, double quotes, and no
   trailing commas — the file must stay parseable as JSON once comments are
   stripped.
3. Run `python3 scripts/check_prices.py`. It must print **0 failed**.
4. Commit. The page updates on the next deploy.

---

## Section by section

### `site`
Basic identity, SEO description, and the public `url`.

| Key | Purpose |
| --- | --- |
| `name` | Official product name — **do not change** |
| `badge` | The badge line shown in the hero |
| `headline` | Campaign headline — **do not change** |
| `url` | Absolute public domain, no trailing slash. Leave `""` until the domain is confirmed; the page then uses a self-referencing canonical, which stays correct on any host |

### `contact` — verified details
These are the **only** approved contact details.

- `+237 675 140 957` ✔ approved
- `iconstudiosyde@gmail.com` ✔ approved

The numbers `+237 672 536 260` and `67256260` are **not approved** and must
never appear anywhere. The validator fails the build if they do.

### `community`
`whatsappUrl` — the **verified** WhatsApp group/chat link. Leave it `""`
until the Founder supplies one. While empty, free and community buttons fall
back to the verified email, so nothing ever links to an invented deep link.

### `announcement`
The top strip. Set `enabled: false` to hide it entirely. Keep the text free
of unconfirmed dates and unverified claims.

### `programme`
Programme facts: 30 days, 5 tracks, cohort of 500.

### `pricing` — the core

All amounts are **XAF / FCFA**. No other currency may appear anywhere.

`tracks[]` — the five tracks, in the approved order, with the approved
standard prices. **Order and prices are binding:**

| # | Track | Standard price |
| --- | --- | --- |
| 1 | Graphic Designing | 6,000 XAF |
| 2 | Prompt Engineering | 5,000 XAF |
| 3 | Image Generation | 5,000 XAF |
| 4 | AI Automation | 7,000 XAF |
| 5 | AI Video Generation | 5,000 XAF |

> **Certificate-inclusive (D-008).** These prices supersede the earlier
> 5,000 / 4,000 / 4,000 / 6,000 / 4,000 figures, which the validator now
> rejects as stale. Every track price **includes** the 10-Day Bootcamp
> Completion Certificate — there is no separate certificate fee.

`heroAnchor` — the two approved hero anchors:

| State | Anchor |
| --- | --- |
| A discount stage is active | **From 4,000 FCFA** |
| No stage active | **From 5,000 FCFA** |

The anchors derive automatically from the lowest track price (5,000 FCFA
standard; 4,000 FCFA at 20% off), so they stay correct if a price changes.

`stages[]` — the three discount stages, exactly **20% / 10% / 5%**.

**A stage is only active when BOTH `start` and `end` are set and today falls
inside the window.** While the dates are empty:

- no stage is active,
- the site shows **standard prices only**,
- the hero reads **From 5,000 FCFA**,
- no discount badge appears anywhere.

This is deliberate: launch dates are hidden until confirmed, so the site can
never claim a discount that has not been agreed.

To schedule the launch, set both dates in `"YYYY-MM-DD"` form:

```json
{ "id": "stage1", "label": "Stage 1 — Launch offer", "pct": 20,
  "start": "2026-06-01", "end": "2026-06-07" }
```

Windows must not overlap. The validator checks this.

### `certificates` — two distinct certificates (D-009)

The separate optional-certificate purchase (1,500 / 1,000 XAF) is **retired**.
The validator rejects those strings as stale if they reappear.

- `bootcamp` — the **10-Day Bootcamp Completion Certificate**. `included: true`.
  Its cost is already inside every track and package price, so the site never
  quotes a separate fee for it.
- `challenge` — the **10-Day Challenge Certificate**, a *separate* certificate
  earned by successfully participating in and completing the limited 10-Day
  Challenge. `feeState: "PRICE_PENDING_VERIFICATION"` with `challengeFee: ""`
  until the Founder confirms the challenge fee. **Never invent this fee.** It
  is never implied to be issued automatically with bootcamp registration.

### `bundles` — disabled by default

Proposed bundles are **not yet approved**. Keep `enabled: false`. The
validator fails if any bundle price is published while this is false. The
architecture supports bundles (`items[]`), so they can be switched on later
without structural changes.

### `crashCourse` — genuinely free

This must never become a disguised sales trial. The wording stays honest: it
promises no specific content, date, or bonus until the Founder confirms the
offer. `ctaUrl: ""` falls back safely to the verified email (or the verified
WhatsApp link in `community.whatsappUrl`).

### `payment` — Selar is the payment authority

Every paid CTA maps to an entry in `products`. **There are exactly 10 Selar
product slots — 5 tracks + 5 packages — plus the optional certificate as an
11th `extra` slot.** Each slot carries `type` (`track` | `package` | `extra`),
`name`, `price`, `url`, `label` and `status`.

**To add a verified link (the only edit you need):** find the product key in
`products`, set `url` to the Selar link the Founder verified for that specific
track or package. Done. That card's ENROL NOW becomes the real checkout on the
next page load. Each CTA reads its own slot by key, so a track button can
never open a package checkout.

A link is published only when `url` is non-empty AND is a real Selar product
page (`https://selar.co/...` or `https://selar.com/...`).

While a `url` is empty, that button:

- reads **"Checkout link pending"**,
- links to the **How payment works** section,
- carries `aria-disabled` — it is visibly pending, not a fake checkout.

So an empty or mistyped value can **never** become a fake production link.

The site never verifies payments and never displays a converted amount.
International payments are processed through Selar; the final currency and
the exact payable amount are shown at Selar checkout, where Selar determines
conversion, fees and the total.

> Do not publish Cameroon-specific Selar availability claims. They are not
> verified.

### `packages` — five approved, enabled, locked

The five Founder-approved packages and their prices. **Prices are locked
data — never recompute, round, substitute or derive them from track prices.**
The card shows the price exactly as written, the included tracks as skill
chips, the positioning line and the ideal learner. `Full ICON` is flagged
"All 5 tracks" automatically when `includedTrackIds` covers every track.

No "you save X" figure is rendered — composition is not used to verify
savings, so the claim is never made. (Under the certificate-inclusive track
prices every package now does cost less than its tracks — see DECISION_LOG
D-007 — but the qualitative wording is kept because either price set can
change in config and a stated figure would go stale silently.)

### `certificates` — two certificates, earned differently

`bootcamp` describes the **10-Day Bootcamp Completion Certificate**, which is
included in every track and package price (`included: true`). `challenge`
describes the separate **10-Day Challenge Certificate**, earned by completing
the limited 10-Day Challenge and *not* granted automatically by registration.
`challenge.feeState` is `PRICE_PENDING_VERIFICATION` and `challengeFee` is
empty until the Founder approves a figure — copy says the fee is announced
with the official challenge rules, so nothing is invented.

### `challenge` — the separate 10-Day Challenge

A distinct, limited-space practical build. `challengeFee` is empty
(`PRICE_PENDING_VERIFICATION`) and `applyUrl` is empty until the Founder
supplies the official rules and application destination. The badge reads
"Limited spaces" with **no fabricated scarcity number**, and the copy states
the challenge is separate from normal bootcamp registration.

### `campaign` — approved dates and the countdown

`launchDate` (registration opens) and `bootcampStart` (programme begins).
`bootcampStart.iso` carries an explicit `+01:00` offset so `new Date(iso)`
resolves to the same instant in every timezone — the countdown is
timezone-safe. The countdown is a schedule announcement, not a sales timer:
it never resets or loops, and it flips permanently to `liveLabel` then
`endedLabel` once the target passes. See `docs/DECISION_LOG.md` D-001.

### `programme` — 10-day structure, timetable-ready

`tenDay.timetable` is a data-driven list. Each entry is `{ title, focus }`.
While it is empty the section renders a clean, labelled "timetable coming soon"
state; the moment entries are added the dated day cards render with no
restructuring (dates derive from `tenDay.startDate`). `bootcampDays` is the
length of the core bootcamp and `rhythm` / `delivery` describe the daily
pattern and the delivery channels. The final timetable should show actual dates
from Saturday 7 November 2026. No timetable content is invented.

### `community` — private delivery channels

`telegramUrl` and `driveUrl` are **placeholders until the Founder supplies
verified links**. The copy explains the private Telegram community with per-
track sub-channels and the Google Drive fallback, and states that materials
are private and not for resale or redistribution. `whatsappUrl` is the
floating-button and escalation destination, also a placeholder.

### `affiliate` — structure live, terms pending

`enabled` controls the section. Every term is a **placeholder until the
Founder supplies the official affiliate rules**: `terms.commissionPct`,
`terms.payoutRules`, `terms.eligibility`, `terms.tracking`,
`terms.paymentSchedule` and `applyUrl`. The copy says the official terms are
published once confirmed, so no figure is ever quoted before then. The program
is presented as separate from normal bootcamp registration. Nothing is
invented.

### `gallery` and `projects` — empty until the Founder supplies images

Both are data-driven lists (`items: []`). Each item is `{ src, w, h, alt,
caption }`. While a list is empty the section shows a clearly-labelled empty
state; the moment an item is added the card grid renders with no page
restructuring. Images are never fabricated and stock imagery is never shown
as participant work.

### `assistant` — deterministic local FAQ engine

A small local knowledge base of approved answers. **No backend, no API key, no
paid service.** Unknown questions answer honestly ("I don't have a confirmed
answer for that yet") and escalate to the verified contact channels. It can
never invent a Selar URL, a package price or a date. Answers that carry prices
or dates are generated from config so they can never drift from it.

### `facilitators` — announcements coming soon
Nobody is confirmed. The section renders a neutral state. Add a person only
when verified:

```json
{ "announced": true,
  "people": [ { "name": "...", "role": "...", "detail": "..." } ] }
```

Never invent names, credentials, or employers.

### `socialProof` — honest neutral state
`hasProof: false` until genuine, permissioned proof exists. Never invent
testimonials, student counts, ratings, or participant work.

### `partners` — empty until confirmed
`enabled: false` until real partners are confirmed. Never invent logos.

---

## What the validator enforces

`scripts/check_prices.py` fails the build if any of these is violated:

1. Currency is XAF/FCFA only — no NGN, USD, EUR, GBP, no `$`, `€`, `£`
   amounts, no exchange-rate mentions.
2. The five tracks in the approved order with the approved prices.
3. Stage percentages are exactly 20 / 10 / 5, dates are `YYYY-MM-DD` or
   empty, both dates of a stage are set together, and windows do not overlap.
4. Hero anchors are exactly 4,000 (stage active) and 5,000 (standard), and
   the superseded 3,200 / 4,000 pair is rejected as stale.
5. The bootcamp completion certificate is included in every price — no
   separate certificate fee is quoted, and the retired 1,500 / 1,000 XAF
   optional-certificate strings are rejected as stale.
6. No unverified Selar URL is published; no hardcoded Selar link exists
   anywhere in the project.
7. Bundles are disabled — no bundle price is published.
8. Only the approved phone and email appear; the unverified numbers never do.
9. The CSS uses only the approved brand palette and its tints/shades — no
   orange and no unapproved hue.
10. The five approved packages are present, enabled, in the approved order and
    priced exactly 8,100 / 9,000 / 9,550 / 14,450 / 18,850 FCFA.
11. Exactly 5 track product slots + 5 package product slots (10 total) exist,
    each mapping to a real track/package with a matching price.
12. Campaign dates are 10 October 2026 (launch) and 7 November 2026 (start),
    the countdown label names the real weekday, and the target is one ISO
    timestamp.

Run it after every config change.
