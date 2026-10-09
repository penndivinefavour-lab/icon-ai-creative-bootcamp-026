'use strict';
/* Deep layout audit — finds the classes of defect the Founder reported:
 * elements not standing where they should, bad stacking, clipped cards,
 * overlapping text, misaligned grid rows, and floating/sticky UI covering
 * content. Works from live rendered geometry, not source.
 *
 * Usage: node scripts/audit_layout.js [port]
 */
const path = require('path');
const { openPage } = require(path.join(__dirname, 'cdp.js'));

const PORT = parseInt(process.argv[2] || '8080', 10);
const URL = `http://127.0.0.1:${PORT}/`;
const VIEWPORTS = [
  { w: 320, h: 700 }, { w: 375, h: 812 }, { w: 390, h: 844 },
  { w: 414, h: 896 }, { w: 768, h: 1024 }, { w: 1280, h: 800 }
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROBE = function () {
  const VW = document.documentElement.clientWidth;
  const problems = [];
  const note = (kind, sel, detail) => problems.push({ kind, sel, detail });

  // 1. Text nodes that render OUTSIDE their parent's content box (clipped text)
  const seen = new Set();
  const boxes = [];
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    boxes.push({ el, r, cs });

    // clip check: scrollable overflow boxes with text spilling visibly
    if (cs.overflow !== 'visible' && el.textContent && el.textContent.trim()) {
      const pr = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
      if (pr && (r.right > pr.right + 1 || r.left < pr.left - 1)) {
        // child wider than its clipped parent
        const kids = el.children;
        for (const k of kids) {
          const kr = k.getBoundingClientRect();
          if (kr.right > r.right + 1 || kr.left < r.left - 1) {
            note('clipped', el.tagName + '.' + String(el.className).split(' ')[0],
              'child escapes clipped parent box');
          }
        }
      }
    }
  });

  // 2. Text-bearing leaf elements whose box crosses the viewport right edge
  document.querySelectorAll('h1,h2,h3,h4,p,li,span,a,summary,figcaption,td,th,blockquote').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (!el.textContent || !el.textContent.trim()) return;
    if (r.right > VW + 1) note('past-viewport-edge', el.tagName + '.' + String(el.className).split(' ')[0],
      'right=' + Math.round(r.right) + ' vw=' + VW);
  });

  // 3. Overlapping TEXT boxes (distinct blocks that paint over each other)
  const txt = boxes.filter(b => b.el.textContent && b.el.textContent.trim() &&
    b.el.children.length <= 3 && b.r.height > 0 && b.r.width > 0);
  for (let i = 0; i < txt.length; i++) {
    for (let j = i + 1; j < txt.length; j++) {
      const a = txt[i], b = txt[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // skip stacked siblings in normal flow (their vertical gap is >= 0)
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 4 && oy > 4) {
        // genuine 2D overlap of two unrelated text boxes
        const floating = a.cs.position === 'absolute' || a.cs.position === 'fixed' ||
          b.cs.position === 'absolute' || b.cs.position === 'fixed';
        note('text-overlap', a.el.tagName + '/' + b.el.tagName,
          (floating ? 'float/fixed ' : '') + 'overlap ' + Math.round(ox) + 'x' + Math.round(oy) +
          ' "' + a.el.textContent.trim().slice(0, 28) + '" vs "' + b.el.textContent.trim().slice(0, 28) + '"');
      }
    }
  }

  // 4. Grid rows: cards in the same visual row must share a top edge and height
  document.querySelectorAll('.grid, .gallery, .projects, .neutral-grid, .faq-list, .price-rows').forEach(grid => {
    const cs = getComputedStyle(grid);
    if (cs.display === 'none') return;
    const cards = [...grid.children].filter(c => {
      const ccs = getComputedStyle(c);
      return ccs.display !== 'none' && c.getBoundingClientRect().height > 0;
    });
    if (cards.length < 2) return;
    // group by top edge (tolerance 6px)
    const rows = [];
    cards.forEach(c => {
      const t = Math.round(c.getBoundingClientRect().top);
      const row = rows.find(r => Math.abs(r.top - t) <= 6);
      if (row) row.cards.push(c); else rows.push({ top: t, cards: [c] });
    });
    rows.forEach(row => {
      if (row.cards.length < 2) return;
      const tops = row.cards.map(c => Math.round(c.getBoundingClientRect().top));
      const hs = row.cards.map(c => Math.round(c.getBoundingClientRect().height));
      const tSpread = Math.max(...tops) - Math.min(...tops);
      const hSpread = Math.max(...hs) - Math.min(...hs);
      if (tSpread > 6) note('row-misaligned', grid.className,
        row.cards.length + ' cards, top spread ' + tSpread + 'px');
      if (hSpread > 24) note('row-uneven', grid.className,
        row.cards.length + ' cards, height spread ' + hSpread + 'px (ok if intentional masonry)');
    });
  });

  // 5. Fixed/sticky elements vs in-flow content at the same location
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // what in-flow content sits under it right now?
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const under = document.elementsFromPoint(cx, cy).filter(n =>
      n !== el && !el.contains(n) && !n.contains(el) &&
      getComputedStyle(n).position !== 'fixed');
    const coverable = under.find(n => {
      const ncs = getComputedStyle(n);
      return ncs.display !== 'none' && n.textContent && n.textContent.trim().length > 2;
    });
    if (coverable) note('fixed-covers-text', el.tagName + '.' + String(el.className).split(' ')[0],
      'covers "' + coverable.textContent.trim().slice(0, 40) + '"');
  });

  // 6. Negative or zero gaps between consecutive sections (bad stacking)
  const secs = [...document.querySelectorAll('main > section, footer, header')]
    .map(s => ({ s, r: s.getBoundingClientRect() }))
    .filter(x => getComputedStyle(x.s).display !== 'none' && x.r.height > 0);
  for (let i = 1; i < secs.length; i++) {
    const gap = Math.round(secs[i].r.top - secs[i - 1].r.bottom);
    if (gap < -1) note('section-overlap', secs[i - 1].s.id || secs[i - 1].s.tagName,
      'overlaps ' + (secs[i].s.id || secs[i].s.tagName) + ' by ' + (-gap) + 'px');
  }

  return { vw: VW, problems };
};

(async () => {
  const { proc, cdp } = await openPage(9462);
  const all = {};
  let total = 0;
  const waitForReady = async () => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const r = await cdp.send('Runtime.evaluate', {
        expression: `document.querySelectorAll('#packages-grid .pkg-card').length >= 5 && !document.querySelector('#countdown').hidden`,
        returnByValue: true });
      if (r && r.result && r.result.value === true) return true;
      await sleep(200);
    }
    return false;
  };

  for (const v of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.w < 768 });
    await cdp.send('Page.navigate', { url: URL });
    await waitForReady();
    await sleep(400);
    // sample three scroll positions because fixed/sticky coverage is positional
    const collected = [];
    for (const frac of [0, 0.25, 0.55, 0.8, 1]) {
      await cdp.send('Runtime.evaluate', {
        expression: `window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) * ${frac}))`,
        returnByValue: true });
      await sleep(350);
      const r = await cdp.send('Runtime.evaluate',
        { expression: `(${PROBE.toString()})()`, returnByValue: true });
      const res = r.result.value;
      res.problems.forEach(p => {
        const key = p.kind + '|' + p.sel + '|' + p.detail;
        if (!collected.some(c => c.key === key)) collected.push({ key, ...p });
      });
    }
    all[v.w] = collected;
    total += collected.length;
    console.log(`${v.w}px: ${collected.length} layout findings`);
  }
  console.log(JSON.stringify(all, null, 1));
  console.log('TOTAL FINDINGS: ' + total);
  proc.kill();
  process.exit(total === 0 ? 0 : 1);
})().catch(e => { console.error('AUDIT_LAYOUT FAIL', e); process.exit(2); });
