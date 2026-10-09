# DECISION LOG — Icon AI and Creative Bootcamp '26

Authoritative record of Founder decisions that change or reverse the original
MASTER BUILD DOCUMENT. When a decision here conflicts with an earlier spec,
**this log wins**. Dates are the day the decision was recorded.

---

## D-001 · Countdown timer — APPROVED (reverses the original ban)

**Date:** 6 October 2026
**Decision:** A live countdown to the Bootcamp start IS approved.
**Reverses:** MASTER BUILD DOCUMENT §Motion, which prohibited a countdown
timer.

**Why it is safe (and why the original ban existed):**
The original ban targeted *fake-urgity sales countdowns* — widgets that reset
per visitor, loop, or invent a "sale ends in 3:00:00" deadline to pressure
people. That class of countdown stays banned.

The approved countdown is a **schedule announcement**, not a pressure tactic:

- One target timestamp, `2026-11-07T09:00:00+01:00` — the real, approved
  Bootcamp start. It is calculated from config, never hardcoded in copy.
- Never resets, never loops, never restarts.
- Once the target passes it flips **permanently** to a static state:
  "The Bootcamp has started", then "The 2026 cohort is underway" after the
  30-day programme ends. It does not count up afterwards.
- No "hurry" / "ends soon" / scarcity copy is attached to it.
- Accessible: the ticking digits are `aria-hidden`; a separate
  `aria-live="polite"` region announces the remaining time and the transition
  to "started", so screen-reader users get the information without a
  per-second announcement spam.
- Uses only the approved palette. No orange, no unapproved hues.

**Configuration:** `config.campaign.bootcampStart` (date, time, tzOffset, iso,
label) and `config.campaign.countdown` (enabled, preLabel, liveLabel,
endedLabel). Change the ISO string and everything follows.

---

## D-002 · Campaign dates — APPROVED

**Date:** 6 October 2026

- **Campaign/registration opens:** Saturday 10 October 2026.
- **Bootcamp starts:** Saturday 7 November 2026.
- **Duration:** 30 days.

Both are stored in `config.campaign`. The launch-discount stage windows in
`config.pricing.stages` are scheduled against these dates and are applied
**only** when today genuinely falls inside a window. Outside every window the
site shows standard prices — it never back-dates or pre-announces a discount.

---

## D-003 · Five packages — APPROVED, mandatory, enabled

**Date:** 6 October 2026 · **Updated:** 7 October 2026 (certificate-inclusive
track prices)
**Decision:** The Bootcamp is presented as **both** five individual tracks
**and** five purchasable packages. Packages are a central part of the offer
and must be highly visible.

**Approved package names and prices (locked, FCFA):**

| Package | Price | Tracks included |
|---|---|---|
| Creative Starter | 8,100 | 2 |
| Automation Starter | 9,000 | 2 |
| Prompt Creator | 9,550 | 3 |
| Creative AI | 14,450 | 3 |
| Full ICON | 18,850 | all 5 |

**Binding rules:**

- These prices are Founder-approved data. They are displayed exactly as
  written. They are **never** recalculated, rounded, substituted or derived
  from individual track prices in either direction.
- Earlier project notes marked these figures *PROPOSED*. The Founder has since
  confirmed them as approved, so they are published. If a future source
  contradicts them, that source wins and these numbers change — they are
  config values, not hardcoded markup.
- Every package price **includes the 10-Day Bootcamp Completion Certificate** —
  there is no separate certificate fee at checkout. This is stated on every
  package card and in the pricing area.
- The five packages are **enabled by default**. The separate legacy `bundles`
  block remains disabled (unapproved) and is not published.

---

## D-004 · Ten Selar product slots — APPROVED architecture

**Date:** 6 October 2026 · **Updated:** 7 October 2026 (certificate no longer a
separate product)
**Decision:** The payment configuration exposes exactly **10 Selar product
slots** — 5 individual-track products + 5 package products. The former
certificate `extra` slot was removed once certificates became included in
every registration price (D-008), so the count is exactly 10.

Each slot in `config.payment.products` carries:

```js
"graphic-design": {
  "type": "track",            // track | package
  "name": "Graphic Designing",
  "price": 6000,              // certificate-inclusive (D-008)
  "url": "",                  // verified Selar URL — EMPTY until supplied
  "label": "Enrol — Graphic Designing"
}
```

**How the Founder adds a verified link:** open `assets/js/config.js`, find the
one product key, set `url`. Nothing else changes — the card's ENROL NOW button
switches from the safe "Checkout link pending" state to the real checkout on
the next page load. Because each CTA reads its own slot by key, a track button
can never open a package checkout. This was verified end-to-end: injecting a
test URL into only the `graphic-design` slot activated exactly that track's
CTAs and no others.

**Until a URL is supplied and verified**, every paid CTA stays in the safe
non-checkout state: it links to the on-page payment explainer with
`aria-disabled="true"` and shows "Checkout link pending". The `selar()`
validator only accepts real `selar.co` / `selar.com` URLs, so a placeholder
string can never leak as a production checkout link.

---

## D-005 · Image gallery and sample projects — empty-state strategy

**Date:** 6 October 2026
**Decision:** The Image Generation track gets a dedicated gallery, and the
site gets a Sample Projects area. **Both ship empty by design.**

- The Founder supplies the real images later. Until then both areas show a
  clearly-labelled, polished empty state that says the gallery will be
  populated with official ICON examples.
- Adding an image is a config edit (`config.gallery.items` /
  `config.projects.items`): `src`, `w`, `h`, `alt`, `caption`. The page
  re-renders with no restructuring.
- Images are **never** fabricated, and stock/generated imagery is never
  represented as participant work. There are no fake testimonials, no fake
  student counts and no fake facilitators.

---

## D-006 · WhatsApp + Ask ICON assistant — placeholders until verified

**Date:** 6 October 2026

- A floating WhatsApp button is present and polished, but its destination is a
  **configuration placeholder**. The Founder supplies the verified WhatsApp
  URL; until then it falls back to the verified contact details
  (+237 675 140 957 / iconstudiosyde@gmail.com). No WhatsApp deep link is
  invented.
- "Ask ICON" is a **deterministic local FAQ assistant** — no backend, no
  external API, no key, no database, no paid service. It answers only from
  `config.assistant` knowledge entries. Unknown questions say so honestly and
  escalate to WhatsApp/email. It can never invent a Selar URL, a package price
  or a date.

---

## D-008 · Certificate-inclusive track prices — APPROVED (supersedes old prices)

**Date:** 7 October 2026
**Decision:** Certificates are **no longer optional**. The certificate cost is
incorporated into the registration prices, so the approved individual-track
prices change to:

| Track | Old price | New price (certificate included) |
|---|---|---|
| Graphic Designing | 5,000 | **6,000** |
| Prompt Engineering | 4,000 | **5,000** |
| Image Generation | 4,000 | **5,000** |
| AI Automation | 6,000 | **7,000** |
| AI Video Generation | 4,000 | **5,000** |

**Binding rules:**

- The old 5,000 / 4,000 / 4,000 / 6,000 / 4,000 figures are **superseded** and
  must never be re-published. `check_prices.py` rejects them as stale strings.
- The hero "From" anchor is derived from the minimum track price, so it is now
  **From 5,000 FCFA** (standard) — or **From 4,000 FCFA** while a discount
  stage is genuinely active.
- Package prices are **unchanged** (D-003) — they were not recalculated from
  the new track prices, per the Founder instruction to never derive one from
  the other.
- The separate optional-certificate purchase (1,500 / 1,000 FCFA) is retired.
  The certificate product slot was removed, leaving **exactly 10 Selar
  product slots** (D-004).

---

## D-009 · Two certificates, earned differently — APPROVED

**Date:** 7 October 2026
**Decision:** The program has **two distinct certificates**, and the site must
never imply they are the same or that both come with registration.

1. **10-Day Bootcamp Completion Certificate** — *included* in every track and
   package price. Issued on completion of the bootcamp. Nothing extra to pay,
   no separate checkout.
2. **10-Day Challenge Certificate** — *earned separately* by successfully
   participating in and completing the limited 10-Day Challenge. Registering
   for the bootcamp does **not** automatically grant it.

The challenge is presented as a separate, limited-space opportunity with a
"limited spaces" message and **no invented scarcity numbers**. The exact
challenge fee and selection process are **not approved yet** — they live in
config placeholders and the copy says they are "announced with the official
challenge rules". Nothing is invented.

---

## D-010 · Private community delivery (Telegram + Google Drive) — APPROVED

**Date:** 7 October 2026
**Decision:** Paid participants get access to a **private Telegram community**
with dedicated sub-channels per track, where materials, notes, recordings,
announcements and resources are shared. Anyone who cannot use Telegram receives
the same essential materials through a **private Google Drive** arrangement.

- Access is restricted to registered participants.
- Materials are private and **not for resale or redistribution** — stated
  professionally, never threateningly.
- The Telegram and Google Drive **URLs are placeholders** until the Founder
  supplies verified links. They are never published or invented.

---

## D-011 · Affiliate program — structure approved, terms pending

**Date:** 7 October 2026
**Decision:** An ICON Bootcamp Affiliate/Referral Program is introduced.
Referrers do **not** need to purchase the bootcamp themselves to earn.

- The **commission percentage, payout rules, eligibility, tracking and payment
  schedule are NOT approved** — they are config placeholders only, and the copy
  says they are "published once the official affiliate terms are confirmed".
- The CTA ("Become an ICON Affiliate") points to a placeholder destination
  until the Founder supplies the official application link.
- The program is clearly **separate from normal bootcamp registration**.

---

## D-012 · 10-day programme structure — APPROVED, timetable pending

**Date:** 7 October 2026
**Decision:** The site explains the 10-day structure: recorded/structured
sessions paired with practical tasks each day, delivered through the private
Telegram community with a Google Drive fallback.

- The **detailed day-by-day timetable is NOT supplied yet**. A clean,
  timetable-ready structure exists in config and renders dated day cards once
  populated. The final timetable will show actual dates from
  **Saturday 7 November 2026**.
- No timetable content is invented.

---

## D-007 · No blanket package-savings claim — arithmetic does not hold

**Date:** 6 October 2026

With the Founder-approved track **and** package prices both locked, the
"cheaper than buying the tracks individually" arithmetic did **not** hold for
every package under the **old** (pre-certificate) track prices:

| Package | Old sum of tracks | Package price | Result (old prices) |
|---|---|---|---|
| Creative Starter | 9,000 | 8,100 | saved 900 |
| Automation Starter | 10,000 | 9,000 | saved 1,000 |
| Prompt Creator | 12,000 | 9,550 | saved 2,450 |
| **Creative AI** | **13,000** | **14,450** | **cost 1,450 more** |
| Full ICON | 23,000 | 18,850 | saved 4,150 |

The honest fix then was the wording, not the price, so the Packages section
makes **no blanket savings claim** and describes packages as a single
enrolment covering the tracks listed.

**Updated 7 October 2026 — the anomaly is resolved.** Under the
certificate-inclusive track prices (D-008), every package now costs less than
the sum of its tracks:

| Package | New sum of tracks | Package price | Result (new prices) |
|---|---|---|---|
| Creative Starter | 11,000 | 8,100 | saves 2,900 |
| Automation Starter | 12,000 | 9,000 | saves 3,000 |
| Prompt Creator | 15,000 | 9,550 | saves 5,450 |
| Creative AI | 16,000 | 14,450 | saves 1,550 |
| Full ICON | 28,000 | 18,850 | saves 9,150 |

The savings claim is now **arithmetically true for all five packages**, so it
could in principle be shown. The site deliberately keeps the qualitative
wording regardless: package prices and track prices are approved independently
and either set can change in config, and a stated "you save X" figure would go
stale silently. `scripts/check_prices.py` recomputes the arithmetic from
config on every run and fails on any blanket savings claim in public copy
should the arithmetic ever stop holding — so the conservative wording is also
the low-maintenance choice.

---

## D-013 · Recovery-phase layout fixes — RENDERED-PAGE AUDIT

**Date:** 7 October 2026

Three defects existed in the shipped page but were invisible from source code
alone; each was reproduced against the live page at real viewport sizes before
fixing, and each now has a regression test (`scripts/audit_regression.js`).

1. **Announcement bar vs hero (320–414px).** The campaign sentence shared one
   flex row with the link and the close button, so the paragraph was crushed to
   ~103px and wrapped into a ~244px column. The bar grew to 269px and pushed the
   white header *inside* the navy hero, rendering as a broken two-tone band.
   Fix: stack the text above the actions under 640px. The desktop single-row
   layout is unchanged.
2. **Hero price vs suffix (320–375px).** The 17px gold price sits inside a 15px/1.45
   line box, so the wrapped suffix overlapped the price glyphs by 22px. Fix: a
   taller line box and, under 640px, the suffix becomes its own line. Desktop
   keeps the inline sentence.
3. **Dead `tel:` links (all viewports).** `contact.phoneE164` held a masked
   placeholder and the three markup links were hardcoded copies with no
   `data-tel` hook, so `applyContact()` never bound them. Fix: the config value
   is now the dialable E.164 number and all markup links (including the three
   legal pages) route through `data-tel`, so the number is edited in one place.

**Principle recorded:** the repo's source-level checks all passed while these
   were live. Layout correctness must be verified against the *rendered* page at
   320px, not inferred from CSS.
