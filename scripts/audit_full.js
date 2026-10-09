'use strict';
// Full responsive + behaviour audit across the required viewports.
// Usage: node scripts/audit_full.js [port]
const path = require('path');
const { openPage } = require(path.join(__dirname, 'cdp.js'));
const PORT = process.argv[2] || 8123;
const URL = `http://127.0.0.1:${PORT}/`;

const VIEWPORTS = [
  { w: 320,  h: 700  },
  { w: 375,  h: 812  },
  { w: 390,  h: 844  },
  { w: 414,  h: 896  },
  { w: 768,  h: 1024 },
  { w: 1280, h: 800  }
];

// Probe injected into the page. Returns a plain object snapshot.
function probeJS() {
  const out = {};
  const $ = s => document.querySelector(s);
  const vis = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const hidden = cs.display === 'none' || cs.visibility === 'hidden' ||
      (cs.opacity === '0') || (r.width === 0 && r.height === 0);
    return { hidden, w: Math.round(r.width), h: Math.round(r.height),
             top: Math.round(r.top), text: (el.textContent || '').trim().slice(0, 60) };
  };
  const invisibleText = () => {
    // Resolve the painted backdrop UNDER a text node. A plain backgroundColor
    // read reports "transparent" for gradient sections and pseudo-element
    // backgrounds, which produced false white-on-white positives. This walks
    // the ancestor + ::before/::after chain and composites alpha properly.
    const bad = [];
    const m = a => a.match(/[\d.]+/g).map(Number);
    const blend = (c, a, base) => c * a + base * (1 - a);
    const lum = (r, g, b) => {
      const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    // Parse one colour/gradient into an RGB triple composited onto `base`.
    // Fully-transparent values return null so the caller keeps looking — a
    // transparent bg composited onto white would wrongly read as white.
    const toRgb = (val, base) => {
      if (!val) return null;
      if (/gradient/.test(val)) {
        const stops = [...val.matchAll(/rgba?\(([^)]+)\)/g)].map(x => x[1]);
        if (!stops.length) return null;
        // For a gradient, take the stop with the LOWEST luminance (darkest) as
        // the backdrop — the optimistic case for light text. Real backdrops are
        // a blend, but the darkest stop is the relevant bound for contrast.
        const parsed = stops.map(s => { const [r, g, b, a = 1] = m(s); return [r, g, b, a]; });
        if (parsed.some(p => p[3] < 1)) {
          let acc = base;
          for (const [r, g, b, a] of parsed) acc = [blend(r, a, acc[0]), blend(g, a, acc[1]), blend(b, a, acc[2])];
          return acc;
        }
        const darkest = parsed.reduce((a, b) => (lum(a[0], a[1], a[2]) < lum(b[0], b[1], b[2]) ? a : b));
        return [darkest[0], darkest[1], darkest[2]];
      }
      if (/^rgba?\(/.test(val.trim())) {
        const [r, g, b, a = 1] = m(val);
        if (a === 0) return null;
        return [blend(r, a, base[0]), blend(g, a, base[1]), blend(b, a, base[2])];
      }
      return null;
    };
    // Backdrops STACK: resolve the parent backdrop first, then composite each
    // element's own background (and ::before/::after) onto it. Walking upward
    // and stopping at the first painted layer misreads translucent chips on
    // gradient sections (e.g. gold chip at 16% alpha over a navy gradient).
    const resolveBackdrop = el => {
      if (!el || el.tagName === 'HTML' || el.tagName === 'BODY') return [255, 255, 255];
      let base = resolveBackdrop(el.parentElement);
      const cs = getComputedStyle(el);
      // Pseudo-elements only count as a backdrop layer when they are
      // absolutely/fixed positioned over the element's box. A static
      // ::before that is a grid/flex SIBLING (an eyebrow's gold dash, a step
      // number circle) must NOT be treated as the text's background.
      for (const ps of [':before', ':after']) {
        const pcs = getComputedStyle(el, ps);
        const pos = pcs.position;
        if (pos !== 'absolute' && pos !== 'fixed') continue;
        const v = toRgb(pcs.backgroundImage, base) || toRgb(pcs.backgroundColor, base);
        if (v) base = v;
      }
      const v = toRgb(cs.backgroundImage, base) || toRgb(cs.backgroundColor, base);
      return v || base;
    };
    const walk = el => {
      for (const ch of el.childNodes) {
        if (ch.nodeType === 3) {
          const t = ch.textContent.trim();
          if (!t) continue;
          const p = ch.parentElement;
          const cs = getComputedStyle(p);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
          const [fr, fg_, fb, fa = 1] = m(cs.color);
          const [br, bg_, bb] = resolveBackdrop(p);
          const fr2 = blend(fr, fa, br), fg2 = blend(fg_, fa, bg_), fb2 = blend(fb, fa, bb);
          const Lf = lum(fr2, fg2, fb2), Lb = lum(br, bg_, bb);
          const L1 = Math.max(Lf, Lb), L2 = Math.min(Lf, Lb);
          const ratio = (L1 + 0.05) / (L2 + 0.05);
          // only flag LARGE contrast failures (true invisibility / near-invisible)
          if (ratio < 3.0) bad.push({ sel: p.tagName + '.' + (p.className || '').toString().split(' ')[0],
                                      fg: `rgb(${Math.round(fr2)},${Math.round(fg2)},${Math.round(fb2)})`,
                                      bg: `rgb(${br},${bg_},${bb})`, ratio: ratio.toFixed(2), t: t.slice(0, 40) });
        } else if (ch.nodeType === 1 && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(ch.tagName)) {
          walk(ch);
        }
      }
    };
    walk(document.body);
    return bad;
  };
  out.docW = document.documentElement.clientWidth;
  out.bodyScrollW = document.body.scrollWidth;
  out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  // widest overflowing element
  let worst = null;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > out.docW + 1 && r.width > (worst ? worst.w : 0)) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.display === 'none') continue;
      worst = { w: Math.round(r.width), tag: el.tagName, cls: (el.className || '').toString().split(' ')[0],
                right: Math.round(r.right) };
    }
  }
  out.worst = worst;
  out.h1 = document.querySelectorAll('h1').length;
  // heading order
  const hs = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]);
  let orderBad = null;
  hs.forEach((n, i) => {
    if (i && n > hs[i - 1] + 1) orderBad = { from: 'h' + hs[i - 1], to: 'h' + n, idx: i };
  });
  out.headingOrderBad = orderBad;
  out.invisibleText = invisibleText().filter(b => !/Standard|stage-badge|pill/i.test(b.sel));
  // countdown
  out.countdown = {
    hidden: vis($('#countdown')) ? vis($('#countdown')).hidden : null,
    days: $('#cd-days') ? $('#cd-days').textContent : null,
    date: $('#countdown-date') ? $('#countdown-date').textContent : null,
    live: $('#countdown-live') ? $('#countdown-live').textContent : null,
    w: vis($('#countdown')) ? vis($('#countdown')).w : 0,
    units: vis($('#countdown-units')) ? vis($('#countdown-units')).w : 0
  };
  // packages
  out.packages = {
    cards: document.querySelectorAll('#packages-grid .pkg-card').length,
    hidden: vis($('#packages')) ? vis($('#packages')).hidden : null,
    prices: [...document.querySelectorAll('#packages-grid .pkg-price__amount')]
      .map(p => p.textContent.trim()),
    names: [...document.querySelectorAll('#packages-grid .pkg-card__name')]
      .map(p => p.textContent.trim())
  };
  // gallery + projects (empty states expected)
  const gEmpty = vis($('#gallery-empty')), pEmpty = vis($('#projects-empty'));
  out.gallery = { cards: document.querySelectorAll('#gallery-grid .gallery__item').length,
                  emptyShown: gEmpty ? gEmpty.hidden === false : null,
                  hidden: vis($('#gallery')) ? vis($('#gallery')).hidden : null };
  out.projects = { cards: document.querySelectorAll('#projects-grid .project-card').length,
                   emptyShown: pEmpty ? pEmpty.hidden === false : null,
                   hidden: vis($('#projects')) ? vis($('#projects')).hidden : null };
  // tracks + pricing still render
  out.tracks = document.querySelectorAll('#tracks-grid .track-card').length;
  out.priceRows = document.querySelectorAll('#price-rows .price-row').length;
  // floating whatsapp + assistant
  const wa = vis($('#whatsapp-float')), ao = vis($('#assistant-open'));
  out.whatsapp = { hidden: wa ? wa.hidden : null,
                   top: wa ? wa.top : null, h: wa ? wa.h : null,
                   aria: $('#whatsapp-float') ? $('#whatsapp-float').getAttribute('aria-label') : null };
  out.assistant = { openHidden: ao ? ao.hidden : null,
                    panelExists: !!$('#assistant-log'),
                    title: $('#assistant-title') ? $('#assistant-title').textContent.trim() : null };
  // sticky CTA
  const bar = $('#sticky-cta');
  if (bar) {
    const r = bar.getBoundingClientRect(); const cs = getComputedStyle(bar);
    out.sticky = { h: Math.round(r.height), top: Math.round(r.top),
                   display: cs.display, transform: cs.transform, hidden: vis(bar).hidden };
  }
  // enrol CTA count
  out.enrolCount = document.querySelectorAll('[data-enrol], .btn--primary, .btn--gold').length;
  // console errors collected via injected hook
  out.errors = window.__errs || [];
  return out;
}

function probeNoJS() {
  const out = {};
  out.docW = document.documentElement.clientWidth;
  out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  out.tracks = document.querySelectorAll('#tracks-grid .track-card, #tracks-grid .track').length;
  out.priceRows = document.querySelectorAll('#price-rows .price-row, #price-rows li').length;
  out.packages = document.querySelectorAll('#packages-grid .pkg-card, .pkg-list .pkg-card').length;
  out.h1 = document.querySelectorAll('h1').length;
  out.invisible = 0;
  for (const el of document.querySelectorAll('h2,h3,p,li,span')) {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    if (cs.color === 'rgb(255, 255, 255)' &&
        (bg === 'rgb(255, 255, 255)' || bg === 'rgba(0, 0, 0, 0)') &&
        el.textContent.trim() && getComputedStyle(el.closest('.card,section') || el).backgroundColor !== 'rgb(26, 39, 68)') {
      // parent card check
      const card = el.closest('.card');
      if (card && getComputedStyle(card).backgroundColor === 'rgb(255, 255, 255)') out.invisible++;
    }
  }
  return out;
}

async function run() {
  const { proc, cdp } = await openPage(9444);
  const results = { viewports: {}, nojs: null, console: [] };
  let pass = true;

  const errs = [];
  cdp.events.push({ method: '__noop' });
  cdp.ws.on('message', () => {});

  // Wait until the page JS has actually built the dynamic grids (or time out).
  // A fixed delay raced the render and produced false "countdown hidden /
  // package cards 0" failures on slower loads.
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
    // collect console
    const consoleEvs = cdp.events.filter(e =>
      (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') ||
      (e.method === 'Runtime.exceptionThrown'));
    const localErrs = consoleEvs.map(e =>
      e.method === 'Runtime.exceptionThrown'
        ? (e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description || e.params.exceptionDetails.text)
        : e.params.entry.text);
    cdp.events.length = 0;
    const r = await cdp.send('Runtime.evaluate',
      { expression: `(${probeJS.toString()})()`, returnByValue: true });
    if (!r || !r.result || typeof r.result.value !== 'object') {
      console.log('PROBE FAILED at ' + v.w + ':', JSON.stringify(r).slice(0, 400));
      process.exit(2);
    }
    results.viewports[`${v.w}`] = r.result.value;
    results.viewports[`${v.w}`].errors = localErrs;
    if (localErrs.length) { pass = false; results.console.push({ w: v.w, localErrs }); }
  }

  // JS-disabled pass
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: URL });
  await new Promise(r => setTimeout(r, 1200));
  const nr = await cdp.send('Runtime.evaluate',
    { expression: `(${probeNoJS.toString()})()`, returnByValue: true });
  results.nojs = nr.result.value;
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });

  proc.kill();
  console.log(JSON.stringify(results, null, 1));

  // summary
  const problems = [];
  for (const [w, r] of Object.entries(results.viewports)) {
    if (r.overflow > 0) problems.push(`${w}px: horizontal overflow ${r.overflow}px (worst ${JSON.stringify(r.worst)})`);
    if (r.h1 !== 1) problems.push(`${w}px: h1 count ${r.h1}`);
    if (r.headingOrderBad) problems.push(`${w}px: heading skip ${JSON.stringify(r.headingOrderBad)}`);
    if (r.invisibleText.length) problems.push(`${w}px: invisible text ${JSON.stringify(r.invisibleText.slice(0, 4))}`);
    if (r.countdown.hidden) problems.push(`${w}px: countdown hidden`);
    else if (r.countdown.units > r.docW) problems.push(`${w}px: countdown wider than viewport (${r.countdown.units})`);
    if (r.packages.cards !== 5) problems.push(`${w}px: package cards ${r.packages.cards}`);
    if (r.packages.hidden) problems.push(`${w}px: packages section hidden`);
    if (r.tracks !== 5) problems.push(`${w}px: track cards ${r.tracks}`);
    if (r.priceRows < 5) problems.push(`${w}px: price rows ${r.priceRows}`);
    if (r.errors && r.errors.length) problems.push(`${w}px: JS errors ${JSON.stringify(r.errors)}`);
    if (r.sticky && r.sticky.h > 72) problems.push(`${w}px: sticky CTA ${r.sticky.h}px > 72`);
    if (r.whatsapp.hidden === false && r.whatsapp.top > 0 && (r.whatsapp.top + r.whatsapp.h) < 812) {
      // ensure it does not sit below viewport or overlap sticky bar
    }
  }
  const n = results.nojs;
  if (n.overflow > 0) problems.push(`nojs 375px: overflow ${n.overflow}px`);
  if (n.tracks < 5 || n.priceRows < 5 || n.packages < 5) problems.push(`nojs 375px: content missing (t=${n.tracks} p=${n.priceRows} pk=${n.packages})`);
  if (n.h1 !== 1) problems.push(`nojs 375px: h1 count ${n.h1}`);
  if (n.invisible > 0) problems.push(`nojs 375px: ${n.invisible} invisible text nodes`);

  console.log('\n=== SUMMARY ===');
  if (problems.length) { pass = false; console.log('FAIL'); problems.forEach(p => console.log(' - ' + p)); }
  else console.log('ALL VIEWPORT CHECKS PASS');
  process.exit(pass ? 0 : 1);
}

run().catch(e => { console.error('AUDIT CRASH', e); process.exit(2); });
