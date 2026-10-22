// Browser acceptance test for the conference-timeline view (src/conf.html, synced into index.html).
//   node tests/conf-test.js            # all checks, exits 1 on the first failure
//   SHOTS=dir node tests/conf-test.js  # also save screenshots into dir
// Needs no server and no network: pages on http://127.0.0.1:8123/ are answered from the
// repository folder by Playwright's request interception; Google Fonts get an empty
// stylesheet; any other outside request fails the test. Time is frozen with page.clock
// at 2026-10-22 17:00 UTC (12:00 in Chicago).
const path = require('path'), fs = require('fs');
// cloud containers keep the browsers in /opt/pw-browsers and some sandboxes clear the variable
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8123/';
const NOW = new Date('2026-10-22T17:00:00Z');
const SHOTS = process.env.SHOTS || '';
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png'};

let failures = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ok   ' + msg); return; }
  failures++; console.log('  FAIL ' + msg);
  throw new Error(msg);
}

async function newPage(browser, opts, problems, extraInit) {
  const ctx = await browser.newContext(Object.assign({timezoneId: 'America/Chicago', locale: 'zh-CN', acceptDownloads: true}, opts));
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin === 'http://127.0.0.1:8123') {
      let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({status: 404, body: 'not found'});
      return route.fulfill({status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream'});
    }
    if (u.hostname === 'fonts.googleapis.com') return route.fulfill({status: 200, body: '', contentType: 'text/css'});
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    problems.push('outside request: ' + u.href);
    return route.abort();
  });
  if (extraInit) await ctx.addInitScript(extraInit);
  await ctx.clock.install({time: NOW});
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') problems.push('console error: ' + m.text()); });
  page.on('pageerror', e => problems.push('page error: ' + e.message));
  return {ctx, page};
}

// clock.install lets time run in real time; freeze it right after loading so countdowns are deterministic
async function load(page, url) {
  await page.goto(url);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
}
async function text(page, sel) { return (await page.locator(sel).first().textContent() || '').replace(/\s+/g, ' ').trim(); }
async function shot(page, name, opts) { if (SHOTS) await page.screenshot(Object.assign({path: path.join(SHOTS, name)}, opts || {})); }
async function countdown(page, conf) {
  const box = page.locator(`[data-countdown="${conf}"]`).first();
  const get = async u => parseInt((await box.locator(`[data-unit="${u}"]`).first().textContent()).trim(), 10);
  return {d: await get('d'), h: await get('h'), m: await get('m'), s: await get('s')};
}

async function desktop(browser) {
  console.log('desktop 1280 x 900');
  const problems = [];
  const {ctx, page} = await newPage(browser, {viewport: {width: 1280, height: 900}}, problems);
  await load(page, BASE + 'index.html');
  await page.clock.runFor(500);

  // hub: studio is the default view and still works
  ok(await page.locator('#room').isVisible(), 'studio canvas visible by default');
  ok(!(await page.locator('#conf').isVisible()), 'conference view hidden by default');
  ok(await page.locator('[role=tab]').count() === 3, 'exactly the 3 studio workflow tabs use role=tab');
  ok(await page.locator('button[data-view="studio"]').count() === 1 && await page.locator('button[data-view="conf"]').count() === 1, 'hub switch has a studio and a conf button');
  await shot(page, 'conf-studio-1280.png');

  await page.locator('button[data-view="conf"]').click();
  await page.clock.runFor(100);
  ok(await page.locator('#conf').isVisible(), 'conf view visible after switching');
  ok(!(await page.locator('#room').isVisible()), 'studio hidden in conf view');
  ok(await page.evaluate(() => location.hash) === '#conf', 'hash is #conf');
  ok(await page.locator('button[data-view="conf"]').getAttribute('aria-pressed') === 'true', 'conf switch aria-pressed=true');

  // countdowns use floor((deadline - now) / 1 s); CVPR abstract 2026-11-11 11:59Z, RSS abstract 2026-12-05 11:59Z
  const parts = sec => ({d: Math.floor(sec / 86400), h: Math.floor(sec % 86400 / 3600), m: Math.floor(sec % 3600 / 60), s: sec % 60});
  const want = async iso => parts(Math.floor((Date.parse(iso) - await page.evaluate(() => Date.now())) / 1000));
  const same = (a, b) => a.d === b.d && a.h === b.h && a.m === b.m && a.s === b.s;
  let c = await countdown(page, 'cvpr'), e = await want('2026-11-11T11:59:00Z');
  ok(same(c, e) && c.d === 19, `CVPR countdown ${JSON.stringify(e)} (got ${JSON.stringify(c)})`);
  await page.clock.runFor(1000);
  c = await countdown(page, 'cvpr'); e = await want('2026-11-11T11:59:00Z');
  ok(same(c, e), `CVPR countdown ticks to ${JSON.stringify(e)} (got ${JSON.stringify(c)})`);
  const r = await countdown(page, 'rss'); e = await want('2026-12-05T11:59:00Z');
  ok(same(r, e) && r.d === 43, `RSS countdown ${JSON.stringify(e)} (got ${JSON.stringify(r)})`);
  const ic = page.locator('[data-countdown="iclr"]').first();
  ok(await ic.getAttribute('data-estimate') === 'true', 'ICLR countdown marked data-estimate=true');
  const icText = await text(page, '[data-countdown="iclr"]');
  ok(icText.includes('~') && icText.includes('337'), `ICLR countdown is an estimate "~337..." (got "${icText}")`);

  // next deadline
  ok(await page.locator('#conf-next').getAttribute('data-ms') === 'cvpr-abstract', 'next deadline is cvpr-abstract');
  ok((await text(page, '#conf-next')).includes('CVPR'), 'next deadline card names CVPR');

  // time zones (default Chicago)
  ok(await page.locator('[data-tz="chicago"]').getAttribute('aria-pressed') === 'true', 'default time zone is Chicago');
  const T = id => text(page, `[data-ms-time="${id}"]`);
  ok((await T('cvpr-paper')).includes('2026-11-17 05:59'), `Chicago: CVPR paper 2026-11-17 05:59 (got "${await T('cvpr-paper')}")`);
  ok((await T('cvpr-abstract')).includes('2026-11-11 05:59'), 'Chicago: CVPR abstract 2026-11-11 05:59');
  ok((await T('rss-final')).includes('2027-04-17 06:59'), `Chicago (CDT): RSS final 2027-04-17 06:59 (got "${await T('rss-final')}")`);
  ok((await text(page, '[data-ms-row="cvpr-paper"]')).includes('+1d'), 'Chicago: CVPR paper row shows +1d');
  await page.locator('[data-tz="beijing"]').click();
  ok((await T('cvpr-paper')).includes('2026-11-17 19:59'), 'Beijing: CVPR paper 2026-11-17 19:59');
  ok((await T('rss-final')).includes('2027-04-17 19:59'), 'Beijing: RSS final 2027-04-17 19:59');
  ok((await T('rss-abstract')).includes('2026-12-05 19:59'), 'Beijing: RSS abstract 2026-12-05 19:59');
  ok(await page.locator('[data-tz="beijing"]').getAttribute('aria-pressed') === 'true' && await page.locator('[data-tz="chicago"]').getAttribute('aria-pressed') === 'false', 'tz buttons aria-pressed follow the choice');
  await page.locator('#conf-board, [data-countdown]').first().scrollIntoViewIfNeeded();
  await shot(page, 'conf-beijing-1280.png');
  await page.locator('[data-tz="aoe"]').click();
  ok((await T('cvpr-paper')).includes('2026-11-16 23:59'), 'AoE: CVPR paper 2026-11-16 23:59');
  ok((await T('rss-final')).includes('2027-04-16 23:59'), 'AoE: RSS final 2027-04-16 23:59');
  ok(!(await text(page, '[data-ms-row="cvpr-paper"]')).includes('+1d'), 'AoE: no +1d');
  ok((await T('rss-stage1')).includes('2027-02-05'), 'date-only item RSS stage-1 shows 2027-02-05');
  await page.locator('[data-tz="chicago"]').click();
  ok((await T('rss-stage1')).includes('2027-02-05'), 'date-only item stays 2027-02-05 in Chicago');

  // estimates
  for (const id of ['iclr-abstract', 'iclr-paper', 'iclr-conf', 'cvpr-decision']) {
    const m = page.locator(`[data-ms="${id}"]`).first();
    ok(await m.getAttribute('data-estimate') === 'true', `${id} marker has data-estimate=true`);
    ok((await text(page, `[data-ms-row="${id}"]`)).includes('预计'), `${id} row says 预计`);
  }
  const est = page.locator('[data-ms="iclr-paper"]').first();
  const bs = await est.evaluate(e => { const s = getComputedStyle(e); return [s.borderTopStyle, s.outlineStyle, getComputedStyle(e, '::before').borderTopStyle, getComputedStyle(e, '::after').borderTopStyle].join(','); });
  ok(bs.includes('dashed') || bs.includes('dotted'), `ICLR estimate marker is dashed/dotted (got ${bs})`);
  ok(await page.locator('[data-ms="cvpr-paper"]').first().getAttribute('data-estimate') !== 'true', 'confirmed CVPR paper is not an estimate');

  // the timeline: lanes, today marker, scrolling inside its box
  for (const k of ['cvpr', 'rss', 'iclr']) ok(await page.locator(`[data-lane="${k}"]`).first().isVisible(), `lane ${k} visible`);
  ok(await page.locator('[data-today]').count() >= 1, 'today marker present');
  const sc = await page.locator('#conf-track').evaluate(e => [e.scrollWidth, e.clientWidth]);
  ok(sc[0] > sc[1], `timeline #conf-track scrolls inside its box (${sc})`);

  // tooltip on hover
  await page.locator('[data-ms="rss-stage1"]').first().hover();
  await page.clock.runFor(300);
  ok(await page.locator('#conf-tip').isVisible(), 'tooltip visible on hover');
  const tip = await text(page, '#conf-tip');
  ok(tip.includes('第一阶段') && tip.includes('2027-02-05'), `tooltip shows details (got "${tip}")`);
  await shot(page, 'conf-hover-1280.png');
  await page.mouse.move(5, 5);
  await page.clock.runFor(300);

  // ticket on click + ics + Esc
  await page.locator('[data-ms="cvpr-paper"]').first().click();
  await page.clock.runFor(300);
  ok(await page.locator('#conf-ticket').isVisible(), 'ticket panel visible after click');
  const tk = id => text(page, `#conf-ticket [data-tz-row="${id}"]`);
  ok((await tk('chicago')).includes('2026-11-17 05:59') && (await tk('beijing')).includes('2026-11-17 19:59') && (await tk('aoe')).includes('2026-11-16 23:59'), 'ticket lists all three time zones');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#conf-ticket [data-ics]').first().click()]);
  const ics = fs.readFileSync(await dl.path(), 'utf8');
  ok(/\.ics$/.test(dl.suggestedFilename()), `ics filename ${dl.suggestedFilename()}`);
  ok(ics.includes('BEGIN:VCALENDAR') && ics.includes('BEGIN:VEVENT') && ics.includes('END:VCALENDAR'), 'ics has calendar and event');
  ok(ics.includes('DTSTART:20261117T105900Z') && ics.includes('DTEND:20261117T115900Z'), 'ics times are 10:59Z-11:59Z');
  ok(/SUMMARY:[^\r\n]*CVPR/.test(ics) && /\r\n/.test(ics), 'ics has a CVPR summary and CRLF line ends');
  await page.keyboard.press('Escape');
  await page.clock.runFor(300);
  ok(!(await page.locator('#conf-ticket').isVisible()), 'Esc closes the ticket');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-ms')) === 'cvpr-paper', 'focus returns to the marker');
  await page.locator('[data-ms="iclr-paper"]').first().click();
  await page.clock.runFor(300);
  ok(await page.locator('#conf-ticket [data-ics]').count() === 0, 'no .ics button for an estimate');
  await page.keyboard.press('Escape');

  // lane toggles (keyboard)
  await page.locator('[data-toggle="cvpr"]').focus();
  await page.keyboard.press('Space');
  await page.clock.runFor(600);
  ok(await page.locator('[data-toggle="cvpr"]').getAttribute('aria-pressed') === 'false', 'Space on CVPR toggle sets aria-pressed=false');
  ok(!(await page.locator('[data-lane="cvpr"]').first().isVisible()), 'CVPR lane hidden');
  ok(!(await page.locator('[data-ms-row="cvpr-paper"]').first().isVisible()), 'CVPR rows hidden in the timetable');
  ok(await page.locator('#conf-next').getAttribute('data-ms') === 'rss-abstract', 'next deadline moves to rss-abstract');
  await page.locator('[data-toggle="cvpr"]').press('Enter');
  await page.clock.runFor(600);
  ok(await page.locator('[data-lane="cvpr"]').first().isVisible(), 'Enter shows the CVPR lane again');

  // walker reaches today
  await page.clock.runFor(3000);
  const w = page.locator('.conf-walker').first();
  ok(await w.count() === 1, 'pixel walker present');
  const bg = await w.evaluate(e => getComputedStyle(e).backgroundImage);
  ok(bg.includes('data:image'), 'walker uses the page sprite (A.char5)');
  const xs = await page.evaluate(() => {
    const t = document.querySelector('[data-today]').getBoundingClientRect(), k = document.querySelector('.conf-walker').getBoundingClientRect();
    return [t.left + t.width / 2, k.left + k.width / 2];
  });
  ok(Math.abs(xs[0] - xs[1]) <= 6, `walker stands at today (${xs.map(Math.round)})`);
  await shot(page, 'conf-default-1280.png');

  // checklist + persistence
  const boxes = page.locator('[data-checklist="cvpr"] input[type=checkbox]');
  const n = await boxes.count();
  ok(n >= 4, `CVPR checklist has ${n} items`);
  for (let i = 0; i < n; i++) await boxes.nth(i).check();
  await page.clock.runFor(500);
  ok(await page.locator('[data-checklist="cvpr"]').evaluate(e => e.classList.contains('is-done')), 'complete checklist gets is-done');
  await page.locator('[data-checklist="rss"] input[type=checkbox]').first().check();
  await page.locator('[data-tz="beijing"]').click();
  await page.locator('[data-toggle="iclr"]').click();
  await page.reload();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await page.clock.runFor(500);
  ok(await page.locator('#conf').isVisible(), 'reload with #conf opens the conf view');
  ok(await page.locator('[data-checklist="cvpr"] input[type=checkbox]:checked').count() === n, 'CVPR checks persist across reload');
  ok(await page.locator('[data-checklist="rss"] input[type=checkbox]:checked').count() === 1, 'RSS check persists');
  ok(await page.locator('[data-tz="beijing"]').getAttribute('aria-pressed') === 'true', 'time zone persists');
  ok(!(await page.locator('[data-lane="iclr"]').first().isVisible()), 'hidden lane persists');
  await page.locator('[data-toggle="iclr"]').click();

  // sources
  const hrefs = await page.locator('#conf a[href]').evaluateAll(a => a.map(x => x.href));
  for (const s of ['cvpr.thecvf.com/Conferences/2027/CallForPapers', 'roboticsconference.org/information/cfp', 'iclr.cc'])
    ok(hrefs.some(h => h.includes(s)), 'source link ' + s);
  ok((await text(page, '#conf')).includes('2026-10-22'), 'last-checked date shown');

  // back to the studio
  await page.locator('button[data-view="studio"]').click();
  await page.clock.runFor(500);
  ok(await page.locator('#room').isVisible() && !(await page.locator('#conf').isVisible()), 'back to studio view');
  const cw = await page.locator('#room').evaluate(e => e.width);
  ok(cw >= 352 * 2, `studio canvas re-fitted after returning (width ${cw})`);
  ok(await page.evaluate(() => location.hash) !== '#conf', 'hash cleared for studio');

  ok(problems.length === 0, 'no console errors / outside requests' + (problems.length ? ': ' + problems.join(' | ') : ''));
  await ctx.close();
}

async function phone(browser) {
  console.log('phone 390 x 844');
  const problems = [];
  const {ctx, page} = await newPage(browser, {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 2}, problems);
  await load(page, BASE + 'index.html#conf');
  await page.clock.runFor(3000);
  ok(await page.locator('#conf').isVisible(), 'phone: #conf opens the conf view');
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth]);
  ok(sw[0] <= 390 && sw[1] <= 390, `phone: no horizontal page scroll in conf view (${sw})`);
  await page.locator('[data-ms="rss-final"]').first().tap();
  await page.clock.runFor(300);
  ok(await page.locator('#conf-ticket').isVisible(), 'phone: tap opens the ticket');
  const tb = await page.locator('#conf-ticket').boundingBox();
  ok(tb.x >= 0 && tb.x + tb.width <= 390, 'phone: ticket fits the screen width');
  const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw2 <= 390, `phone: still no horizontal scroll with ticket open (${sw2})`);
  await shot(page, 'conf-phone-390-ticket.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'conf-phone-390.png', {fullPage: true});
  await page.locator('button[data-view="studio"]').tap();
  await page.clock.runFor(500);
  const sw3 = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw3 <= 390, `phone: no horizontal scroll in studio view (${sw3})`);
  ok(problems.length === 0, 'phone: no console errors' + (problems.length ? ': ' + problems.join(' | ') : ''));
  await ctx.close();
}

async function noStorage(browser) {
  console.log('localStorage that throws');
  const problems = [];
  const init = () => { const bad = () => { throw new Error('storage blocked'); }; Storage.prototype.getItem = bad; Storage.prototype.setItem = bad; };
  const {ctx, page} = await newPage(browser, {viewport: {width: 1000, height: 800}}, problems, init);
  await load(page, BASE + 'index.html#conf');
  await page.clock.runFor(1000);
  ok(await page.locator('#conf').isVisible() && await page.locator('[data-countdown="cvpr"]').first().isVisible(), 'renders without storage');
  await page.locator('[data-checklist="cvpr"] input[type=checkbox]').first().check();
  await page.locator('[data-tz="aoe"]').click();
  ok((await text(page, '[data-ms-time="cvpr-paper"]')).includes('2026-11-16 23:59'), 'tz switch works without storage');
  ok(problems.length === 0, 'no errors without storage' + (problems.length ? ': ' + problems.join(' | ') : ''));
  await ctx.close();
}

(async () => {
  const sync = require('child_process').spawnSync('python3', [path.join(ROOT, 'tools', 'sync_conf.py'), '--check'], {encoding: 'utf8'});
  console.log((sync.stdout + sync.stderr).trim());
  if (sync.status !== 0) { console.log('FAIL block not in sync'); process.exit(1); }
  if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
  const browser = await pw.chromium.launch();
  try {
    await desktop(browser);
    await phone(browser);
    await noStorage(browser);
  } catch (e) {
    if (!failures) console.log('ERROR ' + (e && e.stack || e));
    await browser.close();
    process.exit(1);
  }
  await browser.close();
  console.log('ALL PASS');
})();
