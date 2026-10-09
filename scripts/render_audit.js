'use strict';
/* Full-page render audit: loads the live site in headless Chromium via CDP and
 * verifies the new components render, the console is clean, and there is no
 * horizontal overflow at each target viewport. */
const { spawn } = require('child_process');
const http = require('http');
const { resolveWS, resolveChrome } = require('./cdp.js');
const WebSocket = require(resolveWS());

const CHROME = resolveChrome();
const PORT = 9334;
const URL_ = 'http://localhost:8080/';
const VIEWPORTS = [
  { w: 320, h: 700 }, { w: 375, h: 760 }, { w: 390, h: 800 },
  { w: 414, h: 860 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
let idc = 0;
const pending = new Map();
let ws;
const consoleMsgs = [];

/* Send to the browser endpoint, or to a session when sessionId is given. */
function send(method, params, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++idc;
    pending.set(id, { resolve, reject });
    const msg = { id, method, params: params || {} };
    if (sessionId) msg.sessionId = sessionId;
    ws.send(JSON.stringify(msg));
  });
}

async function waitForChrome() {
  for (let i = 0; i < 80; i++) {
    try {
      const body = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${PORT}/json/version`, r => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
        });
        req.on('error', reject); req.setTimeout(400, () => req.destroy(new Error('timeout')));
      });
      return JSON.parse(body).webSocketDebuggerUrl;
    } catch (e) { await sleep(400); }
  }
  throw new Error('Chrome did not start');
}

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--disable-gpu', `--remote-debugging-port=${PORT}`,
    '--window-size=1280,900', 'about:blank'
  ], { stdio: 'ignore' });

  const verUrl = await waitForChrome();
  ws = new WebSocket(verUrl);
  await new Promise(r => ws.on('open', r));
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
    } else if (m.method === 'Runtime.consoleAPICalled' &&
               ['error', 'warning'].includes(m.params.type)) {
      consoleMsgs.push(m.params.type + ': ' +
        m.params.args.map(a => a.value || a.description || '').join(' '));
    } else if (m.method === 'Runtime.exceptionThrown') {
      consoleMsgs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description ||
                                        m.params.exceptionDetails.text));
    }
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const att = await send('Target.attachToTarget', { targetId, flatten: true });
  const sid = att.sessionId;

  await send('Runtime.enable', {}, sid);
  await send('Page.enable', {}, sid);

  const results = [];
  for (const v of VIEWPORTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.w < 768
    }, sid);
    await send('Page.navigate', { url: URL_ }, sid);
    await sleep(2200);
    const ev = await send('Runtime.evaluate', {
      returnByValue: true, awaitPromise: true,
      expression: `(() => {
        const q = s => document.querySelector(s);
        const all = s => document.querySelectorAll(s).length;
        const over = [];
        document.querySelectorAll('*').forEach(n => {
          const r = n.getBoundingClientRect();
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          if (r.width && r.right > window.innerWidth + 0.5) {
            over.push(n.tagName + '.' + String(n.className).slice(0, 26) + ' right=' + Math.round(r.right));
          }
        });
        const probe = sel => { const n = q(sel); if (!n) return null;
          const r = n.getBoundingClientRect();
          return { vis: r.width > 0 && r.height > 0, w: Math.round(r.width), h: Math.round(r.height) }; };
        return {
          vw: window.innerWidth,
          scrollW: document.documentElement.scrollWidth,
          overflow: over.length, worst: over.slice(0, 4),
          h1: all('h1'), sections: all('section'),
          tracks: all('.track-card'), packages: all('.pkg-card'), priceRows: all('.price-row'),
          pkgPrices: Array.from(document.querySelectorAll('.pkg-price__amount')).map(n => n.textContent),
          galleryEmptyHidden: q('#gallery-empty') ? q('#gallery-empty').hidden : 'n/a',
          projectsEmptyHidden: q('#projects-empty') ? q('#projects-empty').hidden : 'n/a',
          countdown: probe('#countdown'),
          cdDays: q('#cd-days') ? q('#cd-days').textContent : null,
          cdLabel: q('#countdown-label') ? q('#countdown-label').textContent : null,
          cdDate: q('#countdown-date') ? q('#countdown-date').textContent : null,
          waFloat: probe('#whatsapp-float'),
          asstBtn: probe('#assistant-open'),
          sticky: probe('#sticky-cta'),
          heroPrice: q('#hero-price') ? q('#hero-price').textContent : null,
          pkgCtas: all('.pkg-card .btn')
        };
      })()`
    }, sid);
    results.push({ vw: v.w, d: ev.result.value });
  }

  console.log('=== RENDER AUDIT ===');
  for (const r of results) {
    const d = r.d;
    console.log(`\n--- ${r.vw}px ---`);
    console.log('  scrollW:', d.scrollW, '| overflow:', d.overflow, d.worst.slice(0, 3));
    console.log('  h1:', d.h1, '| sections:', d.sections, '| tracks:', d.tracks,
                '| pkgs:', d.packages, '| pkgCtas:', d.pkgCtas, '| priceRows:', d.priceRows);
    console.log('  heroPrice:', d.heroPrice, '| pkgPrices:', d.pkgPrices.join(' / '));
    console.log('  countdown:', JSON.stringify(d.countdown), 'days:', d.cdDays,
                '| label:', d.cdLabel, '| date:', d.cdDate);
    console.log('  waFloat:', JSON.stringify(d.waFloat), '| asstBtn:', JSON.stringify(d.asstBtn),
                '| sticky:', JSON.stringify(d.sticky));
    console.log('  galleryEmptyHidden:', d.galleryEmptyHidden, '| projectsEmptyHidden:', d.projectsEmptyHidden);
  }
  console.log('\n=== CONSOLE ISSUES: ' + consoleMsgs.length + ' ===');
  consoleMsgs.slice(0, 8).forEach(m => console.log(' ', m));
  ws.close(); chrome.kill();
  process.exit(0);
}
main().catch(e => { console.error('AUDIT FAILED:', e); process.exit(1); });
