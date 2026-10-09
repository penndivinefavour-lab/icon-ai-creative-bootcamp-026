'use strict';
/* Invisible-text audit: finds text whose computed colour clashes with its
 * painted background across every card type, plus new-component behaviour. */
const { spawn } = require('child_process');
const http = require('http');
const { resolveWS, resolveChrome } = require('./cdp.js');
const WebSocket = require(resolveWS());

const CHROME = resolveChrome();
const PORT = 9336;
const URL_ = 'http://localhost:8080/';
const VIEWPORTS = [{ w: 320, h: 700 }, { w: 375, h: 760 }, { w: 414, h: 860 }, { w: 1280, h: 900 }];

const sleep = ms => new Promise(r => setTimeout(r, ms));
let idc = 0;
const pending = new Map();
let ws;

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

/* contrast of two [r,g,b] triples, WCAG 2.x */
function lum(c) {
  const f = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--disable-gpu', `--remote-debugging-port=${PORT}`, '--window-size=1280,900', 'about:blank'
  ], { stdio: 'ignore' });

  const verUrl = await waitForChrome();
  ws = new WebSocket(verUrl);
  await new Promise(r => ws.on('open', r));
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
    }
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const att = await send('Target.attachToTarget', { targetId, flatten: true });
  const sid = att.sessionId;
  await send('Runtime.enable', {}, sid);
  await send('Page.enable', {}, sid);

  /* self-contained contrast helpers injected into the page (no outer scope) */
  const LUM_SRC = `
    const lum = c => c.map(v => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce((a, v, i) => a + [0.2126, 0.7152, 0.0722][i] * v, 0);
    const ratio = (a, b) => { const la = lum(a), lb = lum(b);
      const hi = Math.max(la, lb), lo = Math.min(la, lb);
      return (hi + 0.05) / (lo + 0.05); };
  `;

  for (const v of VIEWPORTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.w < 768
    }, sid);
    await send('Page.navigate', { url: URL_ }, sid);
    await sleep(2200);

    const ev = await send('Runtime.evaluate', {
      returnByValue: true, awaitPromise: true,
      expression: `(() => {
        ${LUM_SRC}
        const out = [];
        /* computed colours arrive as rgb()/rgba() or #hex — handle both */
        const parse = s => {
          let m = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
          if (m) return [+m[1], +m[2], +m[3]];
          m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
          if (!m) return null;
          const h = m[1].length === 3
            ? m[1].split('').map(c => c + c).join('')
            : m[1];
          return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
        };
        /* walk every text-bearing element and compare colour vs its own
         * background (inherited up to an opaque ancestor) */
        const els = document.querySelectorAll(
          'p, li, h1, h2, h3, h4, span, a, summary, dd, td, blockquote, strong, em');
        els.forEach(n => {
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
          const txt = (n.textContent || '').trim();
          if (!txt || txt.length < 2) return;
          if (parseFloat(cs.fontSize) < 8) return;
          const fg = parse(cs.color);
          /* walk up for the first opaque background */
          let bg = null, cur = n, depth = 0;
          while (cur && depth < 12) {
            const b = getComputedStyle(cur).backgroundColor;
            if (b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') {
              bg = parse(b); break;
            }
            cur = cur.parentElement; depth++;
          }
          if (!bg) bg = [255, 255, 255];
          const r = ratio(fg, bg);
          if (r < 3.0) {
            out.push({
              sel: (n.tagName + '.' + String(n.className).split(' ')[0]).slice(0, 30),
              txt: txt.slice(0, 34), fg: cs.color,
              bg: '#' + bg.map(x => x.toString(16).padStart(2, '0')).join(''),
              r: Math.round(r * 10) / 10
            });
          }
        });
        return out;
      })()`
    }, sid);
    const bad = ev.result.value || [];
    console.log(`\n--- ${v.w}px : ${bad.length} low-contrast text nodes ---`);
    bad.slice(0, 12).forEach(b => console.log(`  ${b.sel} r=${b.r} fg=${b.fg} bg=${b.bg}  "${b.txt}"`));
  }

  /* ---- new-component behaviour at 375px ---- */
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 760, deviceScaleFactor: 1, mobile: true }, sid);
  await send('Page.navigate', { url: URL_ }, sid);
  await sleep(2000);

  const beh = await send('Runtime.evaluate', {
    returnByValue: true, awaitPromise: true,
    expression: `(() => {
      const q = s => document.querySelector(s);
      const box = s => { const n = q(s); if (!n) return null;
        const r = n.getBoundingClientRect(); const cs = getComputedStyle(n);
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
                 w: Math.round(r.width), disp: cs.display, trans: cs.transform }; };
      /* assistant: open, ask a known + an unknown question */
      const before = q('#assistant') ? getComputedStyle(q('#assistant')).display : 'missing';
      q('#assistant-open') && q('#assistant-open').click();
      const openDisp = q('#assistant') ? getComputedStyle(q('#assistant')).display : 'missing';
      const input = q('#assistant-input');
      const log = () => Array.from(document.querySelectorAll('#assistant-log .msg'))
        .map(m => m.textContent.slice(0, 140));
      const ask = txt => {
        input.value = txt;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        q('#assistant-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      };
      ask('What are the five tracks and their prices?');
      const a1 = log();
      ask('When does the bootcamp start?');
      const a2 = log();
      ask('Give me the Selar checkout link for Full ICON');
      const a3 = log();
      ask('Who are the facilitators?');
      const a4 = log();
      /* countdown live values */
      const cd = ['cd-days','cd-hours','cd-mins','cd-secs'].map(id => q('#' + id) ? q('#' + id).textContent : null);
      /* float rail vs sticky bar geometry */
      const wa = box('#whatsapp-float'), st = box('#sticky-cta'), as = box('#assistant-open');
      const env = getComputedStyle(document.documentElement);
      return {
        assistantBefore: before, assistantOpen: openDisp,
        a1: a1[a1.length - 1], a2: a2[a2.length - 1],
        a3: a3[a3.length - 1], a4: a4[a4.length - 1],
        countdown: cd, wa, st, as,
        overlap: (wa && st) ? (wa.bottom > st.top ? 'YES wa.bottom=' + wa.bottom + ' > st.top=' + st.top : 'none') : 'n/a'
      };
    })()`
  }, sid);
  console.log('\n=== COMPONENT BEHAVIOUR (375px) ===');
  console.log(JSON.stringify(beh.result.value, null, 2));

  ws.close(); chrome.kill();
  process.exit(0);
}
main().catch(e => { console.error('AUDIT FAILED:', e); process.exit(1); });
