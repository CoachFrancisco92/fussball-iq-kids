// V0.6.2 Ball-Grafik: Sichtprüfung in allen 3 Missionen (iPad quer, Handy quer) – Standbild, enge Lagen
// und Einzelbilder während Dribbling, Pass und Schuss. Nur zur Sichtprüfung, kein Test.
// Aufruf: node tests/analysis/v0.6/ball-bilder.mjs <ausgabeordner>
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const out = process.argv[2] || '/tmp/ball'; fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});

async function lauf(vp, mission, durchlauf, aktion, name, vorher) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true, deviceScaleFactor: vp.dsf });
  const page = await ctx.newPage();
  await page.addInitScript(() => { const f = { speaking: false, pending: false, paused: false, speak(u) { setTimeout(() => u.onend && u.onend({}), 300); }, cancel() {}, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} }; Object.defineProperty(window, 'speechSynthesis', { value: f, configurable: true }); });
  await page.goto(base + 'index.html');
  if (durchlauf) await page.evaluate(([m, d]) => { FIQ.mission(m).durchlaeufe.unshift(d); }, [mission, durchlauf]);
  const mode = () => page.evaluate(() => window.__fiq.mode);
  const wait = async (m) => { for (let i = 0; i < 800; i++) { if ([].concat(m).includes(await mode())) return; await page.waitForTimeout(25); } throw new Error(name + ': ' + (await mode())); };
  const tap = async (sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded(); const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const feldPx = (x, y) => page.$eval('#field', (e, [x, y]) => { const r = e.getBoundingClientRect(), v = window.__fiq.view, k = r.width / v.w; return [r.left + (x - v.x0) * k, r.top + (y - v.y0) * k, k]; }, [x, y]);
  const field = async (x, y) => { const [px, py] = await feldPx(x, y); await page.touchscreen.tap(px, py); };
  const ballFoto = async (datei) => {
    const b = await page.evaluate(() => { const S = window.__fiq.S; return FIQ.ballPos ? FIQ.ballPos(S) : null; }).catch(() => null);
    await page.screenshot({ path: path.join(out, datei + '.png') });
    return b;
  };
  await tap(`#missionList .mcard[data-id="${mission}"]`); await tap('#play');
  await wait(['decide', 'look']);
  if ((await mode()) === 'look') { await page.waitForTimeout(300); await ballFoto(`${vp.n}-${name}-look`); }
  if (!aktion) { await ctx.close(); return; }
  if (vorher) { await tap(`#actions .act:not(.hint) >> text=${vorher.lbl}`); await field(...vorher.ziel); await wait('feedback'); await tap('#fbNext'); await wait('decide'); }
  await page.waitForTimeout(200);
  await ballFoto(`${vp.n}-${name}-0-start`);
  if (aktion) {
    const lbl = { dribble: 'Dribbeln', pass: 'Passen', shoot: 'Schießen' }[aktion.typ] || 'Passen';
    { const l = page.locator(`#actions .act:not(.hint) >> text=${lbl}`); if (await l.count()) await tap(`#actions .act:not(.hint) >> text=${lbl}`); }
    const ziel = aktion.ziel || (await page.evaluate(() => { const q = FIQ.P(window.__fiq.S, 'b2'); return [q.x, q.y]; }));
    await field(...ziel);
    for (let i = 1; i <= 6; i++) { await page.waitForTimeout(110); await ballFoto(`${vp.n}-${name}-${i}-${aktion.typ}`); }
  }
  await ctx.close();
}
const vps = [{ n: 'ipad', width: 1180, height: 820, dsf: 2 }, { n: 'handy', width: 844, height: 390, dsf: 3 }, { n: 'handyhoch', width: 390, height: 844, dsf: 3 }];
for (const vp of vps) {
  await lauf(vp, 'mission-1', null, null, 'm1');
  await lauf(vp, 'freie-bahn', ['L4e', 'L4b'], { typ: 'dribble', ziel: [27, 12] }, 'fb-L4e-eng');
  await lauf(vp, 'freie-bahn', ['V1', 'B3'], { typ: 'dribble', ziel: [26, 8.2] }, 'fb-V1');
  await lauf(vp, 'welches-tor-ist-frei', ['W1', 'A1'], { typ: 'shoot', ziel: [36, 18] }, 'wt-W1-schuss', { lbl: 'Dribbeln', ziel: [31, 15] });
  await lauf(vp, 'welches-tor-ist-frei', ['A1', 'W1'], { typ: 'pass', ziel: null }, 'wt-A1').catch((e) => console.log('A1 pass übersprungen', e.message));
}
await browser.close(); server.close();
console.log('Bilder in', out);
