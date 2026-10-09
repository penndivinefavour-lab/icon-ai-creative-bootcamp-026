'use strict';
/* REGRESSION TESTS for the three confirmed layout/contact bugs fixed in this
 * phase. Each test reproduces the original defect against the live page and
 * fails loudly if it returns.
 *
 *   BUG 1  Announcement bar: the long campaign sentence crushed the <p> to
 *          ~103px on narrow screens; it wrapped into a ~244px column, the bar
 *          grew to ~269px and pushed the white header down INTO the navy hero.
 *   BUG 2  Hero price line: the gold price (17px) is larger than its parent
 *          line box (15px / 1.45), so the wrapped suffix collided with the
 *          price glyphs by ~22px at 320-375px.
 *   BUG 3  tel: links carried a masked placeholder (asterisks) and were not
 *          bound to config at all — every dial link was dead.
 *
 * Usage: node scripts/audit_regression.js [port]
 */
const path = require('path');
const { openPage } = require(path.join(__dirname, 'cdp.js'));

const PORT = parseInt(process.argv[2] || '8080', 10);
const URL = `http://127.0.0.1:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Navigating to a fresh page can resolve before scripts have run; wait until
// the announcement bar (populated by JS) is actually present.
async function ready(cdp) {
  for (let i = 0; i < 60; i++) {
    const r = await cdp.send('Runtime.evaluate', {
      expression: 'JSON.stringify({ann: !!document.querySelector("#announcement"), txt: (document.querySelector("#announcement-text")||{}).textContent ? document.querySelector("#announcement-text").textContent.length : 0, hero: !!document.querySelector(".hero"), price: !!document.querySelector("#hero-price")})',
      returnByValue: true });
    try {
      const v = JSON.parse(r.result.value);
      if (v.ann && v.hero && v.price && v.txt > 10) return true;
    } catch (e) { /* keep waiting */ }
    await sleep(300);
  }
  return false;
}

const MOBILE = [320, 360, 375, 390, 414];
let fails = 0;
const fail = (label, detail) => { fails++; console.log('  FAIL  ' + label + ' — ' + detail); };
const pass = (label) => console.log('  PASS  ' + label);

(async () => {
  const { proc, cdp } = await openPage(9490);
  console.log('REGRESSION AUDIT — bugs fixed in this phase');

  /* ---- BUG 1 + BUG 2 : mobile layout, measured on the live page ---- */
  for (const w of MOBILE) {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: w, height: 860, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: URL });
    await sleep(1200);
    await ready(cdp);
    const r = await cdp.send('Runtime.evaluate', { expression: `
      (function(){
        var ab = document.querySelector('#announcement').getBoundingClientRect();
        var p  = document.querySelector('#announcement-text').getBoundingClientRect();
        var hd = document.querySelector('.site-header').getBoundingClientRect();
        var hero = document.querySelector('.hero').getBoundingClientRect();
        var price = document.querySelector('#hero-price').getBoundingClientRect();
        var sfx = document.querySelector('#hero-price-suffix').getBoundingClientRect();
        return JSON.stringify({
          vw: window.innerWidth,
          barH: Math.round(ab.height),
          paraW: Math.round(p.width),
          paraH: Math.round(p.height),
          headerTop: Math.round(hd.top + window.scrollY),
          headerH: Math.round(hd.height),
          heroTop: Math.round(hero.top + window.scrollY),
          heroBg: getComputedStyle(document.querySelector('.hero')).backgroundColor,
          priceBottom: Math.round(price.bottom),
          sfxTop: Math.round(sfx.top),
          sfxH: Math.round(sfx.height)
        });
      })()
    `, returnByValue: true });
    if (!r || !r.result || !r.result.value) { fail('probe returned nothing at ' + w, JSON.stringify(r && r.result)); continue; }
    const m = JSON.parse(r.result.value);

    // BUG 1a: the paragraph must keep a readable width, not a crushed column.
    if (m.paraW < 200) fail('BUG1 ' + w + 'px paragraph crushed', 'paraW=' + m.paraW + 'px');
    else pass('BUG1 ' + w + 'px announcement paragraph width ' + m.paraW + 'px');

    // BUG 1b: the bar must stay compact. 269px was the defect; anything over
    // ~170 means the sentence is stacking into a tall column again.
    if (m.barH > 180) fail('BUG1 ' + w + 'px bar too tall', 'barH=' + m.barH + 'px');
    else pass('BUG1 ' + w + 'px announcement bar height ' + m.barH + 'px');

    // BUG 1c: the white header must sit ABOVE the hero, not inside it.
    if (m.headerTop + m.headerH > m.heroTop + 2)
      fail('BUG1 ' + w + 'px header inside hero', 'headerBottom=' + (m.headerTop + m.headerH) + ' heroTop=' + m.heroTop);
    else pass('BUG1 ' + w + 'px header clears the hero');

    // BUG 2: the suffix must not collide with the price glyphs.
    if (m.sfxTop < m.priceBottom)
      fail('BUG2 ' + w + 'px suffix collides with price', 'sfxTop=' + m.sfxTop + ' priceBottom=' + m.priceBottom);
    else pass('BUG2 ' + w + 'px suffix clears the price by ' + (m.sfxTop - m.priceBottom) + 'px');
  }

  /* ---- BUG 2 desktop: the two must stay on one line, not stack ---- */
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: URL });
  await sleep(1200);
  await ready(cdp);
  const rd = await cdp.send('Runtime.evaluate', { expression: `
    (function(){
      var price = document.querySelector('#hero-price').getBoundingClientRect();
      var sfx = document.querySelector('#hero-price-suffix').getBoundingClientRect();
      return JSON.stringify({priceBottom: Math.round(price.bottom), sfxTop: Math.round(sfx.top),
        sameLine: Math.abs(sfx.top - price.top) < 6});
    })()
  `, returnByValue: true });
  const md = JSON.parse(rd.result.value);
  if (!md.sameLine) fail('BUG2 desktop suffix dropped to a second line', JSON.stringify(md));
  else pass('BUG2 desktop price + suffix share one line');

  /* ---- BUG 3 : dialable, config-bound telephone links ---- */
  await ready(cdp);
  const rt = await cdp.send('Runtime.evaluate', { expression: `
    (function(){
      var links = [].slice.call(document.querySelectorAll('a[data-tel]'));
      var bad = links.filter(function(a){ return !/^tel:\\+237[0-9]{9}$/.test(a.getAttribute('href') || ''); });
      return JSON.stringify({count: links.length, bad: bad.length,
        samples: links.slice(0,3).map(function(a){ return a.getAttribute('href'); })});
    })()
  `, returnByValue: true });
  const mt = JSON.parse(rt.result.value);
  if (mt.count === 0) fail('BUG3 no config-bound tel links found', 'data-tel count 0');
  else if (mt.bad > 0) fail('BUG3 malformed tel link', JSON.stringify(mt.samples));
  else pass('BUG3 ' + mt.count + ' tel links are dialable E.164 and config-bound');

  // config itself must never ship a masked placeholder
  const fs = require('fs');
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'config.js'), 'utf8');
  const e164 = /"phoneE164"\s*:\s*"([^"]*)"/.exec(cfg);
  if (!e164 || !/^\+237[0-9]{9}$/.test(e164[1]))
    fail('BUG3 config phoneE164 is not a real number', String(e164 && e164[1]));
  else pass('BUG3 config phoneE164 is a real dialable value');

  // no masked placeholder may remain anywhere in shipped markup/config
  const files = ['index.html', 'assets/js/config.js',
    'legal/privacy.html', 'legal/refund.html', 'legal/terms.html'];
  let masked = 0;
  files.forEach(f => {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    if (/tel:\+237[\*]/.test(src)) { masked++; fail('BUG3 masked tel in ' + f, 'asterisk placeholder present'); }
  });
  if (masked === 0) pass('BUG3 no masked tel placeholders in shipped files');

  proc.kill();
  console.log('-'.repeat(70));
  console.log(fails ? ('  REGRESSION FAILURES: ' + fails) : '  ALL REGRESSION CHECKS PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('REGRESSION AUDIT FAILED TO RUN: ' + e.message); process.exit(2); });
