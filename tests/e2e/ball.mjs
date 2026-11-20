// V0.6.2 Ball-Grafik im Browser (Touch, iPad quer/hoch, Handy quer/hoch, alle 3 Missionen):
//  - gezeichneter Ball ist ein schwarz-weißer Fußball (dunkle und helle Pixel im Ballkreis), mindestens 7 CSS-Pixel Radius,
//  - ruhender Ball liegt vorn am Fuß des Ballführenden und verdeckt dessen Mitte (Nummer) nicht,
//  - die Simulation bleibt unverändert: Spielzustand-Ball unberührt vom Zeichnen, nur die Darstellung ist versetzt,
//  - Dribbling, Pass und Schuss laufen ohne JS-Fehler, der Ball wird in jedem Bild gezeichnet.
//   node tests/e2e/ball.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fail = (m) => { throw new Error(m); };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
const GERAETE = [
  { n: 'iPad quer', viewport: { width: 1180, height: 820 }, dsf: 2 },
  { n: 'iPad hoch', viewport: { width: 820, height: 1180 }, dsf: 2 },
  { n: 'Handy quer', viewport: { width: 844, height: 390 }, dsf: 3 },
  { n: 'Handy hoch', viewport: { width: 390, height: 844 }, dsf: 3 },
];

async function open(g) {
  const ctx = await browser.newContext({ viewport: g.viewport, hasTouch: true, isMobile: true, deviceScaleFactor: g.dsf });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { const f = { speaking: false, pending: false, paused: false, speak(u) { setTimeout(() => u.onend && u.onend({}), 200); }, cancel() {}, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} }; Object.defineProperty(window, 'speechSynthesis', { value: f, configurable: true }); });
  await page.goto(base + 'index.html');
  const H = {
    page, errors,
    mode: () => page.evaluate(() => window.__fiq.mode),
    async wait(m, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); const x = await H.mode(); if ([].concat(m).includes(x)) return x; await page.waitForTimeout(20); } fail(`Modus ${m} nicht erreicht (${await H.mode()})`); },
    async tap(sel) { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); },
    async field(x, y) { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, window.__fiq.view]; }); const k = b[2] / b[3].w; await page.touchscreen.tap(b[0] + (x - b[3].x0) * k, b[1] + (y - b[3].y0) * k); },
    async start(mission, durchlauf) { if (durchlauf) await page.evaluate(([m, d]) => { FIQ.mission(m).durchlaeufe.unshift(d); }, [mission, durchlauf]); await H.tap(`#missionList .mcard[data-id="${mission}"]`); await H.tap('#play'); return H.wait(['decide', 'look']); },
    close: () => ctx.close(),
  };
  return H;
}

/** Ball im aktuellen Bild prüfen: Muster (dunkle + helle Pixel), Größe, Lage zum Ballführenden, Simulation unverändert */
async function pruefeBall(H, wo, { ruhend }) {
  const simVorher = ruhend ? await H.page.evaluate(() => ({ x: window.__fiq.S.ball.x, y: window.__fiq.S.ball.y })) : null;
  await H.page.waitForTimeout(120);
  const r = await H.page.evaluate(() => {
    const b = window.__fiq.ball, S = window.__fiq.S, v = window.__fiq.view, cv = document.getElementById('field');
    if (!b) return null;
    const rect = cv.getBoundingClientRect(), k = cv.width / rect.width, sc = rect.width / v.w;
    const cx = (b.x - v.x0) * sc * k, cy = (b.y - v.y0) * sc * k, rr = b.rCss * k * 0.8;
    const d = cv.getContext('2d').getImageData(Math.round(cx - rr), Math.round(cy - rr), Math.round(rr * 2), Math.round(rr * 2)).data;
    let dunkel = 0, hell = 0, n = 0;
    const w = Math.round(rr * 2);
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % w - rr, py = Math.floor(i / 4 / w) - rr; if (px * px + py * py > rr * rr) continue;
      const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; n++;
      if (l < 70) dunkel++; else if (l > 200 && Math.abs(d[i] - d[i + 1]) < 30 && Math.abs(d[i + 1] - d[i + 2]) < 30) hell++;
    }
    const o = S.ball.owner && S.players.find((p) => p.id === S.ball.owner);
    return { b, dunkel: dunkel / n, hell: hell / n, o: o ? { x: o.x, y: o.y } : null, sim: { x: S.ball.x, y: S.ball.y } };
  });
  if (!r) fail(wo + ': Ball nicht gezeichnet');
  r.simVorher = simVorher;
  if (r.b.rCss < 7) fail(`${wo}: Ball zu klein (${r.b.rCss.toFixed(1)} CSS-Pixel)`);
  if (r.dunkel < 0.12 || r.dunkel > 0.65) fail(`${wo}: Muster nicht erkennbar (dunkel ${(r.dunkel * 100).toFixed(0)} %)`);
  if (r.hell < 0.2) fail(`${wo}: Ball nicht weiß genug (hell ${(r.hell * 100).toFixed(0)} %)`);
  if (ruhend) {
    if (!r.o) fail(wo + ': kein Ballführender');
    if (r.sim.x !== r.simVorher.x || r.sim.y !== r.simVorher.y) fail(wo + ': Simulation verändert ' + JSON.stringify(r));
    const abst = Math.hypot(r.b.x - r.o.x, r.b.y - r.o.y);
    if (abst < 0.95) fail(`${wo}: Ball verdeckt die Spielermitte (Abstand ${abst.toFixed(2)} m)`);
  }
  return r;
}

let exit = 0;
try {
  for (const g of GERAETE) {
    // Mission 1 (Schau-Schritt), Freie Bahn (enges Dribbling L4e), Welches Tor ist frei? (Dribbling → Schuss)
    {
      const H = await open(g); await H.start('mission-1');
      const r = await pruefeBall(H, `${g.n} Mission 1`, { ruhend: true });
      await H.close();
      console.log(`✓ ${g.n} Mission 1: Ball ${r.b.rCss.toFixed(1)} px, dunkel ${(r.dunkel * 100).toFixed(0)} %, hell ${(r.hell * 100).toFixed(0)} %, vorn am Fuß`);
    }
    {
      const H = await open(g); await H.start('freie-bahn', ['L4e', 'L4b']);
      await pruefeBall(H, `${g.n} Freie Bahn L4e`, { ruhend: true });
      await H.field(27, 12); await H.wait('anim');
      for (let i = 0; i < 4 && (await H.mode()) === 'anim'; i++) await pruefeBall(H, `${g.n} Freie Bahn Dribbling`, { ruhend: false });
      await H.wait(['folge', 'kurz', 'feedback']);
      await H.close();
      console.log(`✓ ${g.n} Freie Bahn: Ball im engen Dribbling sichtbar`);
    }
    {
      const H = await open(g); await H.start('welches-tor-ist-frei', ['W1', 'A1']);
      await H.tap('#actions .act:not(.hint) >> text=Dribbeln'); await H.field(31, 15); await H.wait('feedback');
      await H.page.waitForTimeout(500); await H.tap('#fbNext'); await H.wait('decide');
      await pruefeBall(H, `${g.n} W1 vor dem Schuss`, { ruhend: true });
      await H.tap('#actions .act:not(.hint) >> text=Schießen'); await H.field(36, 6); await H.wait('anim');
      for (let i = 0; i < 3 && (await H.mode()) === 'anim'; i++) await pruefeBall(H, `${g.n} W1 Schuss`, { ruhend: false });
      await H.wait(['folge', 'kurz', 'feedback', 'wechsel', 'decide']);
      await H.close();
      console.log(`✓ ${g.n} Welches Tor ist frei?: Ball bei Dribbling und Schuss sichtbar`);
    }
  }
} catch (e) { console.error('✗ ' + e.message); exit = 1; }
await browser.close(); server.close();
process.exit(exit);
