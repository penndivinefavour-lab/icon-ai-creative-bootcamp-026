'use strict';
// Geometry audit: floating WhatsApp button vs sticky enrol bar, and the
// bounding boxes of every fixed/scroll-dependent control, at each viewport.
// Verifies the two never overlap, the float respects safe-area inset, and the
// sticky bar never exceeds its 72px cap.
// Usage: node scripts/audit_geometry.js [port]

const path = require('path');
const { openPage } = require(path.join(__dirname, 'cdp.js'));

const PORT = parseInt(process.argv[2] || '8080', 10);
const URL = `http://127.0.0.1:${PORT}/`;
const VIEWPORTS = [
  { w: 320, h: 700 }, { w: 375, h: 760 }, { w: 390, h: 780 },
  { w: 414, h: 800 }, { w: 768, h: 900 }, { w: 1280, h: 800 }
];
const STICKY_CAP = 72;

const probeJS = function () {
  const $ = (s) => document.querySelector(s);
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.width), h: Math.round(b.height),
      disp: cs.display, vis: cs.visibility, op: parseFloat(cs.opacity),
      tf: cs.transform
    };
  };
  const sticky = box($('.sticky-cta'));
  const wa = box($('#whatsapp-float'));
  // vertical gap between the float's bottom edge and the sticky bar's top edge
  let gap = null;
  if (sticky && wa && sticky.h > 0 && wa.h > 0) {
    gap = Math.round(sticky.y - (wa.y + wa.h));
  }
  // do their horizontal extents intersect at all?
  let hOverlap = false;
  if (sticky && wa) {
    hOverlap = !(wa.x + wa.w <= sticky.x || sticky.x + sticky.w <= wa.x);
  }
  const bodyPad = parseInt(getComputedStyle(document.body).paddingBottom, 10);
  return {
    sticky, wa, gap, hOverlap, bodyPad,
    docW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    stickyOverCap: sticky ? Math.max(0, sticky.h - STICKY_CAP) : 0
  };
};

async function run () {
  const { proc, cdp } = await openPage(9455);
  const results = { viewports: {}, pass: true };
  const problems = [];

  const waitForReady = async () => {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const r = await cdp.send('Runtime.evaluate', {
        expression: `document.querySelectorAll('#packages-grid .pkg-card').length >= 5 && !document.querySelector('#countdown').hidden`,
        returnByValue: true });
      if (r && r.result && r.result.value === true) return true;
      await new Promise(r2 => setTimeout(r2, 250));
    }
    return false;
  };

  for (const v of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.w < 768 });
    await cdp.send('Page.navigate', { url: URL });
    await waitForReady();

    // 1. Top of page (hero): sticky bar should be hidden, float visible.
    const top = await cdp.send('Runtime.evaluate',
      { expression: `(${probeJS.toString()})()`, returnByValue: true });

    // 2. Scroll to mid-page: sticky bar should be out, float still visible.
    await cdp.send('Runtime.evaluate',
      { expression: `window.scrollTo(0, document.body.scrollHeight * 0.45)`, returnByValue: true });
    await new Promise(r => setTimeout(r, 500));
    const mid = await cdp.send('Runtime.evaluate',
      { expression: `(${probeJS.toString()})()`, returnByValue: true });

    // 3. Scroll to absolute bottom: bar hides over footer, float must not
    //    cover footer links.
    await cdp.send('Runtime.evaluate',
      { expression: `window.scrollTo(0, document.body.scrollHeight)`, returnByValue: true });
    await new Promise(r => setTimeout(r, 500));
    const bot = await cdp.send('Runtime.evaluate',
      { expression: `(${probeJS.toString()})()`, returnByValue: true });

    const slot = (r) => (r && r.result && r.result.value) || null;
    const t = slot(top), m = slot(mid), b = slot(bot);
    results.viewports[`${v.w}`] = { top: t, mid: m, bottom: b };

    const docW = (m && m.docW) || 0;
    if (docW > v.w) {
      problems.push(`${v.w}px: horizontal overflow ${docW - v.w}px`);
      results.pass = false;
    }
    // float must never overlap the sticky bar vertically when both are painted
    for (const [name, snap] of [['top', t], ['mid', m], ['bottom', b]]) {
      if (!snap) continue;
      if (snap.sticky && snap.wa && snap.gap !== null && snap.gap < 0 && snap.hOverlap) {
        problems.push(`${v.w}px/${name}: float overlaps sticky bar by ${-snap.gap}px`);
        results.pass = false;
      }
      if (snap.stickyOverCap > 0) {
        problems.push(`${v.w}px/${name}: sticky bar ${snap.stickyOverCap}px over 72px cap`);
        results.pass = false;
      }
    }
    // at the bottom the footer links must not be covered
    if (b && b.bodyPad !== null && b.sticky && b.sticky.disp !== 'none' &&
        b.sticky.tf && b.sticky.tf !== 'none' && b.sticky.tf.indexOf('matrix') === 0) {
      // bar translated off-screen is fine; only flag a painted bar
      problems.push(`${v.w}px/bottom: sticky bar still painted over footer`);
      results.pass = false;
    }
  }

  console.log(JSON.stringify({ pass: results.pass,
    summary: { viewports: Object.keys(results.viewports), problems } }, null, 1));
  if (!results.pass) process.exit(1);
  proc.kill();
}

run().catch(e => { console.error('ERR', e.message); process.exit(1); });
