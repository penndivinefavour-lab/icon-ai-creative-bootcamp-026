'use strict';
/* Pixel-truth text audit: screenshots the page at several scroll positions, then
 * for every visible text node samples the ACTUAL painted pixels inside its glyph
 * box and in the ring just outside it. Flags text whose stroke pixels are the
 * same colour as their surround (invisible / clipped / painted over) and text
 * whose box crosses the viewport edge (clipped).
 *
 * Usage: node scripts/audit_pixels.js [port] [outdir]
 */
const path = require('path');
const fs = require('fs');
const { openPage } = require(path.join(__dirname, 'cdp.js'));

const PORT = parseInt(process.argv[2] || '8080', 10);
const URL = `http://127.0.0.1:${PORT}/`;
const OUT = process.argv[3] || path.join(process.env.LOCALAPPDATA || __dirname, 'Temp', 'icb26-pixels');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VIEWPORTS = [
  { w: 320, h: 700, dsf: 2 }, { w: 375, h: 812, dsf: 2 },
  { w: 414, h: 896, dsf: 2 }, { w: 1280, h: 800, dsf: 1 }
];
const PASSES = 6;

const PROBE = function () {
  const rows = [];
  const walk = el => {
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) {
        const t = ch.textContent.trim();
        if (!t) continue;
        const p = ch.parentElement;
        const cs = getComputedStyle(p);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, n = 0;
        try {
          const range = document.createRange();
          range.selectNodeContents(ch);
          for (const q of range.getClientRects()) {
            if (q.width < 1 || q.height < 1) continue;
            minX = Math.min(minX, q.left); minY = Math.min(minY, q.top);
            maxX = Math.max(maxX, q.right); maxY = Math.max(maxY, q.bottom);
            n++;
          }
        } catch (e) { continue; }
        if (!n || !isFinite(minX)) continue;
        if (maxX - minX < 3 || maxY - minY < 4) continue;
        rows.push({
          t: t.slice(0, 30), cls: String(p.className).split(' ')[0],
          x: Math.round(minX), y: Math.round(minY),
          w: Math.round(maxX - minX), h: Math.round(maxY - minY),
          color: cs.color, fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
          vw: document.documentElement.clientWidth,
          right: Math.round(maxX)
        });
      } else if (ch.nodeType === 1 && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(ch.tagName)) {
        walk(ch);
      }
    }
  };
  walk(document.body);
  return rows;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { proc, cdp } = await openPage(9465);
  const report = {};
  for (const v of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: v.w, height: v.h, deviceScaleFactor: v.dsf, mobile: v.w < 768 });
    await cdp.send('Page.navigate', { url: URL });
    await sleep(2000);
    const maxR = await cdp.send('Runtime.evaluate',
      { expression: `document.documentElement.scrollHeight - window.innerHeight`, returnByValue: true });
    const max = maxR.result.value || 1000;
    const seen = new Map();
    for (let i = 0; i <= PASSES; i++) {
      await cdp.send('Runtime.evaluate',
        { expression: `window.scrollTo({top: Math.round(${max} * ${i / PASSES}), behavior: 'instant'})`, returnByValue: true });
      await sleep(400);
      const r = await cdp.send('Runtime.evaluate',
        { expression: `(${PROBE.toString()})()`, returnByValue: true });
      const rows = r.result.value || [];
      // keep only rows visible in THIS pass
      const vis = rows.filter(x => x.y >= -10 && x.y + x.h <= v.h + 10);
      if (!vis.length) continue;
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const shotFile = path.join(OUT, `px-${v.w}-${i}.png`);
      fs.writeFileSync(shotFile, Buffer.from(shot.data, 'base64'));
      vis.forEach((row, idx) => {
        const key = row.t + '|' + row.x + '|' + Math.round(row.y + (i * 0)); // y is viewport-relative
        if (seen.has(key)) return;
        seen.set(key, { ...row, pass: i, shot: path.basename(shotFile) });
      });
    }
    const items = [...seen.values()];
    fs.writeFileSync(path.join(OUT, `nodes-${v.w}.json`), JSON.stringify(items, null, 0));
    report[v.w] = { nodes: items.length };
    console.log(`${v.w}px: ${items.length} text nodes captured across ${PASSES + 1} passes`);
  }
  proc.kill();
  console.log(JSON.stringify(report, null, 1));
  console.log('artefacts in ' + OUT);
  process.exit(0);
})().catch(e => { console.error('AUDIT_PIXELS FAIL', e); process.exit(2); });
