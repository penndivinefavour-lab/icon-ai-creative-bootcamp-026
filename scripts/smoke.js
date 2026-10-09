'use strict';
// Smoke test: page loads, JS builds all dynamic sections, no console errors.
const cdp = require('./cdp');

(async () => {
  const { proc, cdp: client } = await cdp.openPage(9400);
  const errors = [];
  client.events.push = function (e) {
    if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description || ''));
    if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') errors.push(JSON.stringify(e.params.args.map(a => a.value || a.description || '')));
    return Array.prototype.push.apply(this, [e]);
  };

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8080/' });
  await new Promise(r => setTimeout(r, 2500));

  const got = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r && r.result ? r.result.value : undefined;
  };

  const res = {
    packages: await got("document.querySelectorAll('#packages-grid .pkg-card').length"),
    pkgNames: await got("Array.from(document.querySelectorAll('.pkg-card__name')).map(n=>n.textContent)"),
    pkgPrices: await got("Array.from(document.querySelectorAll('.pkg-price__amount')).map(n=>n.textContent)"),
    tracks: await got("document.querySelectorAll('#tracks-grid .track-card').length"),
    priceRows: await got("document.querySelectorAll('#price-rows li').length"),
    countdownVisible: await got("!document.getElementById('countdown').hidden"),
    countdownDate: await got("document.getElementById('countdown-date').textContent"),
    cdDays: await got("document.getElementById('cd-days').textContent"),
    galleryEmptyShown: await got("!document.getElementById('gallery-empty').hidden"),
    projectsEmptyShown: await got("!document.getElementById('projects-empty').hidden"),
    assistantToggle: await got("getComputedStyle(document.getElementById('assistant-open')).display"),
    whatsappFloat: await got("document.getElementById('whatsapp-float').href"),
    h1: await got("document.querySelectorAll('h1').length"),
    overflow: await got("document.documentElement.scrollWidth - document.documentElement.clientWidth"),
    consoleErrors: errors
  };

  console.log(JSON.stringify(res, null, 2));
  cdp.close(); proc.kill();
  process.exit(0);
})().catch(e => { console.error('SMOKE FAIL', e); process.exit(1); });
