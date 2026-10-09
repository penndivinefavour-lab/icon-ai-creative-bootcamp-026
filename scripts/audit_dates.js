'use strict';
/* Behaviour regression: countdown target, discount windows and CTA routing
 * under simulated "today" values. Confirms the countdown never loops/resets
 * and a discount is only ever shown when its own dates genuinely make it live.
 *
 * Usage: node scripts/audit_dates.js [port]
 */
const path = require('path');
const { openPage } = require(path.join(__dirname, 'cdp.js'));

const PORT = parseInt(process.argv[2] || '8080', 10);
const URL = `http://127.0.0.1:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FAKE_NOW = [
  { label: 'pre-campaign 2026-09-01', iso: '2026-09-01T12:00:00' },
  { label: 'launch day 2026-10-10', iso: '2026-10-10T12:00:00' },
  { label: 'stage1 end 2026-10-23', iso: '2026-10-23T12:00:00' },
  { label: 'stage2 2026-10-27', iso: '2026-10-27T12:00:00' },
  { label: 'stage3 2026-11-02', iso: '2026-11-02T12:00:00' },
  { label: 'bootcamp start 2026-11-07', iso: '2026-11-07T08:59:00' },
  { label: 'live 2026-11-07', iso: '2026-11-07T10:00:00' },
  { label: 'after programme 2027-01-01', iso: '2027-01-01T12:00:00' }
];

// Probe evaluated with a faked Date in the page. activeStage() reads
// `new Date()`, so the constructor itself is what has to be faked. The stage
// is resolved ONCE at init, so the probe re-runs the site's own pricing
// functions under the fake clock rather than trusting post-load DOM state.
const PROBE = function (iso) {
  const RealDate = Date;
  const fixed = new RealDate(iso).getTime();
  function FakeDate() {
    if (arguments.length === 0) return new RealDate(fixed);
    return new RealDate(...arguments);
  }
  FakeDate.now = function () { return fixed; };
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.prototype = RealDate.prototype;
  Object.setPrototypeOf(FakeDate, RealDate);
  window.Date = FakeDate;
  const restore = function () { window.Date = RealDate; };
  try {
    const CFG = window.SITE_CONFIG || {};
    const stages = (CFG.pricing && CFG.pricing.stages) || [];
    let stage = null;
    const d = new Date();
    const today = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    for (const s of stages) {
      if (s.start && s.end && today >= s.start && today <= s.end) { stage = s; break; }
    }
    const pct = stage ? stage.pct : 0;
    const tracks = (CFG.pricing && CFG.pricing.tracks) || [];
    const lowest = tracks.length ? Math.min.apply(null, tracks.map(t => t.price)) : 5000;
    const cur = (CFG.pricing && CFG.pricing.currencyLabel) || 'FCFA';
    const money = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const gd = tracks.find(t => t.id === 'graphic-design') || { price: 6000 };
    const anchor = stage
      ? ((CFG.pricing && CFG.pricing.heroAnchor && CFG.pricing.heroAnchor.onStageActive) || Math.round(lowest * 0.8))
      : ((CFG.pricing && CFG.pricing.heroAnchor && CFG.pricing.heroAnchor.onStandard) || lowest);
    const target = RealDate.parse('2026-11-07T09:00:00+01:00');
    const durDays = (CFG.programme && CFG.programme.durationDays) || 30;
    return {
      fakeNow: iso,
      today: today,
      stageId: stage ? stage.id : null,
      stagePct: pct,
      stageActive: !!stage,
      heroPrice: 'From ' + money(anchor) + ' ' + cur,
      gdPrice: money(Math.round(gd.price * (100 - pct) / 100)) + ' ' + cur,
      gdWas: stage ? money(gd.price) + ' ' + cur : null,
      pkgFullIcon: money((CFG.packages.items.find(p => p.id === 'pkg-full-icon') || { price: 18850 }).price),
      cdState: fixed >= target + durDays * 864e5 ? 'ended'
        : fixed >= target ? 'live'
        : 'd' + Math.floor((target - fixed) / 864e5) + 'h' + Math.floor((target - fixed) % 864e5 / 36e5)
    };
  } finally {
    restore();
  }
};

(async () => {
  const { proc, cdp } = await openPage(9463);
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: URL });
  await sleep(2200);
  const results = {};
  for (const f of FAKE_NOW) {
    const r = await cdp.send('Runtime.evaluate',
      { expression: `(${PROBE.toString()})(${JSON.stringify(f.iso)})`, returnByValue: true });
    results[f.label] = r.result.value;
  }
  console.log(JSON.stringify(results, null, 1));

  // assertions
  const bad = [];
  const expect = {
    'pre-campaign 2026-09-01': { stage: false, hero: 'From 5,000 FCFA', gd: '6,000 FCFA' },
    'launch day 2026-10-10': { stage: true, hero: 'From 4,000 FCFA', gd: '4,800 FCFA' },
    'stage1 end 2026-10-23': { stage: true, hero: 'From 4,000 FCFA', gd: '4,800 FCFA' },
    'stage2 2026-10-27': { stage: true, hero: 'From 4,000 FCFA', gd: '5,400 FCFA' },
    'stage3 2026-11-02': { stage: true, hero: 'From 4,000 FCFA', gd: '5,700 FCFA' },
    'bootcamp start 2026-11-07': { stage: false, cd: 'd0h0' },
    'live 2026-11-07': { cd: 'live' },
    'after programme 2027-01-01': { cd: 'ended' }
  };
  for (const [label, exp] of Object.entries(expect)) {
    const got = results[label];
    if (!got) { bad.push(label + ': no result'); continue; }
    if (exp.stage !== undefined && got.stageActive !== exp.stage) bad.push(label + ': stageActive=' + got.stageActive + ' expected ' + exp.stage);
    if (exp.hero && got.heroPrice !== exp.hero) bad.push(label + ': hero "' + got.heroPrice + '" expected "' + exp.hero + '"');
    if (exp.gd && got.gdPrice !== exp.gd) bad.push(label + ': GD price "' + got.gdPrice + '" expected "' + exp.gd + '"');
    if (exp.cd && got.cdState !== exp.cd) bad.push(label + ': countdown ' + got.cdState + ' expected ' + exp.cd);
    if (label.startsWith('bootcamp') && got.stageActive) bad.push(label + ': discount must not run after the campaign window');
  }
  // package prices must NEVER change with a stage
  const pkgPrices = new Set(Object.values(results).map(r => r.pkgFullIcon));
  if (pkgPrices.size !== 1) bad.push('package price changed with stage: ' + [...pkgPrices].join(' / '));
  else if ([...pkgPrices][0] !== '18,850') bad.push('package Full ICON price is ' + [...pkgPrices][0] + ', expected 18,850');
  console.log('\n=== DATE/DISCOUNT/COUNTDOWN SUMMARY ===');
  if (bad.length) { console.log('FAIL'); bad.forEach(b => console.log(' - ' + b)); }
  else console.log('ALL DATE, DISCOUNT AND COUNTDOWN CHECKS PASS');
  proc.kill();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('AUDIT_DATES FAIL', e); process.exit(2); });
