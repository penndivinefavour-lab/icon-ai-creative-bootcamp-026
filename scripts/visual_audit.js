// Layout + visual audit via Chrome DevTools Protocol (no puppeteer dependency).
// Connects to headless Chromium, loads the page, and reports real geometry:
// horizontal overflow, sticky-CTA state, heading order, contrast-free text,
// and captures screenshots.
//
// Usage: node scripts/visual_audit.js [url] [width] [height] [shot.png]
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
// Node 22+ ships a global WebSocket; fall back to the ws package if absent.
const WebSocket = typeof globalThis.WebSocket === 'function'
  ? globalThis.WebSocket
  : require('ws');

const CHROME = process.env.CHROME_BIN || require('./cdp').CHROME;
const PORT = 9333;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForDebugger() {
  for (let i = 0; i < 60; i++) {
    try {
      const body = await new Promise((res, rej) => {
        http.get({ host: '127.0.0.1', port: PORT, path: '/json/version' }, (r) => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
        }).on('error', rej);
      });
      const j = JSON.parse(body);
      return j.webSocketDebuggerUrl;
    } catch (e) { await sleep(500); }
  }
  throw new Error('Chromium debugger never came up');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = {}; this.events = [];
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8'));
      if (m.id && this.pending[m.id]) { this.pending[m.id](m); delete this.pending[m.id]; }
      else if (m.method) this.events.push(m);
    });
  }
  send(method, params) {
    return new Promise((res) => {
      const id = ++this.id;
      this.pending[id] = res;
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
}

async function main() {
  const url = process.argv[2] || 'http://127.0.0.1:8080/';
  const width = parseInt(process.argv[3] || '375', 10);
  const height = parseInt(process.argv[4] || '760', 10);
  const shot = process.argv[5] || null;

  const child = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
    `--window-size=${width},${height}`, 'about:blank'
  ], { stdio: 'ignore' });

  const wsUrl = await waitForDebugger();
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => {
    ws.addEventListener('open', r);
    ws.addEventListener('error', (e) => j(new Error('ws error: ' + (e.message || 'unknown'))));
  });
  const cdp = new CDP(ws);
  await cdp.send('Target.createTarget', { url: 'about:blank' });

  // fetch the created target's session
  const targets = await new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path: '/json/list' }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = targets.find(t => t.type === 'page');
  await cdp.send('Target.attachToTarget', { targetId: page.id, flatten: true });
  const sessionId = cdp.events.length ? null : null;
  // use the sessionId from the attach response event
  const attach = cdp.events.find(e => e.method === 'Target.attachedToTarget');
  const sid = attach.params.sessionId;

  const send = (method, params) => cdp.send(method, params);

  await cdp.send('Runtime.enable', {}, );
  await new Promise(r => setTimeout(r, 100));

  // Navigate via the page session using sendCommand with sessionId
  const cmd = (method, params) => new Promise((res, rej) => {
    const id = ++cdp.id;
    cdp.pending[id] = (msg) => { msg.error ? rej(new Error(msg.error.message)) : res(msg.result); };
    cdp.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId: sid }));
  });

  await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cmd('Page.navigate', { url });
  await sleep(2200); // allow fonts + JS reveal to settle

  const evalJs = async (expr) => {
    const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('JS error: ' + JSON.stringify(r.exceptionDetails.exception));
    return r.result.value;
  };

  const metrics = await evalJs(`(() => {
    const d = document.documentElement;
    const out = { viewport: window.innerWidth + 'x' + window.innerHeight,
      docScrollW: d.scrollWidth, clientW: d.clientWidth,
      bodyScrollW: document.body.scrollWidth,
      hOverflow: d.scrollWidth > d.clientWidth,
      overflowEls: [], h1: 0, headings: [], stickyVisible: false,
      sections: 0, fontsLoaded: document.fonts ? document.fonts.status : 'n/a',
      consoleErrors: window.__errs || [] };
    // find elements overflowing horizontally
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') return;
        out.overflowEls.push(el.tagName + '.' + String(el.className).split(' ')[0] +
          ' right=' + Math.round(r.right) + ' left=' + Math.round(r.left) +
          ' w=' + Math.round(r.width));
      }
    });
    out.h1 = document.querySelectorAll('h1').length;
    document.querySelectorAll('h1,h2,h3,h4').forEach(h => out.headings.push(h.tagName));
    out.sections = document.querySelectorAll('section').length;
    const st = document.getElementById('sticky-cta');
    if (st) {
      const cs = getComputedStyle(st);
      out.stickyVisible = cs.display !== 'none' && st.classList.contains('is-visible');
      out.stickyHeight = Math.round(st.getBoundingClientRect().height);
    }
    return out;
  })()`);

  console.log('=== ' + width + 'x' + height + ' @ ' + url + ' ===');
  console.log(JSON.stringify(metrics, null, 2));

  // sticky CTA behaviour: scrolled past hero
  await evalJs('window.scrollTo(0, 3000)');
  await sleep(700);
  const after = await evalJs(`(() => {
    const st = document.getElementById('sticky-cta');
    const cs = getComputedStyle(st);
    return { scrolled: window.scrollY, stickyVisible: st.classList.contains('is-visible'),
      stickyDisplay: cs.display, stickyH: Math.round(st.getBoundingClientRect().height) };
  })()`);
  console.log('after scroll past hero:', JSON.stringify(after));

  // bottom of page
  await evalJs('window.scrollTo(0, document.body.scrollHeight)');
  await sleep(700);
  const atBottom = await evalJs(`(() => {
    const st = document.getElementById('sticky-cta');
    const f = document.querySelector('.site-footer');
    return { scrollY: Math.round(window.scrollY),
      stickyVisible: st.classList.contains('is-visible'),
      footerBottom: Math.round(f.getBoundingClientRect().bottom),
      vh: window.innerHeight };
  })()`);
  console.log('at page bottom:', JSON.stringify(atBottom));

  if (shot) {
    const r = await cmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(shot, Buffer.from(r.data, 'base64'));
    console.log('screenshot saved: ' + shot + ' (' + r.data.length + ' b64 chars)');
  }

  // console errors collected
  const errs = await evalJs('window.__errs ? window.__errs.length : 0');
  console.log('console errors during load: ' + errs);

  ws.close();
  child.kill();
  process.exit(0);
}

main().catch(e => { console.error('AUDIT FAILED:', e.message); process.exit(1); });
