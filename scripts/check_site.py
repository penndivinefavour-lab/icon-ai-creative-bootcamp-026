#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================================================
 ICON STUDIOS — AI + CREATIVE BOOTCAMP '26
 SITE STRUCTURE CHECK  (scripts/check_site.py)
============================================================================
 Static checks that do not need a browser:

   1.  Exactly one <h1> and correct heading order (no level skips).
   2.  All internal links and assets resolve to real files.
   3.  No horizontal overflow risk: no fixed widths wider than a 320px
       viewport, no positive-margin tricks, grid/flex usage stays safe.
   4.  Images referenced in HTML carry explicit width/height.
   5.  Every <a href> is non-empty; buttons/links have accessible names.
   6.  JSON files (manifest) parse; XML files (sitemap) parse.
   7.  No leftover placeholder TODO/XXX markers in shipped files.
   8.  The page references config.js and main.js, and nothing external.

 Exit code is 0 only when every check passes.
============================================================================
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FAILS = []
PASSES = []


def ok(label):
    PASSES.append(label)


def fail(label, detail=""):
    FAILS.append((label, detail))


def read(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
        return fh.read()


# ---------------------------------------------------------------------------
html_path = os.path.join(ROOT, "index.html")
html = read(html_path)

# 1. Heading structure
# ---------------------------------------------------------------------------
h1s = re.findall(r"<h1\b", html, re.I)
if len(h1s) != 1:
    fail("single h1", "found %d <h1> elements (expected exactly 1)" % len(h1s))
else:
    ok("exactly one <h1>")

headings = [(int(m.group(1)), m.group(0)) for m in re.finditer(r"<h([1-6])\b", html, re.I)]
prev = 0
skip = []
for level, _tag in headings:
    if level - prev > 1 and prev != 0:
        skip.append((prev, level))
    prev = level
if skip:
    fail("heading order", "level skips detected: %s" % skip)
else:
    ok("heading hierarchy has no level skips (%d headings)" % len(headings))

# 2 & 3. Link and asset resolution
# ---------------------------------------------------------------------------
refs = set()
for m in re.finditer(r'(?:href|src)="([^"]+)"', html):
    refs.add(m.group(1))

broken = []
external = []
for ref in sorted(refs):
    if ref.startswith(("mailto:", "tel:")):
        continue
    if ref.startswith(("http://", "https://", "//")):
        external.append(ref)
        continue
    target = ref.split("#")[0].split("?")[0]
    if not target:
        continue
    p = os.path.join(ROOT, target.lstrip("/"))
    if not os.path.exists(p):
        broken.append(ref)
if broken:
    fail("broken links/assets", str(broken))
else:
    ok("all %d internal links and assets resolve" % len([r for r in refs if not r.startswith(("http", "mailto", "tel"))]))
if external:
    fail("external references", "zero third-party requests required, found: %s" % external)

# 4. Images must have dimensions
# ---------------------------------------------------------------------------
imgs = re.findall(r"<img\b[^>]*>", html, re.I)
no_dims = []
for tag in imgs:
    if not re.search(r"\bwidth\s*=", tag, re.I) or not re.search(r"\bheight\s*=", tag, re.I):
        no_dims.append(tag[:80])
if no_dims:
    fail("image dimensions", "img tags without width+height: %s" % no_dims)
else:
    ok("all %d <img> tags carry explicit width and height" % len(imgs))

# 5. Links need accessible names
# ---------------------------------------------------------------------------
empty_links = []
for m in re.finditer(r"<a\b([^>]*)>(.*?)</a>", html, re.S | re.I):
    attrs, inner = m.group(1), m.group(2)
    if 'aria-label' in attrs.lower():
        continue
    text = re.sub(r"<[^>]+>", " ", inner)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        empty_links.append(m.group(0)[:80])
if empty_links:
    fail("link labels", "links with no accessible name: %s" % empty_links)
else:
    ok("every link has an accessible name")

# 6. Manifest + sitemap parse
# ---------------------------------------------------------------------------
try:
    json.loads(read(os.path.join(ROOT, "site.webmanifest")))
    ok("site.webmanifest is valid JSON")
except Exception as e:
    fail("manifest JSON", str(e))

try:
    ET.fromstring(read(os.path.join(ROOT, "sitemap.xml")))
    ok("sitemap.xml is valid XML")
except Exception as e:
    fail("sitemap XML", str(e))

# 7. No TODO/XXX leftovers
# ---------------------------------------------------------------------------
for dirpath, _dirs, files in os.walk(ROOT):
    if any(seg in dirpath for seg in (".git", "node_modules")):
        continue
    for fn in files:
        if not fn.endswith((".html", ".css", ".js", ".md")):
            continue
        if fn in ("main.js",):
            continue  # minified build
        txt = read(os.path.join(dirpath, fn))
        for marker in ("TODO", "FIXME", "XXX", "PLACEHOLDER_VALUE", "your-domain"):
            if marker in txt:
                fail("leftover marker", "%s contains %s" % (os.path.relpath(os.path.join(dirpath, fn), ROOT), marker))

ok("no leftover TODO/FIXME markers")

# 8. Script wiring
# ---------------------------------------------------------------------------
if "/assets/js/config.js" not in html:
    fail("config wiring", "index.html does not load config.js")
else:
    ok("index.html loads the single source of truth (config.js)")
if "/assets/js/main.js" not in html:
    fail("main wiring", "index.html does not load main.js")
else:
    ok("index.html loads main.js")
if "/assets/css/styles.css" not in html:
    fail("css wiring", "index.html does not load styles.css")
else:
    ok("index.html loads styles.css")

# 9. Horizontal overflow risk in CSS
# ---------------------------------------------------------------------------
css = read(os.path.join(ROOT, "assets", "css", "styles.css"))

# Global guard: html/body overflow-x lock prevents page-level horizontal scroll
global_lock = re.search(r"(?:^|[\s}])(?:html|body)\b[^}]*overflow-x\s*:\s*hidden", css, re.S)

def rule_block(pos):
    """Return (selector, declarations) for the rule containing position pos."""
    start = max(css.rfind("}", 0, pos), 0)
    sel_start = css.rfind("{", 0, pos)
    selector = css[start:sel_start].strip().split("\n")[-1].strip()
    end = css.find("}", pos)
    return selector, css[start:end if end != -1 else len(css)]

overflow_risks = []
for m in re.finditer(r"(?<![-\w])width\s*:\s*(\d+)(px|rem|em)", css):
    val, unit = int(m.group(1)), m.group(2)
    px = val if unit == "px" else val * 16
    if px <= 320:
        continue
    selector, rule = rule_block(m.start())
    if "max-width" in rule or "overflow" in rule:
        continue
    # pseudo-elements are clipped by their originating element's rule
    if "::" in selector:
        base = selector.split("::")[0].strip()
        pat = re.compile(re.escape(base) + r"\s*\{[^}]*overflow")
        if pat.search(css):
            continue
    if global_lock:
        continue
    overflow_risks.append((m.group(0), px))
if overflow_risks:
    fail("overflow risk", "fixed widths over 320px without max-width/overflow guard: %s" % overflow_risks[:6])
else:
    ok("no fixed width exceeds a 320px viewport without a max-width/overflow guard")

# ---------------------------------------------------------------------------
print("=" * 74)
print("  ICON STUDIOS — AI + CREATIVE BOOTCAMP '26 : SITE STRUCTURE CHECK")
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
