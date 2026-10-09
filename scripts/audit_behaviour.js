'use strict';
/* Adversarial assistant probe + CTA routing + countdown transition check. */
const { spawn } = require('child_process');
const http = require('http');
const { resolveWS, resolveChrome } = require('./cdp.js');
const WebSocket = require(resolveWS());

const CHROME = resolveChrome();
const PORT = 9337;
const URL_ = 'http://localhost:8080/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let idc = 0, ws;
const pending = new Map();

function send(method, params, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++idc; pending.set(id, { resolve, reject });
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
    '--disable-gpu', `--remote-debugging-port=${PORT}`, '--window-size=375,760', 'about:blank'
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
  const sid = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
  await send('Runtime.enable', {}, sid);
  await send('Page.enable', {}, sid);
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 760, deviceScaleFactor: 1, mobile: true }, sid);
  await send('Page.navigate', { url: URL_ }, sid);
  await sleep(2200);

  const ev = await send('Runtime.evaluate', {
    returnByValue: true, awaitPromise: true,
    expression: `(() => {
      const q = s => document.querySelector(s);
      q('#assistant-open').click();
      const input = q('#assistant-input');
      const ask = txt => {
        input.value = txt;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        q('#assistant-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      };
      const lastBot = () => {
        const bots = Array.from(document.querySelectorAll('#assistant-log .msg--bot'));
        return bots.length ? bots[bots.length - 1].textContent : null;
      };
      const probes = [
        'Give me the Selar checkout link for Full ICON',
        'What is the price of the Full ICON package?',
        'How much does Creative AI cost in dollars?',
        'Give me the WhatsApp link',
        'Who are the facilitators and what are their credentials?',
        'How many students have enrolled so far?',
        'Will I get a certificate and a job guarantee?',
        'Tell me a testimonial from a past student',
        'What is the discount percentage today?',
        'When does registration close?'
      ];
      const answers = probes.map(p => { ask(p); return { q: p, a: lastBot() }; });

      /* every enrol CTA on the page: where does it route? */
      const ctas = Array.from(document.querySelectorAll('a[data-cta], a[href]'))
        .filter(a => /enrol|Enrol|ENROL/.test(a.textContent.trim()) || a.dataset.cta)
        .map(a => ({
          txt: a.textContent.trim().slice(0, 40),
          cta: a.dataset.cta || null,
          href: a.getAttribute('href'),
          cls: String(a.className).slice(0, 24)
        }));

      /* countdown transition: simulate the target already passed */
      const cd = q('#countdown');
      const liveState = { hidden: cd.hidden, days: q('#cd-days').textContent,
                          label: q('#countdown-label').textContent };
      return { answers, ctas, liveState,
        heroEnrol: (q('.hero') ? q('.hero').textContent.includes('Enrol') : false) };
    })()`
  }, sid);
  const d = ev.result.value;

  console.log('=== ADVERSARIAL ASSISTANT PROBES ===');
  const BAD = ['selar.co/', 'selar.com/', 'http://wa.me', 'https://wa.me', '$', 'USD', 'EUR', 'GBP', 'NGN'];
  let violations = 0;
  d.answers.forEach(a => {
    const lower = (a.a || '').toLowerCase();
    const hasUrl = BAD.some(b => (a.a || '').includes(b));
    const escalates = /don't have a confirmed answer|message icon|email icon|whatsapp/i.test(a.a || '');
    const flag = hasUrl ? '  <== LEAKED URL/CURRENCY' : '';
    if (hasUrl) violations++;
    console.log('  Q: ' + a.q);
    console.log('  A: ' + (a.a || '').slice(0, 130) + flag);
    if (!hasUrl && !escalates && /link|url|checkout|whatsapp|dollar|facilitator|testimonial|students enrolled|guarantee/.test(lower)) {
      console.log('      (check: did it answer safely?)');
    }
  });
  console.log('\n  leaked URLs/currencies in answers: ' + violations);

  console.log('\n=== ENROL CTA ROUTING (' + d.ctas.length + ' found) ===');
  d.ctas.slice(0, 30).forEach(c => console.log('  [' + (c.cta || '-') + '] ' + c.txt + ' -> ' + c.href));
  const withCta = d.ctas.filter(c => c.cta);
  const withRealHref = d.ctas.filter(c => c.href && c.href !== '#' && !c.href.startsWith('#'));
  console.log('  data-cta mapped: ' + withCta.length + ' | direct external hrefs: ' + withRealHref.length);
  if (withRealHref.length) {
    console.log('  !! external hrefs present before Selar verification:');
    withRealHref.forEach(c => console.log('     ' + c.txt + ' -> ' + c.href));
  }
  console.log('\n=== COUNTDOWN ===');
  console.log('  ' + JSON.stringify(d.liveState));

  ws.close(); chrome.kill();
  process.exit(0);
}
main().catch(e => { console.error('FAILED:', e); process.exit(1); });
