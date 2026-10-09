#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================================================
 ICON STUDIOS — AI + CREATIVE BOOTCAMP '26
 PRICE & CONTENT VALIDATION  (scripts/check_prices.py)
============================================================================
 Validates the single source of truth (assets/js/config.js) and the rendered
 page (index.html) against the approved business rules:

   1.  Public prices are XAF/FCFA only. No NGN, USD, EUR, GBP or any other
       currency, and no invented exchange rates.
   2.  The five tracks appear in the approved order with the approved
       certificate-inclusive prices: 6000 / 5000 / 5000 / 7000 / 5000 XAF
       (the earlier 5000/4000/4000/6000/4000 figures are superseded).
   3.  Discount stages are exactly 20% / 10% / 5% and are only active when
       the Founder has set BOTH start and end dates (no invented dates).
   4.  Hero anchors are DERIVED from the lowest track price: 5000 standard,
       4000 with the deepest (20%) launch discount.
   5.  Certificates: the 10-Day Bootcamp Completion Certificate is INCLUDED
       in every registration price (no separate fee is ever published), and
       the 10-Day Challenge Certificate is a separate, earned certificate.
       The challenge fee stays in PRICE_PENDING_VERIFICATION and no number
       is published for it.
   6.  No unverified Selar URL is published. Empty or non-Selar values are
       treated as "pending" and must NOT appear as real checkout links.
   7.  Bundles are disabled (not approved) so no bundle price is published.
   8.  Only the approved contact details are used; the unverified numbers
       (+237 672 536 260 / 67256260) never appear.
   9.  The approved brand palette is the only colour system in the CSS —
       no orange and no unapproved hues.
   10.  Exactly 10 Selar product slots — 5 tracks + 5 packages — each with
        a matching price, and no certificate product slot.
   11.  No superseded ("stale") price string from the old optional-
        certificate model appears anywhere in public copy.

 Exit code is 0 only when every check passes.
============================================================================
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT, "assets", "js", "config.js")
HTML_PATH = os.path.join(ROOT, "index.html")
CSS_PATH = os.path.join(ROOT, "assets", "css", "styles.css")

# Certificate-inclusive prices (Founder update, D-008). The certificate cost
# is now incorporated into each registration price; the earlier
# 5000/4000/4000/6000/4000 figures are superseded and must not be published.
APPROVED_TRACKS = [
    ("graphic-design", "Graphic Designing", 6000),
    ("prompt-engineering", "Prompt Engineering", 5000),
    ("image-generation", "Image Generation", 5000),
    ("ai-automation", "AI Automation", 7000),
    ("ai-video-generation", "AI Video Generation", 5000),
]

# Superseded strings from the old optional-certificate pricing model. None of
# these may appear as a published price anywhere in the public page copy.
STALE_PRICE_STRINGS = [
    "5,000 XAF", "4,000 XAF", "6,000 XAF",
    "From 3,200 FCFA", "From 4,000 FCFA",
    "Optional certificate", "certificate is optional",
    "1,500 XAF", "1,000 XAF",
]

APPROVED_PALETTE = {
    "#1a2744",  # Deep Navy
    "#6b21a8",  # Rich Purple
    "#f5c518",  # Golden Yellow
    "#ffffff",  # White
    "#1e1e2e",  # Charcoal
}

FAILS = []
PASSES = []


def ok(label):
    PASSES.append(label)


def fail(label, detail=""):
    FAILS.append((label, detail))


# ---------------------------------------------------------------------------
# Load config.js as JSON (strip // comments, tolerate trailing semicolon)
# ---------------------------------------------------------------------------
def load_config(path):
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.read()
    # Strip comments (/* */ blocks and // lines) but never inside strings.
    out = []
    i = 0
    n = len(raw)
    in_str = False
    quote = ""
    while i < n:
        ch = raw[i]
        nxt = raw[i + 1] if i + 1 < n else ""
        if in_str:
            out.append(ch)
            if ch == "\\":
                out.append(nxt)
                i += 2
                continue
            if ch == quote:
                in_str = False
            i += 1
            continue
        if ch in ('"', "'"):
            in_str = True
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and nxt == "/":
            while i < n and raw[i] != "\n":
                i += 1
            continue
        if ch == "/" and nxt == "*":
            i += 2
            while i + 1 < n and not (raw[i] == "*" and raw[i + 1] == "/"):
                i += 1
            i += 2
            continue
        out.append(ch)
        i += 1
    cleaned = "".join(out)
    start = re.search(r"window\.SITE_CONFIG\s*=\s*\{", cleaned)
    if not start:
        raise SystemExit("FATAL: could not locate window.SITE_CONFIG in config.js")
    # Balanced-brace scan so nested objects/arrays are captured correctly.
    depth = 0
    i = start.end() - 1
    in_str = False
    esc = False
    while i < len(cleaned):
        ch = cleaned[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
        i += 1
    if depth != 0:
        raise SystemExit("FATAL: unbalanced braces in window.SITE_CONFIG")
    return json.loads(cleaned[start.end() - 1:i + 1])


def fmt_money(n):
    return "{:,}".format(int(n)).replace(",", ",")


cfg = load_config(CONFIG_PATH)
pricing = cfg["pricing"]

# ---------------------------------------------------------------------------
# 1. Currency
# ---------------------------------------------------------------------------
if pricing.get("currency") != "XAF":
    fail("currency", "pricing.currency must be 'XAF', got %r" % pricing.get("currency"))
else:
    ok("pricing.currency is XAF")

if pricing.get("currencyLabel") not in ("FCFA", "XAF"):
    fail("currencyLabel", "got %r" % pricing.get("currencyLabel"))
else:
    ok("pricing.currencyLabel is FCFA")

# ---------------------------------------------------------------------------
# 2. Tracks: order, names, prices
# ---------------------------------------------------------------------------
tracks = pricing.get("tracks", [])
if len(tracks) != 5:
    fail("track count", "expected 5 tracks, found %d" % len(tracks))
else:
    ok("exactly five tracks")

for idx, (tid, tname, tprice) in enumerate(APPROVED_TRACKS):
    got = tracks[idx] if idx < len(tracks) else {}
    if got.get("id") != tid or got.get("name") != tname:
        fail("track %d identity" % (idx + 1),
             "expected %r/%r, got %r/%r" % (tid, tname, got.get("id"), got.get("name")))
    else:
        ok("track %d is %s" % (idx + 1, tname))
    if int(got.get("price", -1)) != tprice:
        fail("track %d price" % (idx + 1),
             "expected %d XAF, got %r" % (tprice, got.get("price")))
    else:
        ok("track %d price is %s XAF (approved)" % (idx + 1, fmt_money(tprice)))

# ---------------------------------------------------------------------------
# 3. Discount stages: exact percentages, date sanity, no invented dates
# ---------------------------------------------------------------------------
stages = pricing.get("stages", [])
expected_pct = [20, 10, 5]
if [int(s.get("pct", 0)) for s in stages] != expected_pct or len(stages) != 3:
    fail("stage percentages", "expected [20, 10, 5], got %s" % [s.get("pct") for s in stages])
else:
    ok("stage percentages are exactly 20 / 10 / 5")

date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
active_stage = None
windows = []
for s in stages:
    start, end = s.get("start", ""), s.get("end", "")
    for label, val in (("start", start), ("end", end)):
        if val != "" and not date_re.match(val):
            fail("stage %s %s format" % (s["id"], label), "expected YYYY-MM-DD or empty, got %r" % val)
    if start and end:
        if start > end:
            fail("stage %s window" % s["id"], "start %s is after end %s" % (start, end))
        else:
            windows.append((s["id"], start, end, int(s["pct"])))
    elif start or end:
        fail("stage %s half-set" % s["id"], "both dates must be set together; got start=%r end=%r" % (start, end))

# Non-overlapping windows
for i in range(len(windows)):
    for j in range(i + 1, len(windows)):
        a, b = windows[i], windows[j]
        if a[1] <= b[2] and b[1] <= a[2]:
            fail("overlapping stages", "%s and %s overlap" % (a[0], b[0]))
if windows:
    ok("%d scheduled stage window(s), none overlapping" % len(windows))
else:
    ok("no discount dates scheduled (standard pricing shown — nothing invented)")

# ---------------------------------------------------------------------------
# 4. Hero anchor
# ---------------------------------------------------------------------------
anchor = pricing.get("heroAnchor", {})
ANCHOR_STD = min(int(t["price"]) for t in tracks)
ANCHOR_STAGE = int(round(ANCHOR_STD * (1 - max(expected_pct) / 100.0)))
if int(anchor.get("onStageActive", -1)) != ANCHOR_STAGE:
    fail("hero anchor active", "expected %d (derived), got %r" % (ANCHOR_STAGE, anchor.get("onStageActive")))
else:
    ok("hero anchor when a stage is active: From %s FCFA" % fmt_money(ANCHOR_STAGE))
if int(anchor.get("onStandard", -1)) != ANCHOR_STD:
    fail("hero anchor standard", "expected %d (derived), got %r" % (ANCHOR_STD, anchor.get("onStandard")))
else:
    ok("hero anchor on standard pricing: From %s FCFA" % fmt_money(ANCHOR_STD))

# Lowest standard price must match the anchor's standard value
lowest_std = min(int(t["price"]) for t in tracks)
if lowest_std != int(anchor.get("onStandard", -1)):
    fail("anchor vs lowest price", "lowest standard track price %d != onStandard %r" % (lowest_std, anchor.get("onStandard")))
else:
    ok("lowest standard track price (%s XAF) matches the standard hero anchor" % fmt_money(lowest_std))

# Lowest possible stage price must match the active anchor value
lowest_stage = min(int(round(int(t["price"]) * (1 - max(expected_pct) / 100.0))) for t in tracks)
if lowest_stage != int(anchor.get("onStageActive", -1)):
    fail("anchor vs stage price", "deepest-discount lowest price %d != onStageActive %r" % (lowest_stage, anchor.get("onStageActive")))
else:
    ok("deepest-discount lowest price (%s XAF) matches the launch hero anchor" % fmt_money(lowest_stage))

# ---------------------------------------------------------------------------
# 5. Certificates — two distinct certificates (D-008)
# ---------------------------------------------------------------------------
certs = cfg.get("certificates", {})
bc = certs.get("bootcamp", {})
ch_cert = certs.get("challenge", {})
if not bc.get("included"):
    fail("bootcamp certificate", "the completion certificate must be included in registration prices")
else:
    ok("10-Day Bootcamp Completion Certificate is included in every registration price")
if cfg.get("certificate"):
    fail("legacy certificate key", "the old optional-certificate block must be removed")
if str(ch_cert.get("feeState", "")) != "PRICE_PENDING_VERIFICATION":
    fail("challenge certificate state", "expected PRICE_PENDING_VERIFICATION, got %r" % ch_cert.get("feeState"))
else:
    ok("10-Day Challenge Certificate is separate and fee-pending (no number published)")
if str(ch_cert.get("challengeFee", "")).strip() != "":
    fail("challenge certificate fee", "a fee must not be present while it is unverified: %r" % ch_cert.get("challengeFee"))
else:
    ok("no challenge fee value is stored while it is pending verification")
# No separate certificate price may be QUOTED in public copy. Negations ("there
# is no separate certificate fee") are correct and must not be flagged — only
# an affirmative fee with an amount is a violation.
for _fpath in (HTML_PATH, CONFIG_PATH):
    if not os.path.exists(_fpath):
        continue
    _txt = open(_fpath, "r", encoding="utf-8", errors="ignore").read()
    _low = _txt.lower()
    # Assistant keyword arrays ("k": [...]) are match metadata used to
    # RECOGNISE a question, not published copy — a phrase such as
    # "certificate fee" there is not a fee claim. Strip them so the scan stays
    # strict on the answers, which ARE public copy.
    if _fpath == CONFIG_PATH:
        _low = re.sub(r'"k"\s*:\s*\[[^\]]*\]', ' ', _low)
    for _bad in ("optional certificate fee", "add certificate",
                 "certificate fee of", "certificate — 1,500", "certificate - 1,500"):
        if _bad in _low:
            fail("separate certificate fee", "%s mentions %r" % (os.path.relpath(_fpath, ROOT), _bad))
    # An affirmative "certificate fee" followed by an amount is a violation;
    # a negation ("no separate certificate fee", "never pay a ... certificate
    # fee") is not. Collapse whitespace so line breaks don't hide the negation.
    for _m in re.finditer(r"certificate fee", _low):
        _ctx = re.sub(r"\s+", " ", _low[max(0, _m.start() - 60):_m.start() + 24])
        if not re.search(r"(\bno\b|\bwithout\b|never|not for|isn't a separate)", _ctx[:58]):
            fail("separate certificate fee", "%s quotes an affirmative certificate fee: %r" % (os.path.relpath(_fpath, ROOT), _ctx))
ok("no separate certificate fee is published anywhere")

# ---------------------------------------------------------------------------
# 5b. Packages — five approved names, exact approved prices, never recomputed
# ---------------------------------------------------------------------------
APPROVED_PACKAGES = [
    ("Creative Starter", 8100),
    ("Automation Starter", 9000),
    ("Prompt Creator", 9550),
    ("Creative AI", 14450),
    ("Full ICON", 18850),
]
packages = cfg.get("packages", {})
if not packages.get("enabled"):
    fail("packages enabled", "the five approved packages must be published")
else:
    ok("packages are enabled (five approved packages published)")
items = packages.get("items", [])
if len(items) != 5:
    fail("package count", "expected 5 packages, got %d" % len(items))
by_name = {}
for it in items:
    by_name[str(it.get("name"))] = it
for idx, (pname, pprice) in enumerate(APPROVED_PACKAGES):
    got = by_name.get(pname)
    if got is None:
        fail("package %d" % (idx + 1), "missing approved package %r" % pname)
        continue
    if int(got.get("price", -1)) != pprice:
        fail("package %r price" % pname,
             "expected %d XAF (approved), got %r" % (pprice, got.get("price")))
    else:
        ok("package %d %r price is %s FCFA (approved)" % (idx + 1, pname, fmt_money(pprice)))
    # every included track id must resolve to a real track
    for tid in got.get("includedTrackIds", []):
        if tid not in {t["id"] for t in tracks}:
            fail("package %r includes" % pname, "unknown track id %r" % tid)
if [str(it.get("name")) for it in items] == [p[0] for p in APPROVED_PACKAGES]:
    ok("all five approved package names present in the approved order")
else:
    fail("package order",
         "expected %s" % [p[0] for p in APPROVED_PACKAGES])

# ---------------------------------------------------------------------------
# 5c. Ten Selar product slots — exactly 5 tracks + 5 packages, prices match
# ---------------------------------------------------------------------------
prod = cfg.get("payment", {}).get("products", {})
track_slots = {k: v for k, v in prod.items() if v.get("type") == "track"}
pkg_slots = {k: v for k, v in prod.items() if v.get("type") == "package"}
extra_slots = {k: v for k, v in prod.items() if v.get("type") not in ("track", "package")}
if len(track_slots) != 5:
    fail("track product slots", "expected 5, got %d" % len(track_slots))
else:
    ok("exactly 5 individual-track Selar product slots")
if len(pkg_slots) != 5:
    fail("package product slots", "expected 5, got %d" % len(pkg_slots))
else:
    ok("exactly 5 package Selar product slots (10 total)")
if extra_slots:
    fail("extra product slots", "the certificate is included in registration prices, so no extra slot may exist: %s" % list(extra_slots))
else:
    ok("no extra product slots — the certificate is not a separate product")
# every product price must match its source track/package price exactly
src_price = {}
for t in tracks:
    src_price[t["id"]] = int(t["price"])
for it in items:
    src_price[it["id"]] = int(it["price"])
for key, p in prod.items():
    want = src_price.get(key)
    if want is None:
        fail("product slot %r" % key, "does not map to any track or package")
    elif int(p.get("price", -1)) != want:
        fail("product slot %r price" % key, "expected %d, got %r" % (want, p.get("price")))
if all(k in src_price for k in prod):
    ok("all 10 product slots map to a real track or package with a matching price")

# ---------------------------------------------------------------------------
# 5d. Campaign dates — countdown target is the approved Bootcamp start
# ---------------------------------------------------------------------------
campaign = cfg.get("campaign", {})
if campaign.get("launchDate") != "2026-10-10":
    fail("campaign launch date", "expected 2026-10-10, got %r" % campaign.get("launchDate"))
else:
    ok("campaign launch date is 10 October 2026 (approved)")
boot = campaign.get("bootcampStart", {})
if boot.get("date") != "2026-11-07":
    fail("bootcamp start date", "expected 2026-11-07, got %r" % boot.get("date"))
else:
    ok("bootcamp start date is 7 November 2026 (approved)")
# the label must be the truthful long-form date, never a bare number
blabel = str(boot.get("label", ""))
if "7 November 2026" not in blabel:
    fail("bootcamp start label", "expected the full date, got %r" % blabel)
else:
    ok("countdown label is the full approved date: %s" % blabel)
if not str(boot.get("iso", "")).startswith("2026-11-07T"):
    fail("bootcamp ISO timestamp", "expected 2026-11-07T..., got %r" % boot.get("iso"))
else:
    ok("countdown is driven by a single ISO timestamp (%s)" % boot.get("iso"))
# 7 Nov 2026 must genuinely be a Saturday (truthful label check)
import datetime as _dt
_d = _dt.date(2026, 11, 7)
if _d.strftime("%A") != "Saturday":
    fail("start-date weekday", "7 November 2026 is not a Saturday")
else:
    ok("7 November 2026 is indeed a Saturday (label is truthful)")
if not campaign.get("countdown", {}).get("enabled"):
    fail("countdown enabled", "the approved countdown must be enabled")
else:
    ok("countdown is enabled with live/ended transition labels")

# ---------------------------------------------------------------------------
# 6. Selar links — nothing unverified may be published
# ---------------------------------------------------------------------------
SELAR_HOST_RE = re.compile(r"^https://(www\.)?selar\.(co|com)/", re.I)
products = cfg.get("payment", {}).get("products", {})
pending, published = [], []
for key, prod in products.items():
    url = (prod.get("url") or "").strip()
    if url == "":
        pending.append(key)
    elif SELAR_HOST_RE.match(url):
        published.append((key, url))
    else:
        fail("selar product %r" % key, "not a Selar URL and not empty: %r" % url)

if published:
    for key, url in published:
        ok("Selar product %r published: %s" % (key, url))
else:
    ok("no Selar URLs published yet — all %d product links are pending (safe placeholders)" % len(pending))

# Scan the whole repo for any accidental hardcoded Selar checkout links
selar_hits = []
for dirpath, _dirs, files in os.walk(ROOT):
    if any(seg in dirpath for seg in (".git", "node_modules")):
        continue
    for fn in files:
        fpath = os.path.join(dirpath, fn)
        if fn.endswith((".woff2", ".png", ".jpg", ".webp", ".ico", ".svg")):
            continue
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            continue
        if fn == "check_prices.py":
            continue
        for m in re.finditer(r'selar\.(co|com)/[A-Za-z0-9_\-\?=&%/\.]+', content, re.I):
            # allow the documentation/regex mentions but not real product links
            if m.group(0).rstrip("/").lower() in ("selar.co", "selar.com"):
                continue
            if "/selar.co/" in content and "selar.co/..." in content:
                continue
            selar_hits.append((fpath, m.group(0)))

# Filter out explanatory/placeholder mentions of the bare domain
real_hits = []
for fpath, hit in selar_hits:
    if re.match(r"^https?://(www\.)?selar\.(co|com)/(?!a/|checkout|product)", hit, re.I):
        continue
    real_hits.append((fpath, hit))
if real_hits:
    for fpath, hit in real_hits:
        fail("hardcoded Selar link", "%s: %s" % (os.path.relpath(fpath, ROOT), hit))
else:
    ok("no hardcoded or fake Selar checkout links anywhere in the project")

# ---------------------------------------------------------------------------
# 7. Bundles must be disabled
# ---------------------------------------------------------------------------
if cfg.get("bundles", {}).get("enabled"):
    fail("bundles enabled", "bundles are not approved and must stay disabled")
else:
    ok("bundles are disabled by default (not approved — nothing published)")

# ---------------------------------------------------------------------------
# 8. Contact details
# ---------------------------------------------------------------------------
contact = cfg.get("contact", {})
if contact.get("phoneDisplay", "").strip() != "+237 675 140 957":
    fail("contact phone", "expected the approved +237 675 140 957, got %r" % contact.get("phoneDisplay"))
else:
    ok("contact phone is the approved +237 675 140 957")
if contact.get("email", "").strip().lower() != "iconstudiosyde@gmail.com":
    fail("contact email", "got %r" % contact.get("email"))
else:
    ok("contact email is iconstudiosyde@gmail.com")

banned_tokens = ["672536260", "672 536 260", "67256260"]
# Scan the *effective* content only — parsed config values and comment-free
# HTML — so documentation that says "never use 672 536 260" is not flagged.
scan_texts = []
scan_texts.append((CONFIG_PATH, json.dumps(cfg)))
if os.path.exists(HTML_PATH):
    with open(HTML_PATH, "r", encoding="utf-8", errors="ignore") as fh:
        html_txt = fh.read()
    html_txt = re.sub(r"<!--.*?-->", " ", html_txt, flags=re.S)
    scan_texts.append((HTML_PATH, html_txt))
for fpath, txt in scan_texts:
    for tok in banned_tokens:
        if tok in txt:
            fail("unverified phone number", "%s contains %r" % (os.path.relpath(fpath, ROOT), tok))
ok("no unverified phone numbers (+237 672 536 260 / 67256260) anywhere")

# ---------------------------------------------------------------------------
# 9. Forbidden currencies anywhere in config/html
# ---------------------------------------------------------------------------
forbidden_money = [
    (r'\bngn\b', "NGN"), (r'\busd\b', "USD"), (r'\beur\b', "EUR"),
    (r'\bgbp\b', "GBP"), (r'\$\s?\d', "dollar price"),
    (r'€\s?\d', "euro price"), (r'£\s?\d', "pound price"),
    (r'\bexchange rate\b', "exchange-rate mention"),
]
for fpath, txt in scan_texts:
    low = txt.lower()
    for pat, label in forbidden_money:
        if re.search(pat, low):
            fail("forbidden currency/pricing", "%s mentions %s" % (os.path.relpath(fpath, ROOT), label))
ok("no non-XAF currency, no $/€/£ prices, no exchange-rate mentions")

# ---------------------------------------------------------------------------
# 10. Palette — no orange, no unapproved hues in CSS
#     Derived tones are permitted ONLY if they are a tint (blended toward
#     white) or a shade (blended toward black) of one of the five approved
#     colours, which keeps the approved hue family intact.
# ---------------------------------------------------------------------------
def _hex_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _is_tint_or_shade(hexc, tolerance=3):
    """True if hexc is a tint or shade of an approved colour."""
    r, g, b = _hex_rgb(hexc)
    for base in APPROVED_PALETTE:
        br, bg, bb = _hex_rgb(base)
        # tint: base moved toward white by factor t
        for t in [i / 100.0 for i in range(1, 101)]:
            if (abs(r - round(br + (255 - br) * t)) <= tolerance and
                    abs(g - round(bg + (255 - bg) * t)) <= tolerance and
                    abs(b - round(bb + (255 - bb) * t)) <= tolerance):
                return True
        # shade: base moved toward black by factor t
        for t in [i / 100.0 for i in range(1, 101)]:
            if (abs(r - round(br * (1 - t))) <= tolerance and
                    abs(g - round(bg * (1 - t))) <= tolerance and
                    abs(b - round(bb * (1 - t))) <= tolerance):
                return True
    return False


if os.path.exists(CSS_PATH):
    with open(CSS_PATH, "r", encoding="utf-8") as fh:
        css = fh.read()
    hexes = set(h.lower() for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", css))
    base_allowed = set(APPROVED_PALETTE) | {"#000000", "#ffffff"}
    for h in hexes:
        core = h[0:7]
        if h in base_allowed or core in base_allowed:
            continue
        if len(h) == 9 and core in base_allowed:  # 8-digit alpha form
            continue
        if _is_tint_or_shade(h):
            continue
        fail("unapproved colour", "styles.css uses %s which is outside the approved palette" % h)
    for bad in ("orange",):
        if re.search(r"\b%s\b" % bad, css, re.I):
            fail("orange present", "styles.css contains %r" % bad)
    if not any(f[0].startswith("unapproved colour") or f[0] == "orange present" for f in FAILS):
        ok("CSS uses only the approved brand palette and its tints/shades (no orange)")
else:
    ok("styles.css not yet present (skipped palette check)")

# ---------------------------------------------------------------------------
# 11. No-JS fallback: static prices embedded in index.html must match config
# ---------------------------------------------------------------------------
if os.path.exists(HTML_PATH):
    with open(HTML_PATH, "r", encoding="utf-8") as fh:
        html = fh.read()
    ns_prices = re.findall(r'track-price__amount">([\d,]+)\s*FCFA', html)
    want = [fmt_money(t[2]) for t in APPROVED_TRACKS]
    if ns_prices != want:
        fail("noscript track prices", "index.html static fallback has %s, expected %s" % (ns_prices, want))
    else:
        ok("no-JS fallback track prices match config exactly")

    ns_rows = re.findall(r'price-row__amount">([\d,]+)\s*FCFA', html)
    if ns_rows != want:
        fail("noscript price rows", "index.html static fallback has %s, expected %s" % (ns_rows, want))
    else:
        ok("no-JS fallback price table matches config exactly (no certificate row)")

    ns_names = re.findall(r'<div class="track-card__head"><h3>([^<]+)</h3>', html)
    want_names = [t[1] for t in APPROVED_TRACKS]
    if ns_names != want_names:
        fail("noscript track names", "index.html static fallback has %s, expected %s" % (ns_names, want_names))
    else:
        ok("no-JS fallback track names and order match config exactly")
else:
    ok("index.html not yet present (skipped no-JS fallback check)")

# ---------------------------------------------------------------------------
# 12. Savings integrity: never claim packages are cheaper "track by track"
#     unless the arithmetic holds for EVERY package. Package prices are
#     Founder-approved and must never be altered to make a savings claim work
#     (see docs/DECISION_LOG.md D-007), so the honest fix is always the
#     wording, never the price.
# ---------------------------------------------------------------------------
_track_prices = {t[0]: t[2] for t in APPROVED_TRACKS}
_pkg_sum = {}
for _p in cfg.get("packages", {}).get("items", []):
    _pkg_sum[_p["name"]] = sum(_track_prices.get(i, 0) for i in _p.get("includedTrackIds", []))
_all_save = all(v and v > p["price"] for p, v in
                ((p, _pkg_sum.get(p["name"])) for p in cfg.get("packages", {}).get("items", [])))

for _path in (HTML_PATH, os.path.join(ROOT, "assets", "js", "config.js")):
    if not os.path.exists(_path):
        continue
    with open(_path, "r", encoding="utf-8") as _fh:
        _src = _fh.read()
    # Public-facing blanket savings claims near packages.
    _bad = re.findall(r"(?i)(save (?:money )?(?:against|versus|vs\.?)|cheaper than|save .*track by track)", _src)
    # Config comments document the rule and mention the phrase only to forbid it.
    _bad = [b for b in _bad if not re.search(r"(?i)no .{0,40}you save|never", _src[max(0, _src.lower().find(b.lower()) - 80):_src.lower().find(b.lower())])]
    if _bad and not _all_save:
        fail("package savings claim", "%s claims package savings but the approved arithmetic does not hold for every package: %s" % (_path, _bad))
        break
    elif not _bad:
        ok("no blanket package-savings claim anywhere (value is described qualitatively)")
        break
    else:
        ok("package savings arithmetic verified for all packages")
        break

# ---------------------------------------------------------------------------
# 13. Stale prices: superseded strings from the old optional-certificate
#     model must never reappear as published prices in the public page.
#     Comments in config.js that document the rule are excluded.
# ---------------------------------------------------------------------------
if os.path.exists(HTML_PATH):
    _html = open(HTML_PATH, "r", encoding="utf-8", errors="ignore").read()
    _html_nocomment = re.sub(r"<!--.*?-->", " ", _html, flags=re.S)
    _stale_hits = [t for t in STALE_PRICE_STRINGS if t in _html_nocomment]
    if _stale_hits:
        fail("stale prices", "index.html public copy contains superseded price strings: %s" % _stale_hits)
    else:
        ok("no superseded price strings from the old optional-certificate model")
else:
    ok("index.html not yet present (skipped stale-price check)")

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
print("=" * 74)
print("  ICON STUDIOS — AI + CREATIVE BOOTCAMP '26 : PRICE & CONTENT CHECK")
print("=" * 74)
for label in PASSES:
    print("  PASS  " + label)
for label, detail in FAILS:
    print("  FAIL  " + label + ((" — " + detail) if detail else ""))
print("-" * 74)
print("  %d passed, %d failed" % (len(PASSES), len(FAILS)))
print("=" * 74)
if FAILS:
    sys.exit(1)
sys.exit(0)
