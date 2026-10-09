'use strict';
/* Deep visual audit: captures real screenshots at every required viewport and
 * reports per-section geometry so layout defects (overlap, bad stacking,
 * clipped cards, offset elements) can be seen rather than guessed.
 *
 * Usage: node scripts/audit_screens.js [port] [outdir]
 * Writes <outdir>/shot-<w>x<h>-<slot>.png and prints a JSON report.
 */
const path = require('path');
const fs = require('fs');
const { openPage } = require(path.join(__dirname, 'cdp.js'));

const PORT = parseInt(process.argv[2] || '8080', 10);
const URL = `http://127.0.0.1:${PORT}/`;
const OUT = process.argv[3] || path.join(process.env.LOCALAPPDATA || __dirname, 'Temp', 'icb26-shots');

const VIEWPORTS = [
  { w: 320, h: 700, dsf: 2 },
  { w: 375, h: 812, dsf: 2 },
  { w: 390, h: 844, dsf: 2 },
  { w: 414, h: 896, dsf: 2 },
  { w: 768, h: 1024, dsf: 1 },
  { w: 1280, h: 800, dsf: 1 }
];

const SLOTS = [
  { name: 'top', y: 0 },
  { name: 'hero-bottom', y: null },       // bottom of hero
  { name: 'packages', y: null },
  { name: 'pricing', y: null },
  { name: 'community', y: null },
  { name: 'faq', y: null },
  { name: 'footer', y: null }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function probeSections() {
  const $ = s => document.querySelector(s);
  const list = ['top', 'announcement', 'countdown', 'create', 'tracks', 'packages',
    'crash-course', 'pricing', 'who', 'benefits', 'format', 'ten-day', 'curriculum',
    'gallery', 'projects', 'enrol-mid', 'community', 'challenge', 'affiliate',
    'facilitators', 'certificate', 'payment', 'faq', 'enrol', 'assistant'];
  const out = {};
  for (const id of list) {
    const n = document.getElementById(id);
    if (!n) { out[id] = null; continue; }
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    out[id] = {
      top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY),
      h: Math.round(r.height), w: Math.round(r.width),
      x: Math.round(r.left), y: Math.round(r.top),
      disp: cs.display, hidden: cs.display === 'none' || (r.width === 0 && r.height === 0)
    };
  }
  // overlap detector: any two visible sections whose vertical extents invert
  const order = [];
  for (const id of list) if (out[id] && !out[id].hidden) order.push(id);
  const inverted = [];
  for (let i = 1; i < order.length; i++) {
    if (out[order[i]].top < out[order[i - 1]].bottom - 1 &&
        out[order[i]].top >= out[order[i - 1]].top) {
      // nested or genuinely inverted
      inverted.push([order[i - 1], order[i], out[order[i]].top - out[order[i - 1]].bottom]);
    }
  }
  return {
    sections: out, order,
    docH: Math.round(document.documentElement.scrollHeight),
    docW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    inverted
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { proc, cdp } = await openPage(9461);
  const report = {};

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
      { width: v.w, height: v.h, deviceScaleFactor: v.dsf, mobile: v.w < 768 });
    await cdp.send('Page.navigate', { url: URL });
    await waitForReady();
    await sleep(700);

    const pr = await cdp.send('Runtime.evaluate',
      { expression: `(${probeSections.toString()})()`, returnByValue: true });
    const info = pr.result.value;
    report[v.w] = { info, shots: [] };

    for (const slot of SLOTS) {
      let y = slot.y;
      if (y === null) {
        const key = { 'hero-bottom': 'top', packages: 'packages', pricing: 'pricing',
          community: 'community', faq: 'faq', footer: 'enrol' }[slot.name];
        const s = info.sections[key];
        if (!s) continue;
        y = key === 'top' ? Math.max(0, s.bottom - Math.round(v.h * 0.35)) : Math.max(0, s.top - 8);
      }
      await cdp.send('Runtime.evaluate',
        { expression: `window.scrollTo(0, ${Math.min(y, info.docH)})`, returnByValue: true });
      await sleep(450);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const file = path.join(OUT, `shot-${v.w}x${v.h}-${slot.name}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      report[v.w].shots.push(path.basename(file));
    }
    console.log(`viewport ${v.w}x${v.h} done: overflow=${info.overflow} inverted=${JSON.stringify(info.inverted)}`);
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log('screenshots + report written to ' + OUT);
  proc.kill();
  process.exit(0);
})().catch(e => { console.error('AUDIT_SCREENS FAIL', e); process.exit(1); });
