// Browser-Ende-zu-Ende-Test: startet die App, spielt Mission 1 durch, wiederholt und vergleicht.
// Bricht bei jedem JavaScript-Fehler ab. Aufruf: npm run test:e2e
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p.endsWith('/') ? p + 'index.html' : p, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data);
  });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const errors = [];
const fail = (msg) => { throw new Error(msg + (errors.length ? '\nJS-Fehler: ' + errors.join('\n') : '')); };

async function run(viewport, label, strategy = 'hint') {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(`[${label}] console: ${m.text()}`); });
  await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  const mode = () => page.evaluate(() => window.__fiq.mode);
  const waitMode = async (m, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { if (errors.length) fail('Abbruch'); if ((await mode()) === m) return; await page.waitForTimeout(80); } fail(`[${label}] Zeitüberschreitung: warte auf ${m}, ist ${await mode()}`); };
  const tap = async (x, y) => {
    const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width]; });
    const s = b[2] / 40.4; await page.mouse.click(b[0] + (x + 2.2) * s, b[1] + (y + 1.6) * s);
  };
  const followHint = async () => {
    const plan = await page.evaluate(() => { const S = window.__fiq.S; const c = window.__fiq.ctx; const k = FIQ.recommend(S, c.actions); return { k, h: FIQ.hint(S, k), label: FIQ.ACTIONS[k].label }; });
    await page.click('#actions .hint');
    if (plan.h.ids) { const p = await page.evaluate((id) => { const q = FIQ.P(window.__fiq.S, id); return [q.x, q.y]; }, plan.h.ids[0]); await tap(...p); await page.waitForTimeout(120); }
    if (plan.h.point) await tap(plan.h.point.x, plan.h.point.y);
    if (plan.h.goal != null) await tap(36, plan.h.goal === 0 ? 6 : 18);
    if (process.env.DEBUG) console.log('   hint', JSON.stringify(plan), await page.evaluate(() => JSON.stringify({ mode: window.__fiq.mode })));
  };

  // Ein Kind, das bewusst ungünstig entscheidet: zugestellter Mitspieler, verteidigtes Tor, falscher Verteidiger, falscher Ort
  const badChoice = async () => {
    const plan = await page.evaluate(() => {
      const S = window.__fiq.S, c = FIQ.carrier(S), ctx = window.__fiq.ctx, k = ctx.actions[0];
      const blues = FIQ.team(S, 'blue'), reds = FIQ.team(S, 'red');
      if (k === 'passen') { const o = FIQ.passOptions(S).sort((a, b) => a.margin - b.margin)[0]; const p = FIQ.P(S, o.id); return { k, taps: [[p.x, p.y]] }; }
      if (k === 'schiessen') { const o = FIQ.shotOptions(S).sort((a, b) => a.margin - b.margin)[0]; return { k, taps: [[36, o.goal === 0 ? 6 : 18]] }; }
      if (k === 'freilaufen') { const r = blues.find((b) => b !== c); const near = reds.sort((a, b) => FIQ.dist(a, r) - FIQ.dist(b, r))[0]; return { k, taps: [[r.x, r.y], [near.x + 0.4, near.y + 1.6]] }; }
      if (k === 'erobern') { const far = blues.sort((a, b) => FIQ.dist(b, c) - FIQ.dist(a, c))[0]; return { k, taps: [[far.x, far.y]] }; }
      if (k === 'raum') { const b = blues[0]; return { k, taps: [[b.x, b.y], [33, 21]] }; }
      return { k, taps: [[c.x + 3, c.y]] };
    });
    const label = await page.evaluate((k) => FIQ.ACTIONS[k].label, plan.k);
    if (!(await page.locator('#actions .act.on').count())) await page.locator('#actions .act', { hasText: label }).click();
    for (const t of plan.taps) { await tap(...t); await page.waitForTimeout(150); }
  };

  await page.click('#play');
  // 1) Schau-Schritt: erst falsch (Blau 3), dann richtig (Blau 2)
  await waitMode('look'); await tap(19, 19.5); await page.waitForTimeout(200); await tap(24, 6);
  await waitMode('decide');
  // 2) Pass auf zugestellten Spieler -> Rückmeldung mit Erklärung
  await page.locator('#actions .act', { hasText: 'Passen' }).click(); await tap(19, 19.5);
  await waitMode('feedback');
  if (!(await page.isVisible('#fbRec')) || !(await page.isVisible('#fbExe'))) fail('Bewertungs-Chips fehlen');
  // 3) Anders probieren + Vergleichen
  await page.click('#fbRetry'); await waitMode('decide');
  await page.locator('#actions .act', { hasText: 'Passen' }).click(); await tap(24, 6);
  await waitMode('feedback');
  if (!(await page.isVisible('#fbCompare'))) fail('Vergleichen-Knopf fehlt');
  await page.click('#fbCompare'); await waitMode('replay'); await page.click('#skip'); await waitMode('feedback');
  // 4) Rest der Mission mit der Hilfe durchspielen
  const types = [];
  await page.click('#fbNext');
  for (let i = 0; i < 12; i++) {
    let m = await mode();
    for (let w = 0; w < 60 && !['decide', 'look', 'end'].includes(m); w++) { await page.waitForTimeout(100); m = await mode(); }
    if (m === 'end') break;
    if (m === 'look') {
      if (strategy === 'bad') { await page.click('#lookNone'); await page.waitForTimeout(150); if ((await mode()) === 'look' && (await page.isEnabled('#lookNone'))) await page.click('#lookNone'); }
      else { const id = await page.evaluate(() => { const S = window.__fiq.S; const o = FIQ.passOptions(S).sort((a, b) => b.margin - a.margin)[0]; return o.id; }); const p = await page.evaluate((id) => { const q = FIQ.P(window.__fiq.S, id); return [q.x, q.y]; }, id); await tap(...p); }
      await waitMode('decide');
    }
    types.push(await page.evaluate(() => window.__fiq.S.poss));
    if (strategy === 'bad') await badChoice(); else await followHint();
    await waitMode('feedback');
    await page.click('#fbNext');
  }
  await waitMode('end');
  if (!types.includes('red')) fail(`[${label}] Mission enthielt keine Verteidigung`);
  const stars = await page.$$eval('#stars span.on', (x) => x.length);
  if (strategy === 'bad' && stars > 2) fail(`[${label}] ungünstige Entscheidungen bekamen ${stars} Sterne`);
  await page.click('#hl'); await waitMode('replay'); await page.click('#skip'); await waitMode('end');
  await browser.close();
  console.log(`✓ ${label}: Mission vollständig (${types.length + 1} Entscheidungen, Verteidigung enthalten)`);
}

const browsers = [];
try {
  await run({ width: 1024, height: 700 }, 'Tablet quer');
  await run({ width: 844, height: 390 }, 'Handy quer');
  await run({ width: 1024, height: 700 }, 'Ungünstige Entscheidungen', 'bad');
  await run({ width: 390, height: 844 }, 'Handy hochkant', 'bad');
  if (errors.length) fail('JS-Fehler aufgetreten');
  console.log('✓ keine JavaScript-Fehler');
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally { server.close(); process.exit(process.exitCode || 0); }
