'use strict';
// Confirm the Founder-reported visual defects with live computed styles.
const path = require('path');
const { openPage } = require(path.join(__dirname, 'cdp.js'));

const URL = process.argv[2] || 'http://127.0.0.1:8080/';
async function main() {
  const { proc, cdp } = await openPage(9341);
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375, height: 812, deviceScaleFactor: 2, mobile: true
    });
    await cdp.send('Page.navigate', { url: URL });
    await new Promise(r => setTimeout(r, 2500));

    const report = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const out = { invisible: [], narrowSteps: [], unapprovedColors: [] };
        const seen = new Set();
        // 1. Find text whose computed colour is white-ish on a white-ish card
        document.querySelectorAll('.card, .benefit-card, .track-card, .price-card, .pay-step, .faq, .curr-card').forEach(card => {
          const bg = getComputedStyle(card).backgroundColor;
          const cardLum = luminance(bg);
          card.querySelectorAll('p, li, h2, h3, h4, span, dd, dt').forEach(el => {
            if (!el.textContent.trim()) return;
            if (seen.has(el)) return; seen.add(el);
            const cs = getComputedStyle(el);
            const fg = cs.color;
            const lum = luminance(fg);
            if (lum > 0.9 && cardLum > 0.9) {
              out.invisible.push({ tag: el.tagName, cls: el.className, text: el.textContent.trim().slice(0,50), bg, fg });
            }
          });
        });
        // 2. Payment step text widths
        document.querySelectorAll('.pay-step, .step').forEach(step => {
          const p = step.querySelector('p');
          if (p) {
            const r = p.getBoundingClientRect();
            if (r.width > 0 && r.width < 160) out.narrowSteps.push({ cls: step.className, w: Math.round(r.width), text: p.textContent.trim().slice(0,40) });
          }
        });
        // 3. Scan all element colours for teal/green/orange hues
        const bad = new Set();
        document.querySelectorAll('*').forEach(el => {
          ['color','backgroundColor','borderColor','backgroundImage'].forEach(prop => {
            const v = getComputedStyle(el)[prop];
            if (!v || v === 'none' || v.includes('gradient')) return;
            const m = v.match(/rgba?\\(([^)]+)\\)/);
            if (!m) return;
            const [r,g,b] = m[1].split(',').map(Number);
            // teal/green: g dominant, r low-mid ; orange: r high, g mid, b low
            if (g > 110 && g > r + 25 && g > b + 25) bad.add('teal/green ' + prop + ': ' + v.trim());
            if (r > 200 && g > 90 && g < 180 && b < 90) bad.add('orange ' + prop + ': ' + v.trim());
          });
        });
        out.unapprovedColors = [...bad].slice(0, 20);
        function luminance(c) {
          const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return 1;
          let [r,g,b] = m[1].split(',').map(Number);
          [r,g,b] = [r,g,b].map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
          return 0.2126*r + 0.7152*g + 0.0722*b;
        }
        return JSON.stringify(out, null, 1);
      })()`,
      returnByValue: true
    });
    console.log(report.result ? report.result.value : JSON.stringify(report));
  } finally {
    cdp.close(); proc.kill();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
